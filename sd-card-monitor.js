#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// High buffer for cards with thousands of files
const EXEC_OPTIONS = {
  maxBuffer: 1024 * 1024 * 10
};

// ============================================================
// LOAD CONFIG FROM config.json
// ============================================================

const CONFIG_PATH = path.join(__dirname, 'config.json');

let CONFIG;

try {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  CONFIG = JSON.parse(raw);
} catch (err) {
  console.error('Failed to load config.json:', err.message);
  process.exit(1);
}

// Fallback defaults (just in case)
CONFIG.checkInterval = CONFIG.checkInterval || 5000;
CONFIG.searchPaths = CONFIG.searchPaths || ['/mnt'];
CONFIG.destinationBase = CONFIG.destinationBase || '/volume1/temporary';
CONFIG.logFile = CONFIG.logFile || '/var/log/sd-card-transfer.log';
CONFIG.extensions = CONFIG.extensions || [
  'mp4', 'mov', 'mxf',
  'jpg', 'jpeg', 'png',
  'arw', 'cr2', 'cr3', 'dng',
  'wav', 'mp3', 'm4a', 'aac', 'ogg', 'flac'
];

let transferBeepInterval = null;

// ============================================================
// ARCADE UI SOUNDS
// ============================================================

async function nasBeep(type = 'short') {
  try {
    if (type === 'detect') {
      // Coin insert
      await execAsync(
        'beep -f 1200 -l 60 -D 40 -n -f 1800 -l 80',
        EXEC_OPTIONS
      );
    }

    else if (type === 'eject') {
      // Level complete / success
      await execAsync(
        'beep -f 523 -l 80 -D 40 -n -f 659 -l 80 -D 40 -n -f 784 -l 80 -D 40 -n -f 1046 -l 200',
        EXEC_OPTIONS
      );
    }

    else if (type === 'transfer-start') {
      if (transferBeepInterval) {
        clearInterval(transferBeepInterval);
      }

      const playArcadeLoop = async () => {
        try {
          await execAsync(
            'beep -f 440 -l 50 -D 30 -n -f 554 -l 50 -D 30 -n -f 659 -l 50 -D 30 -n -f 880 -l 80 -D 200',
            EXEC_OPTIONS
          );
        } catch (err) {}
      };

      playArcadeLoop();
      transferBeepInterval = setInterval(playArcadeLoop, 1200);
    }

    else if (type === 'transfer-stop') {
      if (transferBeepInterval) {
        clearInterval(transferBeepInterval);
        transferBeepInterval = null;
      }
    }

    else if (type === 'error') {
      // Error tone
      await execAsync(
        'beep -f 400 -l 120 -D 60 -n -f 300 -l 120 -D 60 -n -f 200 -l 250',
        EXEC_OPTIONS
      );
    }
  } catch (err) {
    // Sound failure must never stop the transfer
  }
}

// ============================================================
// LOGGING
// ============================================================

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  console.log(logMessage.trim());

  try {
    fs.appendFileSync(CONFIG.logFile, logMessage);
  } catch (e) {}
}

// ============================================================
// GET MOUNTED DEVICES
// ============================================================

async function getMountedDevices() {
  try {
    const { stdout } = await execAsync('lsblk -rno MOUNTPOINT,RM', EXEC_OPTIONS);

    return stdout
      .trim()
      .split('\n')
      .map(line => {
        const [mountpoint, isRemovable] = line.split(' ');
        return {
          mountpoint,
          isRemovable: isRemovable === '1'
        };
      })
      .filter(dev => dev.mountpoint && dev.mountpoint.length > 1);
  } catch (err) {
    return [];
  }
}

// ============================================================
// DATE HELPERS
// ============================================================

function getTodayDateString() {
  const now = new Date();
  return (
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, '0')}-` +
    `${String(now.getDate()).padStart(2, '0')}`
  );
}

function isValidDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

// ============================================================
// PARSE YYYYMMDD FROM FILENAME (anywhere)
// ============================================================

function parseDateFromFilename(filePath) {
  const filename = path.basename(filePath);

  const match = filename.match(/(?:^|[^0-9])(\d{4})(\d{2})(\d{2})(?:[^0-9]|$)/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (year >= 2000 && year <= 2100 && isValidDate(year, month, day)) {
      return (
        `${year}-` +
        `${String(month).padStart(2, '0')}-` +
        `${String(day).padStart(2, '0')}`
      );
    }
  }

  return getTodayDateString();
}

// ============================================================
// TRANSFER BY EXTENSION
// ============================================================

async function transferByExtension(mountPoint) {
  try {
    let hasMedia = false;

    for (const ext of CONFIG.extensions) {
      const listPath = `/tmp/files_${ext}.txt`;

      const findCmd = `find "${mountPoint}" -type f -iname "*.${ext}" > ${listPath}`;
      await execAsync(findCmd, EXEC_OPTIONS);

      if (fs.existsSync(listPath)) {
        const fileContent = fs.readFileSync(listPath, 'utf8').trim();

        if (fileContent.length > 0) {
          hasMedia = true;
          const filePaths = fileContent.split('\n');

          const filesByDate = {};

          for (const filePath of filePaths) {
            if (!filePath) continue;

            const dateFolder = parseDateFromFilename(filePath);

            if (!filesByDate[dateFolder]) {
              filesByDate[dateFolder] = [];
            }
            filesByDate[dateFolder].push(filePath);
          }

          for (const [dateFolder, paths] of Object.entries(filesByDate)) {
            const subFolder = path.join(
              CONFIG.destinationBase,
              dateFolder,
              ext.toLowerCase()
            );

            if (!fs.existsSync(subFolder)) {
              fs.mkdirSync(subFolder, { recursive: true });
            }

            const tempDateList = `/tmp/files_${ext}_${dateFolder}.txt`;
            fs.writeFileSync(tempDateList, paths.join('\n'));

            log(`Copying ${paths.length} ${ext} files to ${dateFolder}/${ext.toLowerCase()}...`);

            const rsyncCmd =
              `rsync -a ` +
              `--ignore-errors ` +
              `--no-relative ` +
              `--chmod=Du=rwx,Dg=rwx,Do=rx,Fu=rw,Fg=rw,Fo=r ` +
              `--files-from="${tempDateList}" ` +
              `/ ` +
              `"${subFolder}/" ` +
              `--bwlimit=0`;

            await execAsync(rsyncCmd, EXEC_OPTIONS);

            if (fs.existsSync(tempDateList)) {
              fs.unlinkSync(tempDateList);
            }
          }
        }

        if (fs.existsSync(listPath)) {
          fs.unlinkSync(listPath);
        }
      }
    }

    return hasMedia ? CONFIG.destinationBase : false;
  } catch (err) {
    log(`Transfer error: ${err.message}`);
    await nasBeep('error');
    return false;
  }
}

// ============================================================
// SD CARD MONITOR
// ============================================================

class SDCardMonitor {
  constructor() {
    this.processedDevices = new Set();
    this.isTransferring = false;
  }

  async checkForNewDevices() {
    if (this.isTransferring) return;

    const devices = await getMountedDevices();
    const currentMounts = devices.map(d => d.mountpoint);

    for (const dev of devices) {
      const isInSearchPath = CONFIG.searchPaths.some(p =>
        dev.mountpoint.startsWith(p)
      );

      if (
        (dev.isRemovable || isInSearchPath) &&
        !this.processedDevices.has(dev.mountpoint)
      ) {
        this.processedDevices.add(dev.mountpoint);

        log(`>>> Device Found: ${dev.mountpoint}`);
        await nasBeep('detect');

        this.isTransferring = true;
        await nasBeep('transfer-start');

        const finalDest = await transferByExtension(dev.mountpoint);

        await nasBeep('transfer-stop');

        if (finalDest) {
          log(`✓ Transfer Complete to Base Path: ${finalDest}`);
          await this.ejectDevice(dev.mountpoint);
        } else {
          this.isTransferring = false;
        }
      }
    }

    // Detect removed devices
    for (const oldMount of this.processedDevices) {
      if (!currentMounts.includes(oldMount)) {
        log(`<<< Device Removed: ${oldMount}`);
        this.processedDevices.delete(oldMount);
      }
    }
  }

  // ==========================================================
  // EJECT DEVICE
  // ==========================================================

  async ejectDevice(mountPoint) {
    try {
      await execAsync('sync', EXEC_OPTIONS);
      await new Promise(r => setTimeout(r, 1500));

      try {
        await execAsync(`umount "${mountPoint}"`, EXEC_OPTIONS);
      } catch (e) {
        log(`Normal umount failed, trying lazy: ${e.message}`);
        await execAsync(`umount -l "${mountPoint}"`, EXEC_OPTIONS);
      }

      try {
        await execAsync(`eject "${mountPoint}"`, EXEC_OPTIONS);
      } catch (e) {
        // Many NAS systems do not have eject command
      }

      log(`✓ Device ejected: ${mountPoint}`);
      await nasBeep('eject');
    } catch (err) {
      log(`Eject failed: ${err.message}`);
      await nasBeep('error');
    } finally {
      this.isTransferring = false;
    }
  }

  // ==========================================================
  // START
  // ==========================================================

  start() {
    log('SD Monitor v2.6 (Config + Arcade UI + YYYYMMDD) started.');

    setInterval(() => this.checkForNewDevices(), CONFIG.checkInterval);
    this.checkForNewDevices();
  }
}

// ============================================================
// ENTRY POINT
// ============================================================

const monitor = new SDCardMonitor();
monitor.start();
