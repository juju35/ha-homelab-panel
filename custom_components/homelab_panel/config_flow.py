"""Config flow: one entry; the setup picks the sources shown (the Settings tab and the options change them later)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import selector

from .const import CONF_SOURCES, DEFAULTS, DOMAIN, SOURCES


def detected(hass: HomeAssistant) -> list[str]:
    """The sources one of whose integrations is set up (every source when none is: the panel explains what to add)."""
    found = [s for s, domains in SOURCES.items() if any(hass.config_entries.async_entries(d) for d in domains)]
    return found or list(SOURCES)


def _schema(default: list[str]) -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(CONF_SOURCES, default=default): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=list(SOURCES),
                    multiple=True,
                    mode=selector.SelectSelectorMode.LIST,
                    translation_key=CONF_SOURCES,
                )
            )
        }
    )


class HomelabPanelConfigFlow(ConfigFlow, domain=DOMAIN):
    """Add the Homelab panel to the sidebar."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return HomelabPanelOptionsFlow()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is None:
            return self.async_show_form(step_id="user", data_schema=_schema(detected(self.hass)))
        options = {**DEFAULTS, CONF_SOURCES: [s for s in SOURCES if s in user_input[CONF_SOURCES]]}
        return self.async_create_entry(title="Homelab Panel", data={}, options=options)


class HomelabPanelOptionsFlow(OptionsFlow):
    """The sources shown; the other settings are in the panel's Settings tab."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        current = {**DEFAULTS, **self.config_entry.options}
        if user_input is None:
            return self.async_show_form(step_id="init", data_schema=_schema(current[CONF_SOURCES]))
        return self.async_create_entry(
            data={**current, CONF_SOURCES: [s for s in SOURCES if s in user_input[CONF_SOURCES]]}
        )
