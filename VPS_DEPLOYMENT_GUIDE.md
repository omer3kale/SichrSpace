# SichrPlace — DigitalOcean VPS Provisioning Guide

> One-time setup for a fresh Ubuntu 22.04 DigitalOcean Droplet (2 GB RAM minimum).

---

## 1. Create the Droplet

| Setting | Value |
|---------|-------|
| Image | Ubuntu 22.04 LTS |
| Plan | Basic — 2 GB / 1 vCPU ($12/mo or GitHub Enterprise credit) |
| Region | Closest to your users (e.g. `nyc1`) |
| Auth | SSH key (add your public key) |
| Hostname | `sichrplace-api` |

---

## 2. Initial Server Hardening

```bash
# SSH in as root
ssh root@<DROPLET_IP>

# Create deploy user
adduser deploy
usermod -aG sudo deploy

# Copy SSH key to deploy user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Disable root login & password auth
sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 3. Install Docker Engine

```bash
# As deploy user
sudo apt update && sudo apt upgrade -y

# Install Docker (official method)
curl -fsSL https://get.docker.com | sudo sh

# Add deploy user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker deploy
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 4. Set Up the Application Directory

```bash
sudo mkdir -p /opt/sichrplace
sudo chown deploy:deploy /opt/sichrplace
cd /opt/sichrplace
```

Copy the deployment files from the repository:

```bash
# Option A: Clone the repo
git clone https://github.com/<your-user>/sichrplace-backend.git .

# Option B: Copy just the deploy files via scp
scp docker-compose.yml Caddyfile .env.example deploy@<DROPLET_IP>:/opt/sichrplace/
```

Create and populate the `.env` file:

```bash
cp .env.example .env
nano .env   # Fill in real passwords and secrets
```

Generate strong secrets:

```bash
# Database password
openssl rand -base64 32

# JWT secret
openssl rand -base64 48
```

---

## 5. Point DNS

Create an **A record** for your API domain:

| Type | Name | Value |
|------|------|-------|
| A | `api.sichrplace.com` | `<DROPLET_IP>` |

> Wait for DNS propagation (usually 1–5 minutes with DigitalOcean DNS).

---

## 6. First Deploy

```bash
cd /opt/sichrplace

# Log in to GitHub Container Registry
echo "<YOUR_GITHUB_PAT>" | docker login ghcr.io -u <your-github-user> --password-stdin

# Pull images and start everything
docker compose up -d

# Watch logs
docker compose logs -f
```

Caddy will automatically obtain a TLS certificate from Let's Encrypt once DNS resolves.

---

## 7. Verify

```bash
# Health check
curl https://api.sichrplace.com/api/health

# Check all containers are running
docker compose ps
```

Expected output:
```
NAME        STATUS          PORTS
api         Up (healthy)    8080/tcp
database    Up (healthy)    5432/tcp
caddy       Up              0.0.0.0:80->80, 0.0.0.0:443->443
```

---

## 8. GitHub Actions Secrets

Add these to your GitHub repository → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Droplet IP address (e.g. `164.90.xxx.xxx`) |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Contents of `~/.ssh/id_ed25519` (private key) |

> `GITHUB_TOKEN` is provided automatically by GitHub Actions — no manual setup needed.

---

## 9. Ongoing Maintenance

```bash
# View logs
docker compose logs -f api

# Restart a single service
docker compose restart api

# Update all images manually
docker compose pull && docker compose up -d

# Database backup
docker compose exec database pg_dump -U sichrplace_user sichrplace > backup_$(date +%F).sql

# Restore from backup
cat backup_2025-06-15.sql | docker compose exec -T database psql -U sichrplace_user sichrplace
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│               DigitalOcean Droplet              │
│                                                 │
│   ┌───────┐     ┌───────┐     ┌──────────┐     │
│   │ Caddy │────▶│  API  │────▶│ Postgres │     │
│   │ :443  │     │ :8080 │     │  :5432   │     │
│   └───┬───┘     └───────┘     └──────────┘     │
│       │                                         │
└───────┼─────────────────────────────────────────┘
        │
   HTTPS (Let's Encrypt)
        │
   ┌────┴────┐
   │ Browser │  ◀── GitHub Pages (frontend)
   └─────────┘
```
