#!/bin/bash

APP_DIR="/home/pi/BCAS"
BACKEND="$APP_DIR/backend"
PYTHON_EXEC=$(which python3)

banner() {
whiptail --title "BCAS Installer" --msgbox "
$$$$$$$\   $$$$$$\   $$$$$$\   $$$$$$\  
$$  __$$\ $$  __$$\ $$  __$$\ $$  __$$\ 
$$ |  $$ |$$ /  \__|$$ /  $$ |$$ /  \__|
$$$$$$$  |$$ |      $$$$$$$$ |\$$$$$$\  
$$  ____/ $$ |      $$  __$$ | \____$$\ 
$$ |      $$ |  $$\ $$ |  $$ |$$\   $$ |
$$ |      \$$$$$$  |$$ |  $$ |\$$$$$$  |
\__|       \______/ \__|  \__| \______/ 

BCAS Installer & Auto-Setup" 20 70
}

install_deps() {
  sudo apt update
  sudo apt install -y python3-pip python3-venv whiptail
  pip3 install flask flask-login flask-bcrypt
}

create_user_db() {
  cd "$BACKEND" || exit 1
  if [ ! -f users.db ]; then
    $PYTHON_EXEC <<EOF
import sqlite3
conn = sqlite3.connect('users.db')
c = conn.cursor()
c.execute('''CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL)''')
conn.commit()
conn.close()
EOF
  fi
}

create_user() {
  while true; do
    username=$(whiptail --inputbox "Enter new admin username:" 8 40 --title "Create Admin User" 3>&1 1>&2 2>&3)
    password=$(whiptail --passwordbox "Enter new admin password:" 8 40 --title "Password" 3>&1 1>&2 2>&3)
    confirm=$(whiptail --passwordbox "Confirm password:" 8 40 --title "Confirm Password" 3>&1 1>&2 2>&3)

    if [ "$password" == "$confirm" ]; then
      $PYTHON_EXEC <<EOF
import sqlite3
import bcrypt
conn = sqlite3.connect('$BACKEND/users.db')
c = conn.cursor()
hashed = bcrypt.hashpw("$password".encode(), bcrypt.gensalt()).decode()
try:
    c.execute("INSERT INTO users (username, password) VALUES (?, ?)", ("$username", hashed))
    conn.commit()
except sqlite3.IntegrityError:
    print("Username already exists")
conn.close()
EOF
      break
    else
      whiptail --msgbox "Passwords do not match. Try again." 8 40
    fi
  done
}

create_service() {
  sudo bash -c "cat > /etc/systemd/system/bcas.service" <<EOF
[Unit]
Description=BCAS Flask Server
After=network.target

[Service]
ExecStart=$PYTHON_EXEC $BACKEND/app.py
WorkingDirectory=$BACKEND
Restart=always
User=pi
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reexec
  sudo systemctl daemon-reload
  sudo systemctl enable bcas.service
}

start_service() {
  sudo systemctl start bcas.service
}

main() {
  banner

  if [ ! -d "$APP_DIR" ]; then
    whiptail --msgbox "❌ BCAS folder not found at $APP_DIR. Please clone the repo there first." 10 60
    exit 1
  fi

  install_deps
  create_user_db
  create_user
  create_service
  start_service

  IP=$(hostname -I | awk '{print $1}')
  whiptail --title "✅ BCAS Setup Complete" --msgbox "BCAS is now installed.

Web interface: http://$IP:5000

It will start automatically on every boot.
Press OK to finish." 12 60
}

main
