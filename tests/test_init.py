"""Setup, the sidebar panel and the WebSocket commands."""

from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.homelab_panel.const import (
    DEFAULTS,
    DOMAIN,
    I18N_URL,
    INVENTORY_KEY,
    PANEL_ICON,
    PANEL_PATH,
    PANEL_URL,
    SOURCES,
    VERSION,
)


async def _setup(hass: HomeAssistant, options=None) -> MockConfigEntry:
    assert await async_setup_component(hass, "http", {})
    entry = MockConfigEntry(domain=DOMAIN, title="Homelab Panel", data={}, options=options or dict(DEFAULTS))
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_config_flow_single_entry(hass: HomeAssistant):
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] == "form"
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {"sources": ["nas", "proxmox"]})
    assert result["type"] == "create_entry"
    # Sources kept in their own order
    assert result["options"] == {**DEFAULTS, "sources": ["proxmox", "nas"]}
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": "user"})
    assert result["type"] == "abort"
    assert result["reason"] == "single_instance_allowed"


async def test_options_flow(hass: HomeAssistant):
    entry = await _setup(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] == "form"
    result = await hass.config_entries.options.async_configure(result["flow_id"], {"sources": ["ups"]})
    assert result["type"] == "create_entry"
    await hass.async_block_till_done()
    assert entry.options["sources"] == ["ups"]
    assert entry.options["cert_warning_days"] == DEFAULTS["cert_warning_days"]


async def test_panel(hass: HomeAssistant, hass_client):
    entry = await _setup(hass)
    panel = hass.data["frontend_panels"][PANEL_PATH]
    assert panel.sidebar_icon == PANEL_ICON
    assert panel.sidebar_title == "Homelab"
    assert panel.require_admin is True
    assert panel.config["_panel_custom"]["module_url"] == f"{PANEL_URL}?v={VERSION}"
    client = await hass_client()
    resp = await client.get(PANEL_URL)
    assert resp.status == 200
    assert f'HOMELAB_PANEL_VERSION = "{VERSION}"' in await resp.text()
    resp = await client.get(f"{I18N_URL}/fr.json")
    assert resp.status == 200
    assert (await resp.json())["tab_hosts"] == "Hôtes"
    await hass.config_entries.async_unload(entry.entry_id)
    assert PANEL_PATH not in hass.data["frontend_panels"]


async def test_inventory_command(hass: HomeAssistant, hass_ws_client):
    await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": f"{DOMAIN}/inventory"})
    res = await client.receive_json()
    assert res["success"]
    assert res["result"]["configured"] is False
    assert res["result"]["items"] == []
    assert set(res["result"]["sources"]) == set(SOURCES)
    assert res["result"]["settings"] == DEFAULTS
    assert INVENTORY_KEY in hass.data


async def test_administrators_only(hass: HomeAssistant, hass_ws_client, hass_admin_user):
    await _setup(hass)
    hass_admin_user.groups = []  # no longer an administrator
    client = await hass_ws_client(hass)
    for command in ("inventory", "settings", "update_settings"):
        await client.send_json_auto_id({"type": f"{DOMAIN}/{command}"})
        res = await client.receive_json()
        assert not res["success"] and res["error"]["code"] == "unauthorized", command


async def test_update_settings(hass: HomeAssistant, hass_ws_client):
    entry = await _setup(hass)
    client = await hass_ws_client(hass)
    await client.send_json_auto_id({"type": f"{DOMAIN}/inventory"})
    await client.receive_json()
    await client.send_json_auto_id(
        {"type": f"{DOMAIN}/update_settings", "show_stopped": False, "sources": ["docker", "proxmox"]}
    )
    res = await client.receive_json()
    assert res["success"] and res["result"]["ok"]
    await hass.async_block_till_done()
    expected = {**DEFAULTS, "show_stopped": False, "sources": ["proxmox", "docker"]}
    assert dict(entry.options) == expected
    assert INVENTORY_KEY not in hass.data

    await client.send_json_auto_id({"type": f"{DOMAIN}/settings"})
    res = await client.receive_json()
    assert res["result"]["settings"] == expected
    assert res["result"]["all_sources"] == list(SOURCES)

    for bad in (
        {"sources": ["unknown"]},
        {"cert_warning_days": 0},
        {"disk_warning_temperature": 99},
        {"admin_only": False},
    ):
        await client.send_json_auto_id({"type": f"{DOMAIN}/update_settings", **bad})
        res = await client.receive_json()
        assert not res["success"], bad
