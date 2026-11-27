"""The inventory read from the device and entity registries."""

import inspect

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.homelab_panel.discovery import async_inventory

# Recent Home Assistant takes the parent's id (via_device_id), older releases its identifier (via_device)
VIA_ID = "via_device_id" in inspect.signature(dr.DeviceRegistry.async_get_or_create).parameters


def _entry(hass: HomeAssistant, domain: str) -> MockConfigEntry:
    entry = MockConfigEntry(domain=domain, title=domain, data={})
    entry.add_to_hass(hass)
    return entry


def _device(hass, entry, key, name, model, via: dr.DeviceEntry | None = None) -> dr.DeviceEntry:
    parent = {}
    if via is not None:
        parent = {"via_device_id": via.id} if VIA_ID else {"via_device": next(iter(via.identifiers))}
    return dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={(entry.domain, key)}, name=name, model=model, **parent
    )


def _entity(hass, entry, domain, unique_id, device=None, key=None) -> str:
    return (
        er.async_get(hass)
        .async_get_or_create(
            domain,
            entry.domain,
            unique_id,
            config_entry=entry,
            device_id=device.id if device else None,
            translation_key=key,
            suggested_object_id=unique_id,
        )
        .entity_id
    )


def _by_name(inv):
    return {item.name: item for item in inv.items}


async def test_empty(hass: HomeAssistant):
    inv = async_inventory(hass)
    assert inv.configured is False
    assert inv.items == []
    assert inv.as_dict()["sources"]["proxmox"]["entries"] == 0


async def test_proxmox_host_and_guests(hass: HomeAssistant):
    entry = _entry(hass, "proxmoxve")
    node = _device(hass, entry, "node_pve", "pve-1", "Node")
    vm = _device(hass, entry, "qemu_101", "web", "QEMU", via=node)
    lxc = _device(hass, entry, "lxc_201", "dns", "LXC", via=node)
    cpu = _entity(hass, entry, "sensor", "pve_cpu_usage", node, "cpu_usage")
    status = _entity(hass, entry, "binary_sensor", "pve_status", node, "status")
    start = _entity(hass, entry, "button", "web_start", vm, "start")
    reboot = _entity(hass, entry, "button", "web_reboot", vm, "reboot")
    _entity(hass, entry, "sensor", "dns_cpu", lxc, "cpu")
    extra = _entry(hass, "proxmox_sensors")
    sensors = _device(hass, extra, "pve-1", "pve-1", "Node")
    temp = _entity(hass, extra, "sensor", "pve1_cpu_temperature", sensors, "temperature")

    inv = async_inventory(hass, ["proxmox"])
    items = _by_name(inv)
    assert inv.configured is True
    assert items["pve-1"].kind == "host"
    # Proxmox Extended Sensors joined the host of the same name
    assert items["pve-1"].entities == {"status": status, "cpu": cpu, "temperature": temp}
    assert len([i for i in inv.items if i.name == "pve-1"]) == 1
    assert items["web"].kind == "guest_vm"
    assert items["web"].parent == node.id
    assert items["web"].entities == {"start": start, "restart": reboot}
    assert items["dns"].kind == "guest_lxc"
    assert inv.sources["proxmox"].entities == 6


async def test_nas_with_disks_and_volumes(hass: HomeAssistant):
    entry = _entry(hass, "synology_dsm")
    nas = _device(hass, entry, "nas", "nas-main", "DS923+")
    disk = _device(hass, entry, "nas_disk1", "Drive 1", "WD Red", via=nas)
    volume = _device(hass, entry, "nas_volume1", "Volume 1", "Volume", via=nas)
    temp = _entity(hass, entry, "sensor", "nas_temperature", nas, "temperature")
    disk_temp = _entity(hass, entry, "sensor", "disk1_disk_temp", disk, "disk_temp")
    disk_status = _entity(hass, entry, "sensor", "disk1_disk_smart_status", disk, "disk_smart_status")
    used = _entity(hass, entry, "sensor", "volume1_volume_percentage_used", volume, "volume_percentage_used")

    items = _by_name(async_inventory(hass, ["nas"]))
    assert items["nas-main"].kind == "nas"
    assert items["nas-main"].model == "DS923+"
    assert items["nas-main"].entities["temperature"] == temp
    assert items["Drive 1"].kind == "disk"
    assert items["Drive 1"].parent == nas.id
    assert items["Drive 1"].entities == {"status": disk_status, "temperature": disk_temp}
    assert items["Volume 1"].kind == "volume"
    assert items["Volume 1"].entities["used_pct"] == used


async def test_docker(hass: HomeAssistant):
    entry = _entry(hass, "portainer")
    host = _device(hass, entry, "env1", "local", "Environment")
    box = _device(hass, entry, "ctr_nginx", "nginx", "Container", via=host)
    running = _entity(hass, entry, "sensor", "env1_containers_running", host, "containers_running")
    switch = _entity(hass, entry, "switch", "nginx_container", box, "container")
    items = _by_name(async_inventory(hass, ["docker"]))
    assert items["local"].kind == "docker_host"
    assert items["local"].entities["running"] == running
    assert items["nginx"].kind == "container"
    assert items["nginx"].entities["switch"] == switch


async def test_ups_services_and_certificates(hass: HomeAssistant):
    nut = _entry(hass, "nut")
    ups = _device(hass, nut, "ups1", "Office UPS", "Back-UPS")
    charge = _entity(hass, nut, "sensor", "ups1_battery_charge", ups, "battery_charge")
    load = _entity(hass, nut, "sensor", "ups1_load", ups, "load")
    kuma = _entry(hass, "uptime_kuma")
    monitor = _device(hass, kuma, "m1", "Website", None)
    status = _entity(hass, kuma, "sensor", "m1_status", monitor, "status")
    certs = _entry(hass, "cert_expiry")
    expiry = _entity(hass, certs, "sensor", "example_com_443_timestamp", None, "certificate_expiry")
    disabled = er.async_get(hass).async_get_or_create(
        "sensor", "cert_expiry", "old_443", config_entry=certs, disabled_by=er.RegistryEntryDisabler.USER
    )

    inv = async_inventory(hass, ["ups", "services", "certificates"])
    items = _by_name(inv)
    assert items["Office UPS"].kind == "ups"
    assert items["Office UPS"].entities == {"battery": charge, "load": load}
    assert items["Website"].kind == "service"
    assert items["Website"].entities["status"] == status
    certificates = [i for i in inv.items if i.kind == "certificate"]
    assert [c.entities["expiry"] for c in certificates] == [expiry]
    assert disabled.entity_id not in str(inv.as_dict())
    # A source left out is not read
    assert "proxmox" not in inv.sources
