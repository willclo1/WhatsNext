# Deploying Six Degrees on a Raspberry Pi

Everything runs on the Pi behind your own router. One hostname, one certificate,
no third-party hosting, no CORS.

```
Internet
   │  :443
   ▼
Router  ── port forward ──►  Pi (static LAN IP)
                              │
                              ├─ Caddy         TLS + static files + /api proxy
                              ├─ FastAPI       127.0.0.1:8000  (not exposed)
                              └─ PostgreSQL    127.0.0.1:5432  (not exposed)
```

Caddy serves the built frontend and proxies `/api/*` to FastAPI, so the browser
only ever talks to one origin. Only Caddy listens publicly; the API and database
are bound to localhost and cannot be reached from the LAN, let alone the
internet.

---

## 0. Check this will work at all

**Port forwarding is impossible behind CGNAT**, where your ISP shares one public
IP across many customers. Check before doing anything else — compare your
router's WAN address with your actual public address:

```bash
curl -s https://api.ipify.org; echo
```

If that differs from the WAN IP shown in your router's status page, or the WAN
IP falls in `100.64.0.0` – `100.127.255.255`, you are behind CGNAT. Forwarding
will never work. Ask your ISP for a public IP (often free on request), or use a
tunnel instead.

Also confirm your ISP does not block inbound 80/443 — many residential plans do.
If they do, forward an alternative external port (see [step 7](#7-router)).

---

## 1. Pi setup

### Architecture matters

```bash
uname -m
```

- **`aarch64`** — 64-bit. `requirements.txt` installs as-is.
- **`armv7l`** — 32-bit. There is **no `psycopg-binary` wheel**, so the install
  fails. Fix by using the system libpq, which you will have anyway:

  ```bash
  sudo apt install -y libpq-dev
  # then in requirements.txt change:  psycopg[binary]==3.3.4  ->  psycopg==3.3.4
  ```

Python 3.11 (Bookworm) and 3.13 (Trixie) both run this API unmodified.

### Base packages

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y git curl python3-venv ufw
```

### Give the Pi a fixed LAN address

Port forwarding points at an IP. If DHCP reassigns it after a reboot, the
forward silently breaks. Set a **DHCP reservation** in your router for the Pi's
MAC address — better than a static IP configured on the Pi, because the router
then knows not to hand that address to anything else.

```bash
ip -4 addr show | grep inet        # current address
cat /sys/class/net/eth0/address    # MAC for the reservation
```

---

## 2. PostgreSQL

### Match the major version

Your dump comes from **PostgreSQL 17**. `pg_restore` is forward-compatible only
— restoring a 17 dump into Debian Bookworm's PostgreSQL 15 can fail. Install 17
from the PGDG repository rather than Debian's default:

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh   # answers: yes
sudo apt install -y postgresql-17 postgresql-contrib-17
```

Check your source version with `pg_dump --version` on your Mac and match it.

### Move the data directory off the SD card

**This is the step that decides whether the project survives.** Database write
patterns wear flash out, and SD cards fail without warning. Put the data on a
USB SSD:

```bash
sudo systemctl stop postgresql
sudo mkdir -p /mnt/ssd/postgresql && sudo chown postgres:postgres /mnt/ssd/postgresql
sudo -u postgres cp -a /var/lib/postgresql/17/main /mnt/ssd/postgresql/
sudo sed -i "s|^data_directory.*|data_directory = '/mnt/ssd/postgresql/main'|" \
  /etc/postgresql/17/main/postgresql.conf
sudo systemctl start postgresql
sudo -u postgres psql -c "SHOW data_directory;"
```

Add the SSD to `/etc/fstab` with a UUID so it remounts on boot.

If you must stay on the SD card, at minimum cron a nightly dump elsewhere —
yours is under 1 MB.

### Create the database

```bash
sudo -u postgres createuser --pwprompt sixdegrees
sudo -u postgres createdb --owner=sixdegrees movies
sudo -u postgres psql -d movies -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

Leave PostgreSQL listening on localhost only (the default). Nothing outside the
Pi needs to reach it.

### Load your data

Your local database reports ~622 MB, but only ~1.6 MB is real; the rest is bloat
left from importing the full TMDB dump and culling it. `pg_dump` exports live
rows only, so the transfer is **under 1 MB** and the bloat does not travel.

From your Mac:

```bash
pg_dump -d movies -Fc --no-owner --no-privileges -f movies.dump
scp movies.dump pi@raspberrypi.local:~
```

On the Pi:

```bash
pg_restore -d "postgresql://sixdegrees:PASSWORD@127.0.0.1/movies" \
  --no-owner --no-privileges movies.dump
```

Add `--exclude-table-data=games --exclude-table-data=game_steps` to the
`pg_dump` if you would rather not carry your local game history over.

Verify:

```bash
psql "postgresql://sixdegrees:PASSWORD@127.0.0.1/movies" \
  -c "SELECT count(*) FROM movies;"       # expect 2620
```

---

## 3. The application

```bash
sudo mkdir -p /opt/sixdegrees && sudo chown $USER /opt/sixdegrees
git clone <your-repo> /opt/sixdegrees
cd /opt/sixdegrees/CoreAPI
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

Create `/opt/sixdegrees/.env` (mode `600` — it holds a database password):

```ini
TMDB_API_KEY=your_key
DATABASE_URL=postgresql+psycopg://sixdegrees:PASSWORD@127.0.0.1:5432/movies
ALLOWED_ORIGINS=https://sixdegrees.example.com
```

The `+psycopg` prefix is required. A bare `postgresql://` makes SQLAlchemy load
`psycopg2`, which is not installed and will not be.

```bash
chmod 600 /opt/sixdegrees/.env
```

---

## 4. Run the API as a service

`/etc/systemd/system/sixdegrees-api.service`:

```ini
[Unit]
Description=Six Degrees API
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=sixdegrees
WorkingDirectory=/opt/sixdegrees/CoreAPI
EnvironmentFile=/opt/sixdegrees/.env
ExecStart=/opt/sixdegrees/CoreAPI/venv/bin/uvicorn main:app \
  --host 127.0.0.1 --port 8000 \
  --proxy-headers --forwarded-allow-ips=127.0.0.1
Restart=always
RestartSec=5

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/sixdegrees

[Install]
WantedBy=multi-user.target
```

`--host 127.0.0.1` is deliberate: the API is reachable only through Caddy, never
directly, not even from your LAN.

```bash
sudo useradd --system --no-create-home sixdegrees
sudo chown -R sixdegrees /opt/sixdegrees
sudo systemctl enable --now sixdegrees-api
curl -s localhost:8000/health          # {"status":"ok"}
journalctl -u sixdegrees-api -f        # if it is not
```

---

## 5. Build the frontend

Vite inlines `VITE_*` variables at **build** time, so they must be set for the
build command, not the service. Since Caddy proxies the API under `/api` on the
same host:

```bash
cd /opt/sixdegrees/movieFrontend
npm ci
VITE_API_URL="https://sixdegrees.example.com/api" \
VITE_TMDB_IMAGE_URL="https://image.tmdb.org/t/p" \
npm run build
```

Rebuild whenever either value changes. If either is missing the build fails
deliberately — see `src/config.ts`.

Building on a Pi works but is slow; building on your Mac and `rsync`ing `dist/`
is fine too.

---

## 6. Caddy

Caddy handles TLS certificates and renewal automatically.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```caddyfile
sixdegrees.example.com {
    encode zstd gzip

    handle /api/* {
        uri strip_prefix /api
        reverse_proxy 127.0.0.1:8000
    }

    handle {
        root * /opt/sixdegrees/movieFrontend/dist
        try_files {path} /index.html
        file_server
    }

    log {
        output file /var/log/caddy/access.log
    }
}
```

```bash
sudo systemctl reload caddy
```

Because the browser loads the page and calls the API from the same origin, CORS
never enters the picture. `ALLOWED_ORIGINS` is set anyway so nothing breaks if
you later split them.

---

## 7. Router

Forward **only** what is needed, to the Pi's reserved address:

| External port | → Internal | Why |
|---|---|---|
| 443 | Pi:443 | HTTPS |
| 80 | Pi:80 | Let's Encrypt HTTP challenge + redirect to HTTPS |

**Do not forward 22.** SSH exposed to the internet is scanned and brute-forced
continuously. Administer the Pi from your LAN, or over a VPN such as WireGuard
or Tailscale.

If your ISP blocks 80/443, forward e.g. external `8443 → Pi:443`. Your URL then
carries `:8443`, and Let's Encrypt's HTTP challenge stops working — switch Caddy
to the DNS challenge for your DNS provider instead.

---

## 8. DNS

Home IP addresses change, so point a name at it dynamically.

**With your own domain** (best): create an A record, then run a dynamic DNS
updater. If the domain is on Cloudflare, set the record to **DNS only** (grey
cloud) unless you want their proxy in front.

**Without one**: [DuckDNS](https://www.duckdns.org) is free and gives you
`something.duckdns.org`. Their cron one-liner keeps it current.

Verify from **outside** your network — phone on mobile data is the easiest test.
Many routers cannot reach their own public IP from inside (NAT loopback), so a
test from your LAN can fail even when everything is correct.

---

## 9. Lock it down

You are putting a machine on the public internet. The API has no authentication:
anyone who finds it can create games and read film data.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80,443/tcp
sudo ufw allow from 192.168.0.0/16 to any port 22   # SSH from LAN only
sudo ufw enable
```

```bash
sudo apt install -y unattended-upgrades fail2ban
sudo dpkg-reconfigure -plow unattended-upgrades
```

Rate-limit game creation so nobody can fill the database. In the Caddyfile:

```caddyfile
handle /api/games {
    rate_limit {
        zone games {
            key    {remote_host}
            events 20
            window 1m
        }
    }
    uri strip_prefix /api
    reverse_proxy 127.0.0.1:8000
}
```

(Needs the `caddy-ratelimit` plugin via `xcaddy`; alternatively rate-limit at
your DNS provider's edge.)

Back the database up somewhere off the Pi:

```bash
0 4 * * * pg_dump -Fc -d movies -f /mnt/ssd/backups/movies-$(date +\%F).dump
```

---

## Verify

```bash
curl -s https://sixdegrees.example.com/api/health          # {"status":"ok"}
curl -s "https://sixdegrees.example.com/api/movie/search?q=matrix&limit=2"
```

Then load the site on mobile data and play a round: start a route, search a
film, pick a co-star, reload to confirm the game resumes.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Works on LAN, not outside | CGNAT, ISP blocking 80/443, or forward pointing at a stale IP |
| Works outside, not on LAN | NAT loopback unsupported — normal, test from mobile data |
| Certificate never issues | Port 80 unreachable, or DNS not yet pointing at your IP |
| `psycopg2` import error | `DATABASE_URL` missing the `+psycopg` prefix |
| API 502 through Caddy | Service down — `journalctl -u sixdegrees-api -n 50` |
| Restore errors on `CREATE EXTENSION` | `postgresql-contrib` not installed |
| Frontend calls the wrong URL | `VITE_API_URL` baked in at build time; rebuild |
| Everything dies after weeks | SD card wear — see [step 2](#2-postgresql) |

---

## Local development

Unchanged:

```bash
cd CoreAPI && ./venv/bin/uvicorn main:app --reload
cd movieFrontend && npm run dev
```

`ALLOWED_ORIGINS` unset falls back to `http://localhost:5173`.
