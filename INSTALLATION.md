# Euphoria Panel Installation Guide

## Product

- Name: Euphoria Panel
- Short name: EP
- Management command: `ep`
- Default install directory: `/opt/euphoria-panel`
- Default frontend port: `3001`
- Default backend port: `8001`
- Database: PostgreSQL 16
- Reverse proxy: optional Nginx/Caddy externally

## Supported systems

- Ubuntu 22.04 LTS
- Ubuntu 24.04 LTS
- Debian 12
- x86_64 / arm64
- At least 1 GB RAM, 5 GB free disk, internet access

## One-command installation

After publishing `install.sh` to your domain or Git repository:

```bash
curl -fsSL https://YOUR-DOMAIN/install.sh -o install.sh
sudo bash install.sh
```

The wizard will ask for domains, ports, database credentials, Pterodactyl settings, optional admin/Discord settings and SSL preference.

## What gets deployed

- PostgreSQL with a named Docker volume
- FastAPI backend
- Next.js frontend
- Environment configuration in `.env`
- `ep` management CLI

## Management commands

```bash
ep status
ep start
ep stop
ep restart
ep logs
ep version
ep configure
ep backup
ep restore /path/to/backup.tar.gz
ep update
ep uninstall
```

## Backup and restore

```bash
ep backup
ep restore /var/backups/euphoria-panel/euphoria-panel-backup-YYYYMMDD-HHMMSS.tar.gz
```

Backups include the PostgreSQL database and `.env`.

## Update

```bash
ep update
```

The update command creates a backup, updates source, rebuilds, restarts and verifies health. Existing `.env` is never overwritten automatically.

## Uninstall

```bash
ep uninstall
```

Option 1 removes containers while preserving database data.
Option 2 performs complete removal after explicit confirmation.

## Domain and SSL

Without a domain, use `http://IP:3001`.
With a domain, install a reverse proxy such as Caddy or Nginx externally and route:
- `/api/` to backend port 8001
- `/` to frontend port 3001

The wizard stores the domain in `CORS_ORIGINS`, `FRONTEND_URL` and related values.

## Security notes

- `.env` is written as mode `600`.
- PostgreSQL is only attached to the internal Docker network.
- Avoid publishing backend/frontend ports directly if using a reverse proxy.
- Do not commit real `.env` files or credentials.

## Publishing a release

1. Tag a stable release.
2. Publish `install.sh` at a stable URL.
3. Ensure the installer source URL/Git repository is public or provide authentication.
4. Document the chosen version in release notes.

## Troubleshooting

- Health endpoint: `http://127.0.0.1:8001/api/health`
- Compose status: `ep status`
- Compose logs: `ep logs backend`
- Re-run configuration: `ep configure`
