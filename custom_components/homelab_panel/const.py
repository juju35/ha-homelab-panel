"""Constants for the Homelab Panel integration."""

DOMAIN = "homelab_panel"
VERSION = "1.0.0"

# Files served by the integration, and the sidebar panel (its own path, not /homelab_panel, so the frontend's panel
# route never shadows the files)
URL_BASE = f"/{DOMAIN}"
PANEL_URL = f"{URL_BASE}/homelab-panel.js"
I18N_URL = f"{URL_BASE}/i18n"
PANEL_PATH = "homelab"
PANEL_TITLE = "Homelab"
PANEL_ICON = "mdi:server-network"
# hass.data key of the panel's cached inventory (panel.py)
INVENTORY_KEY = f"{DOMAIN}_inventory"

# The sources the panel reads, and the integrations (domains, or entity platforms) each one is read from. A source
# is shown when one of its integrations has entities; the Settings tab and the setup can leave a source out.
SOURCES: dict[str, tuple[str, ...]] = {
    # Proxmox VE (core proxmoxve, the custom one under proxmoxve_custom) and Proxmox Extended Sensors
    "proxmox": ("proxmoxve", "proxmoxve_custom", "proxmox_sensors"),
    # Docker: Dockhand, Monitor Docker (YAML, entities only), Portainer
    "docker": ("dockhand", "monitor_docker", "portainer"),
    # NAS: UGREEN (ugreen), Synology DSM, QNAP; several NAS are shown side by side
    "nas": ("ugreen", "synology_dsm", "qnap"),
    # UPS: Network UPS Tools and APC UPS Daemon
    "ups": ("nut", "apcupsd"),
    # Services: Uptime Kuma monitors
    "services": ("uptime_kuma",),
    # Reverse proxy: Reverse Proxy (Zoraxy, Traefik, Nginx Proxy Manager)
    "proxy": ("reverse_proxy",),
    # Backups: Home Assistant's own (the Backup integration)
    "backups": ("backup",),
    # Certificates: Certificate Expiry
    "certificates": ("cert_expiry",),
}

# Settings (options of the config entry): the sources shown, and the panel's thresholds. The panel is always for
# administrators only.
CONF_SOURCES = "sources"
CONF_CONFIRM_ACTIONS = "confirm_actions"
CONF_SHOW_STOPPED = "show_stopped"
CONF_CERT_DAYS = "cert_warning_days"
CONF_DISK_TEMP = "disk_warning_temperature"
DEFAULTS = {
    CONF_SOURCES: list(SOURCES),
    CONF_CONFIRM_ACTIONS: True,
    CONF_SHOW_STOPPED: True,
    CONF_CERT_DAYS: 14,
    CONF_DISK_TEMP: 45,
}
