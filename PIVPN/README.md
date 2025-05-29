# BCAS - Bypass Circumvent Access Secure

A secure Flask-based local dashboard for managing VPN and user access.

## Features

- Login/logout system with hashed passwords
- Admin panel with VPN start/stop
- IP display and status check
- Fully compatible with Raspberry Pi OS (Debian based)
- Web interface only accessible after login

## Requirements

- Python 3.9+
- Flask, flask-login, flask-bcrypt
- SQLite
- OpenVPN and systemd

## Setup

```bash
pip install flask flask-login flask-bcrypt
python backend/createnewuser.py
python backend/app.py
```

## VPN Note

Make sure `openvpn@client` is set up with a valid config in `/etc/openvpn/client.conf`.

