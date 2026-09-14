#!/bin/bash

set -e

echo "=== SD Card Auto Transfer - Uninstallation Script ==="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run as root (use sudo)"
  exit 1
fi

INSTALL_DIR="/opt/sd-card-monitor"

echo "1. Stopping service..."
systemctl stop sd-card-monitor.service || true

echo "2. Disabling service..."
systemctl disable sd-card-monitor.service || true

echo "3. Removing systemd service file..."
rm -f /etc/systemd/system/sd-card-monitor.service
systemctl daemon-reload

echo "4. Removing installation directory..."
rm -rf "$INSTALL_DIR"

echo "5. Removing log file..."
rm -f /var/log/sd-card-transfer.log

echo ""
echo "=== Uninstallation Complete! ==="
echo ""
echo "Note: Transferred files in /volume1/temporary/ were NOT deleted."
echo "Remove them manually if needed:"
echo "  sudo rm -rf /volume1/temporary/[date-folders]"
echo ""
