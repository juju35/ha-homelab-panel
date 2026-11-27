"""Sidebar panel and its WebSocket commands.

The panel (``frontend/homelab-panel.js``) has seven tabs: Overview, Hosts, Containers, Storage, Services, Backups
and Settings. It reads the states of the entities of the sources it shows, so it only needs:

- ``homelab_panel/inventory``: the devices of each source, their kind and their entities by role;
- ``homelab_panel/settings`` / ``homelab_panel/update_settings``: the settings (options of the entry).

The panel and its commands are for administrators only.
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import panel_custom, websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import (
    CONF_CERT_DAYS,
    CONF_CONFIRM_ACTIONS,
    CONF_DISK_TEMP,
    CONF_SHOW_STOPPED,
    CONF_SOURCES,
    DEFAULTS,
    DOMAIN,
    INVENTORY_KEY,
    PANEL_ICON,
    PANEL_PATH,
    PANEL_TITLE,
    PANEL_URL,
    SOURCES,
    VERSION,
)
from .discovery import async_inventory


def settings(entry: ConfigEntry | None) -> dict[str, Any]:
    """The settings, defaults filled in, unknown sources dropped (an option no longer offered is left out)."""
    options = entry.options if entry else {}
    current = {key: options.get(key, default) for key, default in DEFAULTS.items()}
    current[CONF_SOURCES] = [s for s in current[CONF_SOURCES] if s in SOURCES]
    return current


def _entry(hass: HomeAssistant) -> ConfigEntry | None:
    entries = hass.config_entries.async_entries(DOMAIN)
    return entries[0] if entries else None


async def async_register_panel(hass: HomeAssistant) -> None:
    """Add Homelab to the sidebar, for administrators only."""
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_PATH,
        webcomponent_name="homelab-panel",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=f"{PANEL_URL}?v={VERSION}",
        require_admin=True,
        config={"version": VERSION},
    )


# The last inventory, kept until the device or entity registry changes, an entry of a source changes state or the
# sources shown change
INVENTORY_CACHE = INVENTORY_KEY


def _entries_key(hass: HomeAssistant, sources: list[str]) -> tuple:
    return (
        tuple(sources),
        tuple(
            (entry.entry_id, entry.state.value, entry.title)
            for source in sources
            for domain in SOURCES[source]
            for entry in hass.config_entries.async_entries(domain)
        ),
    )


@callback
def cached_inventory(hass: HomeAssistant) -> dict[str, Any]:
    """The inventory, scanned again only when something it reads may have changed (not on every panel call)."""
    sources = settings(_entry(hass))[CONF_SOURCES]
    key = _entries_key(hass, sources)
    cache = hass.data.get(INVENTORY_CACHE)
    if cache is None or cache[0] != key:
        cache = hass.data[INVENTORY_CACHE] = (key, async_inventory(hass, sources).as_dict())
    return cache[1]


@callback
def async_register_commands(hass: HomeAssistant) -> None:
    """The panel's WebSocket commands, and the inventory dropped when the registries change."""
    for command in (_ws_inventory, _ws_settings, _ws_update_settings):
        websocket_api.async_register_command(hass, command)

    @callback
    def _drop(_: Event) -> None:
        hass.data.pop(INVENTORY_CACHE, None)

    hass.bus.async_listen(dr.EVENT_DEVICE_REGISTRY_UPDATED, _drop)
    hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, _drop)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/inventory"})
@websocket_api.require_admin
@callback
def _ws_inventory(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    connection.send_result(msg["id"], {**cached_inventory(hass), "settings": settings(_entry(hass))})


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/settings"})
@websocket_api.require_admin
@callback
def _ws_settings(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    connection.send_result(msg["id"], {"settings": settings(_entry(hass)), "all_sources": list(SOURCES)})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/update_settings",
        vol.Optional(CONF_SOURCES): [vol.In(list(SOURCES))],
        vol.Optional(CONF_CONFIRM_ACTIONS): bool,
        vol.Optional(CONF_SHOW_STOPPED): bool,
        vol.Optional(CONF_CERT_DAYS): vol.All(int, vol.Range(min=1, max=90)),
        vol.Optional(CONF_DISK_TEMP): vol.All(int, vol.Range(min=30, max=80)),
    }
)
@websocket_api.require_admin
@callback
def _ws_update_settings(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if (entry := _entry(hass)) is None:
        connection.send_result(msg["id"], {"ok": False, "error": "not_found"})
        return
    current = settings(entry)
    updated = {**current, **{key: msg[key] for key in DEFAULTS if key in msg}}
    if CONF_SOURCES in msg:
        updated[CONF_SOURCES] = [s for s in SOURCES if s in msg[CONF_SOURCES]]
    if updated != current:
        hass.config_entries.async_update_entry(entry, options=updated)
        hass.data.pop(INVENTORY_CACHE, None)
    connection.send_result(msg["id"], {"ok": True, "settings": updated})
