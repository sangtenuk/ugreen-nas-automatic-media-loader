#!/bin/bash

set -e

echo "=== SD Card Auto Transfer - Installation Script ==="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run as root (use sudo)"
  exit 1
fi

INSTALL_DIR="/opt/sd-card-monitor"
BACKUP_DIR="/volume1/temporary"

echo "1. Creating installation directory..."
mkdir -p "$INSTALL_DIR"

echo "2. Verifying backup destination directory..."
mkdir -p "$BACKUP_DIR"

echo "3. Copying files..."
cp sd-card-monitor.js "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/sd-card-monitor.js"

echo "4. Creating log file..."
touch /var/log/sd-card-transfer.log
chmod 644 /var/log/sd-card-transfer.log

echo "5. Installing systemd service..."
cp sd-card-monitor.service /etc/systemd/system/
systemctl daemon-reload

echo "6. Enabling and starting service..."
systemctl enable sd-card-monitor.service
systemctl start sd-card-monitor.service

echo ""
echo "=== Installation Complete! ==="
echo ""
echo "Service Status:"
systemctl status sd-card-monitor.service --no-pager
echo ""
echo "Useful Commands:"
echo "  - Check status:  systemctl status sd-card-monitor"
echo "  - View logs:     tail -f /var/log/sd-card-transfer.log"
echo "  - Stop service:  systemctl stop sd-card-monitor"
echo "  - Start service: systemctl start sd-card-monitor"
echo "  - Restart:       systemctl restart sd-card-monitor"
echo ""
echo "Files are backed up to: $BACKUP_DIR"
