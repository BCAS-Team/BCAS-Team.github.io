#!/bin/bash

# ASCII Banner
clear
cat << "EOF"
$$$$$$$\   $$$$$$\   $$$$$$\   $$$$$$\  
$$  __$$\ $$  __$$\ $$  __$$\ $$  __$$\ 
$$ |  $$ |$$ /  \__|$$ /  $$ |$$ /  \__|
$$$$$$$\ |$$ |      $$$$$$$$ |\$$$$$$\  
$$  __$$\ $$ |      $$  __$$ | \____$$\ 
$$ |  $$ |$$ |  $$\ $$ |  $$ |$$\   $$ |
$$$$$$$  |\$$$$$$  |$$ |  $$ |\$$$$$$  |
\_______/  \______/ \__|  \__| \______/ 
                                                                                                                 
EOF

echo "Welcome to the BCAS Installer Script!"
echo "Setting up environment..."

# System Update and Dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-flask python3-flask-login python3-flask-bcrypt python3-flask-cors nginx sqlite3 figlet curl net-tools ufw openvpn unzip

# Project Setup
echo "Cloning BCAS project..."
git clone https://github.com/BCAS-Team/BCAS-Team.github.io.git /opt/bcas
cd /opt/bcas/PIVPN || exit 1

# Permissions
sudo chmod +x PIVPINinstaller.sh

# Create Python virtual environment (optional)
# python3 -m venv venv
# source venv/bin/activate

# Database Setup
if [ ! -f "users.db" ]; then
    echo "Creating users.db..."
    cat <<EOF | python3
import sqlite3
from flask_bcrypt import Bcrypt
conn = sqlite3.connect('users.db')
c = conn.cursor()
c.execute("""
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);
""")
conn.commit()
conn.close()
EOF
fi

# Prompt for admin account
read -p "Enter initial admin username: " ADMIN_USER
read -s -p "Enter initial admin password: " ADMIN_PASS

cat <<EOF | python3
import sqlite3
from flask_bcrypt import Bcrypt
bcrypt = Bcrypt()
hashed = bcrypt.generate_password_hash("${ADMIN_PASS}").decode('utf-8')
conn = sqlite3.connect('users.db')
c = conn.cursor()
c.execute("INSERT INTO users (username, password) VALUES (?, ?)", ("${ADMIN_USER}", hashed))
conn.commit()
conn.close()
EOF

# Systemd Service
cat <<EOF | sudo tee /etc/systemd/system/bcas.service
[Unit]
Description=BCAS Web Interface
After=network.target

[Service]
ExecStart=/usr/bin/python3 /opt/bcas/PIVPN/backend/app.py
WorkingDirectory=/opt/bcas/PIVPN/backend
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reexec
sudo systemctl enable bcas.service
sudo systemctl start bcas.service

# Setup UFW Firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5000
sudo ufw --force enable

# VPN Installation via PiVPN
curl -L https://install.pivpn.io | bash

# Display IP address
echo "Your local IP address is:"
hostname -I | awk '{print $1}'
echo "BCAS server is running at: http://$(hostname -I | awk '{print $1}'):5000"

# Done
figlet DONE
