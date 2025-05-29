# BCAS - Bypass Circumvent Access Secure

A secure VPN management system for Raspberry Pi with web interface.

## Features

- 🔒 Secure web interface with user authentication
- 🔧 Easy one-script installation
- 🚀 Auto-start on boot via systemd
- 📱 Web dashboard for VPN management
- 🔐 Password hashing with bcrypt

## Requirements

**Hardware:**
- Raspberry Pi 4B (4GB recommended)
- 32GB+ SD Card (Class 10)

**Software:**
- Raspberry Pi OS Lite (64-bit) - Latest version
- Internet connection

## Installation

### Quick Setup

1. **Download Raspberry Pi OS Lite (64-bit)**
   - Flash to SD card using Raspberry Pi Imager
   - Enable SSH in imager settings if needed

2. **Clone and install BCAS**
   ```bash
   git clone https://github.com/BCAS-Team/BCAS-Team.github.io.git
   cd BCAS-Team.github.io/PIVPN
   chmod +x PIVPNinstaller.sh
   sudo ./PIVPNinstaller.sh
   ```

3. **Follow the installer prompts:**
   - Choose installation directory (default: `/home/pi/BCAS-Team`)
   - Create your admin username and password

4. **Access the web interface:**
   ```
   http://YOUR_PI_IP:5000
   ```

### What the installer does:
- Installs Python 3, pip, sqlite3, and other dependencies
- Sets up Python virtual environment
- Creates SQLite user database
- Configures systemd service for auto-start
- Starts the Flask web server

## Usage

**Web Interface:** Open `http://YOUR_PI_IP:5000` in your browser

**Service Management:**
```bash
# Check status
sudo systemctl status bcas

# Restart service
sudo systemctl restart bcas

# View logs
sudo journalctl -u bcas -f
```

**User Management:**
```bash
# Create new user
cd /path/to/bcas
python3 backend/createnewusers.py

# Reset password
python3 backend/createnewusers.py --reset username
```

## Project Structure

```
BCAS-Team/
├── PIVPNinstaller.sh          # Installation script
├── backend/
│   ├── app.py                 # Main Flask app
│   ├── createnewusers.py      # User management
│   ├── systemd-bcas.service   # System service
│   └── users.db               # User database
├── frontend/
│   ├── login.html             # Login page
│   └── index.html             # Dashboard
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

## Troubleshooting

**Web interface not accessible:**
```bash
# Check service is running
sudo systemctl status bcas

# Check your Pi's IP address
hostname -I

# Restart if needed
sudo systemctl restart bcas
```

**Login issues:**
```bash
# Reset user password
python3 backend/createnewusers.py --reset username
```

**Installation fails:**
- Make sure you're using `sudo ./PIVPNinstaller.sh`
- Ensure internet connection is working
- Check you have enough disk space (2GB+ free)

## Default Settings

- **Port:** 5000
- **Database:** SQLite (users.db)
- **Service:** Auto-starts on boot
- **Logs:** Available via `journalctl -u bcas`

## License

MIT License - see LICENSE file for details.
