"""What the panel shows, read from the device and entity registries.

The panel reads states itself; this module only says which entity is which. For each source (const.SOURCES) it
gathers the entities of the source's integrations by device, gives the device a kind (a Proxmox host, a virtual
machine, a Docker container, a NAS, one of its disks, a UPS, a monitored service…) and each entity a role (its CPU,
its temperature, its battery…), from the entity's translation key, unique id and entity id. Nothing is polled: the
inventory is rebuilt only when a registry changes (panel.py keeps it until then).
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import asdict, dataclass, field
from typing import Any

from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import SOURCES


@dataclass
class Item:
    """A device the panel shows: its kind, its entities by role, the device it hangs from."""

    id: str
    kind: str
    source: str
    platform: str
    name: str
    model: str = ""
    manufacturer: str = ""
    parent: str | None = None
    url: str | None = None
    entities: dict[str, str] = field(default_factory=dict)


@dataclass
class SourceInfo:
    """Whether a source's integrations are set up, and loaded."""

    platforms: list[str] = field(default_factory=list)
    entries: int = 0
    loaded: int = 0
    entities: int = 0


@dataclass
class Inventory:
    """Every item, by source, and the state of each source."""

    sources: dict[str, SourceInfo] = field(default_factory=dict)
    items: list[Item] = field(default_factory=list)

    @property
    def configured(self) -> bool:
        return any(info.entities for info in self.sources.values())

    def as_dict(self) -> dict[str, Any]:
        return {
            "configured": self.configured,
            "sources": {key: asdict(info) for key, info in self.sources.items()},
            "items": [asdict(item) for item in self.items],
        }


# Roles: the first rule whose pattern matches the entity's key (translation key, unique id and object id joined),
# for one of its domains, gives the role. Patterns are searched, lower case.
Rule = tuple[str, tuple[str, ...], str]
ROLES: dict[str, list[Rule]] = {
    "host": [
        ("status", ("binary_sensor", "sensor"), r"(^|[_ ])status($|[_ ])|node_status|online"),
        ("temperature", ("sensor",), r"temperature|(^|[_ ])temp($|[_ ])"),
        ("cpu", ("sensor",), r"cpu_(usage|used|percent)|cpu_use|(^|[_ ])cpu($|[_ ])"),
        ("ram", ("sensor",), r"memory_(usage_)?percent|mem(ory)?_used_percent|ram_percent"),
        ("disk", ("sensor",), r"disk_(usage_)?percent|disk_used_percent|rootfs_percent"),
        ("uptime", ("sensor",), r"uptime|last_boot"),
        ("last_backup", ("sensor",), r"last_backup"),
        ("update", ("update",), r".*"),
    ],
    "guest": [
        ("status", ("binary_sensor", "sensor"), r"(^|[_ ])status($|[_ ])|(^|[_ ])health"),
        ("cpu", ("sensor",), r"cpu"),
        ("ram", ("sensor",), r"memory_(usage_)?percent|mem(ory)?_used_percent"),
        ("ram_used", ("sensor",), r"memory_usage$|memory_used$|(^|[_ ])memory($|[_ ])"),
        ("ram_max", ("sensor",), r"max_memory"),
        ("start", ("button",), r"(^|[_ ])start($|[_ ])"),
        ("restart", ("button",), r"restart|reboot"),
        ("stop", ("button",), r"(^|[_ ])stop($|[_ ])|shut_?down"),
    ],
    "container": [
        ("switch", ("switch",), r".*"),
        ("status", ("sensor", "binary_sensor"), r"state|status|(^|[_ ])running"),
        ("cpu", ("sensor",), r"cpu"),
        ("ram", ("sensor",), r"memory|(^|[_ ])mem($|[_ ])|ram"),
        ("image", ("sensor",), r"image|version"),
        ("update", ("update", "binary_sensor"), r"update"),
        ("restart", ("button",), r"restart"),
        ("start", ("button",), r"(^|[_ ])start($|[_ ])"),
    ],
    "docker_host": [
        ("running", ("sensor",), r"containers?_running|running"),
        ("stopped", ("sensor",), r"containers?_(stopped|exited)|stopped|exited"),
        ("total", ("sensor",), r"containers?(_total)?$|containers?_count"),
        ("version", ("sensor",), r"version"),
        ("cpu", ("sensor",), r"cpu"),
        ("ram", ("sensor",), r"memory|ram"),
    ],
    "nas": [
        ("status", ("sensor", "binary_sensor"), r"(^|[_ ])status($|[_ ])|health|security"),
        ("volume", ("sensor",), r"(volume|storage|pool).*(percent|usage|used)|(percent|usage)_(volume|storage|pool)"),
        ("volume_used", ("sensor",), r"(volume|storage|pool).*(size_used|used_size|used$)"),
        ("volume_total", ("sensor",), r"(volume|storage|pool).*(size_total|total_size|total$|capacity)"),
        ("temperature", ("sensor",), r"temperature|(^|[_ ])temp($|[_ ])"),
        ("cpu", ("sensor",), r"cpu"),
        ("ram", ("sensor",), r"memory|ram"),
        ("uptime", ("sensor",), r"uptime|last_boot"),
        ("update", ("update", "binary_sensor"), r"update"),
    ],
    "disk": [
        ("status", ("sensor", "binary_sensor"), r"status|smart|health|exceeded|below_remain"),
        ("temperature", ("sensor",), r"temperature|(^|[_ ])temp($|[_ ])"),
        ("size", ("sensor",), r"size|capacity"),
    ],
    "volume": [
        ("used_pct", ("sensor",), r"percent|usage"),
        ("used", ("sensor",), r"size_used|used"),
        ("total", ("sensor",), r"size_total|total|capacity"),
        ("status", ("sensor", "binary_sensor"), r"status"),
    ],
    "ups": [
        ("status", ("sensor",), r"ups_status_display|status_data|(^|[_ ])status($|[_ ])"),
        ("battery", ("sensor",), r"battery_charge|bcharge|(^|[_ ])battery($|[_ ])"),
        ("runtime", ("sensor",), r"battery_runtime|timeleft|runtime"),
        ("load", ("sensor",), r"(^|[_ ])load|loadpct"),
        ("power", ("sensor",), r"realpower|(^|[_ ])power($|[_ ])|nompower"),
    ],
    "service": [
        ("status", ("binary_sensor", "sensor"), r"(^|[_ ])status($|[_ ])|(^|[_ ])up($|[_ ])|monitor_status"),
        ("response", ("sensor",), r"response"),
        ("uptime", ("sensor",), r"uptime|availability"),
        ("cert_days", ("sensor",), r"cert(ificate)?_days|days_remaining"),
        ("url", ("sensor",), r"url|hostname"),
    ],
    "proxy": [
        ("hosts", ("sensor",), r"hosts|proxies|routes|rules"),
        ("requests", ("sensor",), r"request"),
        ("status", ("binary_sensor", "sensor"), r"status|online|running"),
        ("version", ("sensor", "update"), r"version|update"),
    ],
    "backup": [
        ("last", ("sensor",), r"last_successful|last_backup|last_automatic"),
        ("last_attempt", ("sensor",), r"last_attempted"),
        ("next", ("sensor",), r"next_scheduled|next_backup"),
        ("state", ("sensor",), r"manager_state|(^|[_ ])state($|[_ ])"),
    ],
    "certificate": [
        ("expiry", ("sensor",), r"timestamp|expir|cert"),
    ],
}

# Kinds of the Proxmox VE devices, from their model (Node, QEMU, LXC, Storage) or identifier.
PROXMOX_KINDS = (
    ("guest_lxc", r"lxc|container"),
    ("guest_vm", r"qemu|virtual machine|(^|[_ ])vm($|[_ ])"),
    ("storage", r"storage"),
    ("host", r"node|host|server"),
)


def _key(entry: er.RegistryEntry) -> str:
    parts = (entry.translation_key, entry.unique_id, entry.entity_id.split(".", 1)[1], entry.original_name)
    return " ".join(str(p) for p in parts if p).lower()


def _roles(kind: str, entries: Iterable[er.RegistryEntry]) -> dict[str, str]:
    """Each entity's role for this kind, the first entity found keeping a role."""
    found: dict[str, str] = {}
    base = "guest" if kind.startswith("guest") else kind
    rules = ROLES.get(base, [])
    for entry in sorted(entries, key=lambda e: e.entity_id):
        domain = entry.entity_id.split(".", 1)[0]
        key = _key(entry)
        for role, domains, pattern in rules:
            if role not in found and domain in domains and re.search(pattern, key):
                found[role] = entry.entity_id
                break
    return found


def _proxmox_kind(device: dr.DeviceEntry) -> str:
    text = " ".join(
        str(x) for x in (device.model, device.name, *(i for ident in device.identifiers for i in ident)) if x
    ).lower()
    for kind, pattern in PROXMOX_KINDS:
        if re.search(pattern, text):
            return kind
    return "host"


# Dockhand and Portainer type their devices by model: the environment (Dockhand) or endpoint (Portainer), its
# containers, and other devices (stacks, schedules, groups…) that are neither and stay out of the panel.
DOCKER_HOST_MODELS = ("environment", "endpoint")
DOCKER_MODEL_PLATFORMS = ("dockhand", "portainer")


def _docker_kind(device: dr.DeviceEntry | None, entries: list[er.RegistryEntry], platform: str) -> str | None:
    """An environment / endpoint / host device, a container, or None for a device that is neither."""
    model = str(device.model or "").strip().lower() if device else ""
    if model in DOCKER_HOST_MODELS:
        return "docker_host"
    if model == "container":
        return "container"
    if platform in DOCKER_MODEL_PLATFORMS and model:
        return None
    text = " ".join(str(x) for x in (device.model, device.name) if x).lower() if device else ""
    if re.search(r"environment|endpoint|host|engine|server", text):
        return "docker_host"
    keys = " ".join(_key(e) for e in entries)
    if re.search(r"containers?_(running|stopped|total|count)", keys) and not any(
        e.entity_id.startswith("switch.") for e in entries
    ):
        return "docker_host"
    return "container"


# NAS models of the supported brands: UGREEN DXP / DH, Synology DS / RS / DVA, QNAP TS / TVS / TBS, ASUSTOR AS and the
# Flashstor / Lockerstor / Drivestor lines.
NAS_MODEL_RE = re.compile(
    r"\b(dxp|dh)\s?\d|\b(ds|rs|dva)\s?\d|\b(ts|tvs|tbs|tss)-?\s?\d|\bas\s?\d|flashstor|lockerstor|drivestor",
    re.IGNORECASE,
)


def _entry_id(dev: dr.DeviceEntry) -> str:
    """The device's config entry: config_entry_id on recent Home Assistant, else its first config entry."""
    if hasattr(type(dev), "config_entry_id"):
        return str(dev.config_entry_id or "")
    return next(iter(dev.config_entries), "")


def _part_kind(device: dr.DeviceEntry) -> str | None:
    """A disk or a volume of a NAS, by its name or model; None for another part (fan, network interface…)."""
    text = " ".join(str(x) for x in (device.model, device.name) if x).lower()
    if re.search(r"volume|pool|storage|raid", text):
        return "volume"
    if re.search(r"disk|drive|hdd|ssd|nvme|m\.2|sata", text):
        return "disk"
    return None


def _nas_kinds(
    by_device: dict[str, list[er.RegistryEntry]], devices: dict[str, dr.DeviceEntry]
) -> dict[str, tuple[str | None, str | None]]:
    """Kind and parent of each NAS device. Per config entry, the NAS is the root device with a NAS model (else the one
    with the most entities); its other devices, children or not (UGREEN and Synology split some parts into devices of
    their own), are its disks and volumes, and any other part is left out."""
    by_entry: dict[str, list[dr.DeviceEntry]] = {}
    for dev in devices.values():
        by_entry.setdefault(_entry_id(dev), []).append(dev)
    out: dict[str, tuple[str | None, str | None]] = {}
    for devs in by_entry.values():
        roots = [d for d in devs if not d.via_device_id or d.via_device_id not in devices]
        nas = [d for d in roots if NAS_MODEL_RE.search(str(d.model or ""))]
        if not nas and roots:
            nas = [max(roots, key=lambda d: len(by_device.get(d.id, [])))]
        for d in devs:
            if d in nas:
                out[d.id] = ("nas", None)
                continue
            parent = d.via_device_id if d.via_device_id in devices else (nas[0].id if len(nas) == 1 else None)
            out[d.id] = (_part_kind(d), parent)
    return out


KIND_OF_SOURCE = {
    "ups": "ups",
    "services": "service",
    "proxy": "proxy",
    "backups": "backup",
    "certificates": "certificate",
}


@callback
def async_inventory(hass: HomeAssistant, sources: Iterable[str] | None = None) -> Inventory:
    """The panel's inventory of the sources asked for (every source by default)."""
    wanted = list(sources) if sources is not None else list(SOURCES)
    ent_reg = er.async_get(hass)
    dev_reg = dr.async_get(hass)
    inv = Inventory()
    for source in wanted:
        platforms = SOURCES.get(source)
        if not platforms:
            continue
        entries = [hass.config_entries.async_entries(p) for p in platforms]
        info = SourceInfo(
            platforms=list(platforms),
            entries=sum(len(e) for e in entries),
            loaded=sum(1 for es in entries for e in es if e.state is ConfigEntryState.LOADED),
        )
        by_device: dict[str, list[er.RegistryEntry]] = {}
        for entry in ent_reg.entities.values():
            if entry.platform not in platforms or entry.disabled_by is not None:
                continue
            # Left over by a removed or replaced integration entry: not a live item
            if entry.config_entry_id and hass.config_entries.async_get_entry(entry.config_entry_id) is None:
                continue
            info.entities += 1
            # An entity without a device (Monitor Docker, Certificate Expiry…) is its own item
            by_device.setdefault(entry.device_id or f"entity:{entry.entity_id}", []).append(entry)
        inv.sources[source] = info
        devices = {d: dev_reg.async_get(d) for d in by_device if not d.startswith("entity:")}
        devices = {k: v for k, v in devices.items() if v is not None}
        # Parents of a source's devices (a NAS whose disks only have entities) are read too
        for dev in list(devices.values()):
            if (
                dev.via_device_id
                and dev.via_device_id not in devices
                and (parent := dev_reg.async_get(dev.via_device_id))
            ):
                devices[parent.id] = parent
                by_device.setdefault(parent.id, [])
        nas_kinds = _nas_kinds(by_device, devices) if source == "nas" else {}
        for dev_id, ents in sorted(by_device.items(), key=lambda kv: kv[0]):
            device = devices.get(dev_id)
            platform = ents[0].platform if ents else ""
            if device is not None and not ents and (entry_id := _entry_id(device)):
                entry = hass.config_entries.async_get_entry(entry_id)
                platform = entry.domain if entry else platform
            parent = device.via_device_id if device and device.via_device_id in devices else None
            if source == "proxmox":
                kind = _proxmox_kind(device) if device else "host"
            elif source == "docker":
                kind = _docker_kind(device, ents, platform)
            elif source == "nas":
                kind, parent = nas_kinds.get(dev_id, ("nas", None))
            else:
                kind = KIND_OF_SOURCE[source]
            if kind is None:
                continue
            name = (
                (device.name_by_user or device.name)
                if device
                else (ents[0].name or ents[0].original_name or ents[0].entity_id)
            )
            inv.items.append(
                Item(
                    id=dev_id,
                    kind=kind,
                    source=source,
                    platform=platform,
                    name=str(name or dev_id),
                    model=str(device.model or "") if device else "",
                    manufacturer=str(device.manufacturer or "") if device else "",
                    parent=parent,
                    url=device.configuration_url if device else None,
                    entities=_roles(kind, ents),
                )
            )
    _merge_proxmox_sensors(inv)
    return inv


def _merge_proxmox_sensors(inv: Inventory) -> None:
    """Proxmox Extended Sensors' node devices join the Proxmox VE host of the same name (temperature, health)."""
    hosts = {i.name.lower(): i for i in inv.items if i.kind == "host" and i.platform != "proxmox_sensors"}
    for item in list(inv.items):
        if item.platform == "proxmox_sensors" and item.kind == "host" and (host := hosts.get(item.name.lower())):
            for role, entity_id in item.entities.items():
                host.entities.setdefault(role, entity_id)
            inv.items.remove(item)
