#!/bin/bash

clear

echo -e "\e[36m"
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
echo -e "\e[0m"

echo "Welcome to the BCAS Full Setup Installer!"
echo

# Check root privileges
if [ "$EUID" -ne 0 ]; then
  echo "Please run this script as root or with sudo."
  exit 1
fi

# Prompt for install directory
DEFAULT_DIR="/home/pi/BCAS-Team"
read -p "Enter installation directory [${DEFAULT_DIR}]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-$DEFAULT_DIR}

echo "Installing to: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# Install system dependencies
echo "Updating system and installing required packages..."
apt-get update
apt-get install -y python3 python3-pip python3-venv sqlite3 git curl

# Clone the repo or update it if it exists
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Existing BCAS repo found, pulling latest changes..."
  git -C "$INSTALL_DIR" pull
else
  echo "Cloning BCAS repo from GitHub..."
  git clone https://github.com/BCAS-Team/BCAS-Team.github.io.git "$INSTALL_DIR"
fi

# Move to PIVPN subfolder
cd "$INSTALL_DIR/PIVPN" || { echo "PIVPN folder not found in repo!"; exit 1; }

# Setup Python venv
echo "Setting up Python virtual environment..."
python3 -m venv "$INSTALL_DIR/venv"
source "$INSTALL_DIR/venv/bin/activate"

# Upgrade pip and install Python dependencies from requirements.txt if exists
if [ -f "requirements.txt" ]; then
  echo "Installing Python packages from requirements.txt..."
  pip install --upgrade pip
  pip install -r requirements.txt
else
  echo "No requirements.txt found. Installing default packages..."
  pip install --upgrade pip
  pip install flask flask-login flask-bcrypt flask-cors
fi

# Copy backend, frontend and systemd service files to the base install folder
echo "Copying necessary files to base directory..."

mkdir -p "$INSTALL_DIR/backend" "$INSTALL_DIR/frontend" "$INSTALL_DIR/static"

cp backend/app.py backend/createnewusers.py backend/systemd-bcas.service "$INSTALL_DIR/backend/"
cp frontend/login.html frontend/index.html "$INSTALL_DIR/frontend/"
# If static folder or files exist, copy them too
if [ -d "static" ]; then
  cp -r static/* "$INSTALL_DIR/static/"
fi

# Setup systemd service
echo "Setting up systemd service..."

# Adjust systemd file paths to your install location
sed -i "s|WorkingDirectory=.*|WorkingDirectory=$INSTALL_DIR/backend|" "$INSTALL_DIR/backend/systemd-bcas.service"
sed -i "s|ExecStart=.*|ExecStart=$INSTALL_DIR/venv/bin/python $INSTALL_DIR/backend/app.py|" "$INSTALL_DIR/backend/systemd-bcas.service"

cp "$INSTALL_DIR/backend/systemd-bcas.service" /etc/systemd/system/systemd-bcas.service

systemctl daemon-reload
systemctl enable systemd-bcas.service

# Create SQLite DB and initial user
echo "Creating initial user for the web app..."
python3 "$INSTALL_DIR/backend/createnewusers.py"

# Start the service now
echo "Starting BCAS Flask service..."
systemctl start systemd-bcas.service

IP_ADDR=$(hostname -I | awk '{print $1}')
echo
echo "Installation complete!"
echo "Access the web interface at: http://$IP_ADDR:5000"
echo
echo "The BCAS backend service is running and will start on boot."
echo
echo "Thank you for installing BCAS!"
echo

deactivate
exit 0
