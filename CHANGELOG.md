# Changelog

## 1.0.2 - 2026-11-27

### Fixes
- Devices of a NAS integration that report nothing a NAS does (no CPU, storage or temperature: a dashboard plugin, an update only) are no longer counted as NAS.
- The NAS usage reads the volume's own used and total sizes before its pool's, which were always full (100 %).
- The NAS rows show the model under the name, cut with an ellipsis instead of wrapping.
- The summary tiles share the whole width; the Proxmox rack is drawn in the top bar only when Proxmox is there.

## 1.0.1 - 2026-11-27

### Fixes
- Containers: Dockhand and Portainer stacks, schedules and groups are no longer counted as containers; only their containers are (and shown by their own name).
- NAS: a NAS whose pools and disks are devices of their own (UGREEN, Synology) now counts once, its parts listed under it.
- Header: the drawings no longer cover the title and the alerts pill on a narrow screen; those that do not fit are left out.
- Tabs: a tab with nothing to show (no Proxmox host, no container, no NAS…) is hidden.
- Services: a monitor listed several times shows once; entities left over by a removed integration entry are ignored.
- Containers: the Docker hosts list, which repeated the counts, is gone.

## 1.0.0 - 2026-11-27

### Features

- Homelab sidebar panel (`/homelab`, administrators only) over the homelab integrations you already have: Proxmox VE (built in or custom, with Proxmox Extended Sensors), Docker (Dockhand, Monitor Docker, Portainer), several NAS side by side (UGREEN, Synology DSM, QNAP), UPS (Network UPS Tools, apcupsd), Uptime Kuma, Reverse Proxy, Home Assistant backups and Certificate Expiry
- Tabs Overview, Hosts, Containers, Storage, Services, Backups and Settings, under an illustrated top bar (the Proxmox rack, one drawing per NAS model, the UPS; day and night with the theme) with a status pill counting the alerts
- Start, restart and stop of virtual machines, LXC containers and Docker containers through the integrations' buttons and switches, with a confirmation before a restart or a stop
- Alerts for a host or a service down, a stopped container, a UPS on battery, a hot NAS drive or a failing one, a late or failed backup, and a certificate about to expire, with their thresholds in the Settings tab
- Sources picked at setup and in the Settings tab, each shown with its state (connected, not loaded, not set up)
- Light and dark themes, phones and desktops, 22 languages
