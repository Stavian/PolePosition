# DrivePack — Proxmox LXC Setup

## 1. Empfehlung: LXC Container (nicht VM)

PocketBase ist ein einzelnes Binary (~30 MB, ~80 MB RAM).
Ein LXC Container ist ausreichend und deutlich leichtgewichtiger als eine VM.

---

## 2. LXC Container in Proxmox erstellen

### Schritt 1 — Debian 12 Template herunterladen

In der Proxmox Web-UI:
- **Datacenter → Node → local (storage) → CT Templates → Templates**
- Suche: `debian-12-standard` → **Download**

### Schritt 2 — Container erstellen

**Proxmox Web-UI → Create CT**

| Einstellung | Wert |
|---|---|
| **CT ID** | z.B. `110` |
| **Hostname** | `drivepack` |
| **Unprivileged** | ✅ Ja |
| **Template** | `debian-12-standard_12.x_amd64.tar.zst` |
| **Root Disk** | 20 GB (SSD-Pool empfohlen) |
| **CPU Cores** | 2 |
| **RAM** | 1024 MB |
| **Swap** | 512 MB |
| **Network** | Bridge: `vmbr0`, IPv4: DHCP oder statische IP |
| **DNS** | Standard (vom Host) |
| **Start at boot** | ✅ Ja |

> **Features** (Options-Tab nach Erstellung):
> Keine speziellen Features nötig für PocketBase.
> Falls Docker später gewünscht: `nesting=1` aktivieren.

### Schritt 3 — Container starten und Basis-Setup

```bash
# In der Proxmox Shell oder via SSH auf den Proxmox-Host:
pct start 110
pct exec 110 -- bash

# Im Container:
apt update && apt upgrade -y
apt install -y curl wget unzip ca-certificates

# Statische IP setzen (empfohlen statt DHCP)
# Datei: /etc/network/interfaces
# auto eth0
# iface eth0 inet static
#   address 192.168.1.50/24    ← deine gewünschte IP
#   gateway 192.168.1.1
#   dns-nameservers 1.1.1.1 8.8.8.8
```

---

## 3. PocketBase installieren

```bash
# Als root im LXC-Container ausführen:

# PocketBase-User anlegen
useradd -m -s /bin/bash pocketbase

# Verzeichnis anlegen
mkdir -p /opt/pocketbase/pb_hooks
mkdir -p /opt/pocketbase/pb_migrations

# Neueste PocketBase-Version ermitteln und herunterladen
PB_VERSION=$(curl -s https://api.github.com/repos/pocketbase/pocketbase/releases/latest \
  | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/')

wget "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
  -O /tmp/pocketbase.zip

unzip /tmp/pocketbase.zip -d /opt/pocketbase/
chmod +x /opt/pocketbase/pocketbase
chown -R pocketbase:pocketbase /opt/pocketbase/

# Version prüfen
/opt/pocketbase/pocketbase --version
```

---

## 4. Systemd Service

```bash
cat > /etc/systemd/system/pocketbase.service << 'EOF'
[Unit]
Description=PocketBase — DrivePack Backend
After=network.target

[Service]
Type=simple
User=pocketbase
Group=pocketbase
WorkingDirectory=/opt/pocketbase
ExecStart=/opt/pocketbase/pocketbase serve \
  --http=127.0.0.1:8090 \
  --dir=/opt/pocketbase/pb_data \
  --hooksDir=/opt/pocketbase/pb_hooks \
  --migrationsDir=/opt/pocketbase/pb_migrations
Restart=always
RestartSec=5
LimitNOFILE=65536
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable pocketbase
systemctl start pocketbase
systemctl status pocketbase
```

PocketBase Admin-UI ist jetzt erreichbar auf:
`http://[CONTAINER-IP]:8090/_/`

---

## 5. Firewall (optional aber empfohlen)

```bash
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh          # Port 22 für Proxmox-Zugriff
# Port 8090 NICHT nach außen öffnen — läuft nur intern
# Cloudflare Tunnel übernimmt den externen Zugang
ufw enable
```

---

## 6. Daten-Backup mit Proxmox

Proxmox kann den kompletten LXC-Container sichern:
- **Datacenter → Backup → Add**
- Container ID: `110` auswählen
- Schedule: täglich / wöchentlich
- Mode: Snapshot

Zusätzlich PocketBase-eigenes Backup:
```bash
# Cron-Job im Container (täglich 03:00)
crontab -e -u pocketbase
# 0 3 * * * /opt/pocketbase/pocketbase backup --dir=/opt/pocketbase/pb_backups
```
