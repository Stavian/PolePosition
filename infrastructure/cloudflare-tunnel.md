# Cloudflare Tunnel Setup für DrivePack

## Voraussetzungen
- Cloudflare-Konto (kostenlos)
- Eine Domain die bei Cloudflare verwaltet wird
  (oder nutze die kostenlose `trycloudflare.com` Subdomain zum Testen)

---

## 1. cloudflared im LXC installieren

```bash
# Im LXC-Container als root:
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg

echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
  https://pkg.cloudflare.com/cloudflared bookworm main' \
  > /etc/apt/sources.list.d/cloudflared.list

apt update && apt install -y cloudflared

cloudflared --version
```

---

## 2. Bei Cloudflare anmelden und Tunnel erstellen

```bash
# Schritt 1: Im Browser anmelden (öffnet Cloudflare-Login)
cloudflared tunnel login
# → Folge dem Link, authorisiere deine Domain
# → Zertifikat wird gespeichert unter: ~/.cloudflared/cert.pem

# Schritt 2: Tunnel erstellen
cloudflared tunnel create drivepack
# → Gibt eine Tunnel-UUID aus, z.B.: a1b2c3d4-...
# → Credentials-Datei: ~/.cloudflared/<UUID>.json

# Schritt 3: Tunnel-UUID speichern
cloudflared tunnel list
```

---

## 3. Konfigurationsdatei erstellen

```bash
# Ersetze DEINE-TUNNEL-UUID und DEINE-DOMAIN:
mkdir -p /etc/cloudflared

cat > /etc/cloudflared/config.yml << 'EOF'
tunnel: DEINE-TUNNEL-UUID
credentials-file: /root/.cloudflared/DEINE-TUNNEL-UUID.json

# Logging
loglevel: info
logfile: /var/log/cloudflared.log

ingress:
  # PocketBase API + Admin UI
  - hostname: api.DEINE-DOMAIN.de
    service: http://127.0.0.1:8090
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
      # Wichtig für SSE (realtime GPS subscriptions):
      http2Origin: false
      keepAliveTimeout: 90s
      keepAliveConnections: 100

  # Catch-all (Pflichtfeld)
  - service: http_status:404
EOF
```

> **Wichtig für Realtime (GPS Live-Tracking):**
> PocketBase nutzt Server-Sent Events (SSE) für Realtime-Subscriptions.
> `http2Origin: false` und das hohe `keepAliveTimeout` sind nötig,
> damit die SSE-Verbindungen nicht durch den Tunnel unterbrochen werden.

---

## 4. DNS-Eintrag bei Cloudflare setzen

```bash
# Erstellt automatisch einen CNAME in deinem Cloudflare-Dashboard:
cloudflared tunnel route dns drivepack api.DEINE-DOMAIN.de
```

Oder manuell im Cloudflare Dashboard:
- **DNS → Add record**
- Type: `CNAME`
- Name: `api`
- Target: `DEINE-TUNNEL-UUID.cfargotunnel.com`
- Proxy: ✅ (orange Wolke)

---

## 5. Als Systemd-Service einrichten

```bash
cloudflared service install

# Falls nicht automatisch erkannt, manuell:
cat > /etc/systemd/system/cloudflared.service << 'EOF'
[Unit]
Description=Cloudflare Tunnel — DrivePack
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cloudflared
systemctl start cloudflared
systemctl status cloudflared
```

---

## 6. Testen

```bash
# Lokal im Container:
curl http://127.0.0.1:8090/api/health
# → {"code":200,"message":"API is healthy."}

# Von außen (nach DNS-Propagation ~1-2 Minuten):
curl https://api.DEINE-DOMAIN.de/api/health
# → {"code":200,"message":"API is healthy."}
```

---

## Zusammenfassung der Ports

| Dienst | Port | Erreichbar von |
|---|---|---|
| PocketBase API | 8090 | nur intern (127.0.0.1) |
| Cloudflare Tunnel | ausgehend | Cloudflare → intern |
| App | `https://api.DEINE-DOMAIN.de` | weltweit via Cloudflare |

Kein eingehender Port muss in deinem Router geöffnet werden.
