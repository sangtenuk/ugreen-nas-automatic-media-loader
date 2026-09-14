## Requirements

- Ugreen NAS (or any Linux system with systemd)
- Node.js
- `rsync`
- `beep` (for sound feedback)
- Root access for installation
  
## IMPORTANT
- create a <b>temporary</b> folder in <b>UGreen NAS Shared Folder</b>, and it will save under /volume1/temporary/[date-folders]
or customize config.json files.
```bash
{
  "checkInterval": 5000, 
  "searchPaths": ["/mnt"],
  "destinationBase": "/volume1/temporary",
  "logFile": "/var/log/sd-card-transfer.log",
  "extensions": [
    "mp4", "mov", "mxf",
    "jpg", "jpeg", "png",
    "arw", "cr2", "cr3", "dng",
    "wav", "mp3", "m4a", "aac", "ogg", "flac"
  ]
}
```

---

## Installation

1. Make the install script executable:
 ```bash
 chmod +x install.sh
```
2. Run the installer as root
 ```bash
 sudo ./install.sh
```

 The installer will:

Create /opt/sd-card-monitor
Create the log file
Install and enable the systemd service
Start the service automatically

## Useful Commands

Check status | systemctl status sd-card-monitor
View live logs | tail -f /var/log/sd-card-transfer.log
Stop service | systemctl stop sd-card-monitor
Start service | systemctl start sd-card-monitor
Restart service | systemctl restart sd-card-monitor

## Uninstall

1. Run the uninstaller as root
 ```bash
 sudo ./uninstall.sh
```

Note: Transferred files in /volume1/temporary/ were NOT deleted.

Remove them manually if needed: sudo rm -rf /volume1/temporary/[date-folders]
