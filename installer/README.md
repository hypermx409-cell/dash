# Euphoria Panel Installer

Installer for Euphoria Panel: Next.js frontend, FastAPI backend, PostgreSQL database.

## Interactive installation

```bash
sudo bash install.sh
```

The wizard creates `.env`, configures ports, PostgreSQL, optional Pterodactyl/Discord/admin credentials, builds Docker images, starts services and verifies health.

## Files

- `common.sh` — shared helpers.
- `install.sh` — production installation wizard.
- `configure.sh` — update configuration.
- `backup.sh` — create timestamped backups.
- `restore.sh` — restore a backup.
- `update.sh` — update the deployment.
- `uninstall.sh` — remove or fully remove Euphoria Panel.
- `README.md` — this file.
