#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// High buffer limit for cards with thousands of files (10MB)
const EXEC_OPTIONS = {
  maxBuffer: 1024 * 1024 * 10
};

const CONFIG = {
  checkInterval: 5000,
  searchPaths: ['/mnt'],
  destinationBase: '/volume1/temporary',
  logFile: '/var/log/sd-card-transfer.log',

  // Original extensions + audio
  extensions: [
    'mp4',
    'mov',
    'mxf',

    'jpg',
    'jpeg',
    'png',

    'arw',
    'cr2',
    'cr3',
    'dng',

    // Audio
    'wav',
    'mp3',
    'm4a',
    'aac',
    'ogg',
    'flac'
  ]
};

let transferBeepInterval = null;


/*
async function nasBeep(type = 'short') {
  try {
    if (type === 'detect') {
      await execAsync('echo -e "\\a" > /dev/console && sleep 0.3 && echo -e "\\a" > /dev/console', EXEC_OPTIONS);
    }
    else if (type === 'eject') {
      await execAsync('echo -e "\\a" > /dev/console && sleep 1.5 && echo -e "\\a" > /dev/console', EXEC_OPTIONS);
    }
    else if (type === 'transfer-start') {
      if (transferBeepInterval) clearInterval(transferBeepInterval);
      transferBeepInterval = setInterval(async () => {
        try {
          await execAsync('echo -e "\\a" > /dev/console && sleep 0.1 && echo -e "\\a" > /dev/console && sleep 0.8', EXEC_OPTIONS);
        } catch (err) {}
      }, 1500);
    }
    else if (type === 'transfer-stop') {
      if (transferBeepInterval) {
        clearInterval(transferBeepInterval);
        transferBeepInterval = null;
      }
    }
    else {
      await execAsync('echo -e "\\a" > /dev/console');
    }
  } catch (err) {}
}
*/


// ============================================================
// MARIO SOUND
// KEKAL DARI SCRIPT ASAL
// ============================================================

async function nasBeep(type = 'short') {
  try {

    if (type === 'detect') {

      // Bunyi Coin Mario bila SD card dikesan
      await execAsync(
        'beep -f 988 -l 80 -D 80 -n -f 1319 -l 250',
        EXEC_OPTIONS
      );

    }

    else if (type === 'eject') {

      // Melodi Flagpole / Level Clear bila siap transfer
      const clearTune =
        'beep ' +
        '-f 262 -l 80 -D 30 ' +
        '-n -f 330 -l 80 -D 30 ' +
        '-n -f 392 -l 80 -D 30 ' +
        '-n -f 523 -l 80 -D 30 ' +
        '-n -f 659 -l 80 -D 30 ' +
        '-n -f 784 -l 200 -D 100 ' +
        '-n -f 659 -l 200 -D 100 ' +
        '-n -f 784 -l 300';

      await execAsync(
        clearTune,
        EXEC_OPTIONS
      );

    }

    else if (type === 'transfer-start') {

      if (transferBeepInterval) {
        clearInterval(transferBeepInterval);
      }

      const playMarioLongTheme = async () => {

        try {

          // --- INTRO ICONIC ---
          const intro =
            'beep ' +
            '-f 659 -l 100 -D 80 ' +
            '-n -f 659 -l 100 -D 180 ' +
            '-n -f 659 -l 100 -D 180 ' +
            '-n -f 523 -l 100 -D 80 ' +
            '-n -f 659 -l 100 -D 180 ' +
            '-n -f 784 -l 150 -D 380 ' +
            '-n -f 392 -l 150 -D 380';


          // --- VERSE 1 (C Major Tune) ---
          const verse1 =
            '-n -f 523 -l 120 -D 200 ' +
            '-n -f 392 -l 120 -D 200 ' +
            '-n -f 330 -l 120 -D 200 ' +
            '-n -f 440 -l 100 -D 100 ' +
            '-n -f 494 -l 100 -D 100 ' +
            '-n -f 466 -l 100 -D 80 ' +
            '-n -f 440 -l 120 -D 120';


          // --- VERSE 2 (Triplets & Bounce) ---
          const verse2 =
            '-n -f 392 -l 100 -D 60 ' +
            '-n -f 659 -l 100 -D 60 ' +
            '-n -f 784 -l 100 -D 60 ' +
            '-n -f 880 -l 120 -D 100 ' +
            '-n -f 698 -l 100 -D 60 ' +
            '-n -f 784 -l 100 -D 100 ' +
            '-n -f 659 -l 120 -D 100 ' +
            '-n -f 523 -l 100 -D 60 ' +
            '-n -f 587 -l 100 -D 60 ' +
            '-n -f 494 -l 140';


          const fullCommand =
            `${intro} ${verse1} ${verse2}`;


          await execAsync(
            fullCommand,
            EXEC_OPTIONS
          );

        } catch (err) {}

      };


      // Main melody
      playMarioLongTheme();

      // Repeat every 9 seconds
      transferBeepInterval =
        setInterval(
          playMarioLongTheme,
          9000
        );

    }

    else if (type === 'transfer-stop') {

      if (transferBeepInterval) {

        clearInterval(
          transferBeepInterval
        );

        transferBeepInterval = null;
      }

    }

    else if (type === 'error') {

      await execAsync(
        'beep -f 500 -l 150 -D 50 -n -f 400 -l 150 -D 50 -n -f 300 -l 300',
        EXEC_OPTIONS
      );

    }

  } catch (err) {
    // Sound failure must never stop the transfer
  }
}


/* */


// ============================================================
// LOG
// ============================================================

function log(message) {

  const timestamp =
    new Date().toISOString();

  const logMessage =
    `[${timestamp}] ${message}\n`;

  console.log(
    logMessage.trim()
  );

  try {

    fs.appendFileSync(
      CONFIG.logFile,
      logMessage
    );

  } catch (e) {}
}


// ============================================================
// GET MOUNTED DEVICES
// KEKAL PARSER ASAL
// ============================================================

async function getMountedDevices() {

  try {

    const { stdout } =
      await execAsync(
        'lsblk -rno MOUNTPOINT,RM',
        EXEC_OPTIONS
      );

    return stdout
      .trim()
      .split('\n')
      .map(line => {

        const [mountpoint, isRemovable] =
          line.split(' ');

        return {
          mountpoint,
          isRemovable: isRemovable === '1'
        };

      })
      .filter(dev =>
        dev.mountpoint &&
        dev.mountpoint.length > 1
      );

  } catch (err) {

    return [];
  }
}


// ============================================================
// TODAY DATE
// ============================================================

function getTodayDateString() {

  const now =
    new Date();

  return (
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, '0')}-` +
    `${String(now.getDate()).padStart(2, '0')}`
  );
}


// ============================================================
// VALIDATE DATE
// ============================================================

function isValidDate(
  year,
  month,
  day
) {

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}


// ============================================================
// PARSE DATE FROM FILENAME
//
// Detect YYYYMMDD ANYWHERE in filename.
//
// Examples:
//
// 20260818_xxx.wav
// DJI_01_20260818_xxx.wav
// IMG_20260818_123456.jpg
// C001_20260818_AUDIO.flac
//
// ============================================================

function parseDateFromFilename(filePath) {

  const filename =
    path.basename(filePath);


  // Detect YYYYMMDD anywhere.
  //
  // The non-number boundaries prevent
  // accidentally extracting 8 digits from
  // a longer number.

  const match =
    filename.match(
      /(?:^|[^0-9])(\d{4})(\d{2})(\d{2})(?:[^0-9]|$)/
    );


  if (match) {

    const year =
      Number(match[1]);

    const month =
      Number(match[2]);

    const day =
      Number(match[3]);


    // Validate actual calendar date
    if (
      year >= 2000 &&
      year <= 2100 &&
      isValidDate(
        year,
        month,
        day
      )
    ) {

      return (
        `${year}-` +
        `${String(month).padStart(2, '0')}-` +
        `${String(day).padStart(2, '0')}`
      );
    }
  }


  // No valid YYYYMMDD found
  // → use today's date
  return getTodayDateString();
}


// ============================================================
// TRANSFER BY EXTENSION
// ============================================================

async function transferByExtension(
  mountPoint
) {

  try {

    let hasMedia = false;


    // IMPORTANT:
    // Original script had nasBeep('medium')
    // but there is no "medium" handler.
    // So it does nothing and is removed.


    for (
      const ext of CONFIG.extensions
    ) {

      const listPath =
        `/tmp/files_${ext}.txt`;


      // ------------------------------------------------------
      // Find files
      // ------------------------------------------------------

      const findCmd =
        `find "${mountPoint}" -type f -iname "*.${ext}" > ${listPath}`;


      await execAsync(
        findCmd,
        EXEC_OPTIONS
      );


      if (
        fs.existsSync(listPath)
      ) {

        const fileContent =
          fs.readFileSync(
            listPath,
            'utf8'
          ).trim();


        if (
          fileContent.length > 0
        ) {

          hasMedia = true;

          const filePaths =
            fileContent.split('\n');


          // --------------------------------------------------
          // Group files by date
          // --------------------------------------------------

          const filesByDate = {};


          for (
            const filePath
            of filePaths
          ) {

            if (!filePath) {
              continue;
            }


            const dateFolder =
              parseDateFromFilename(
                filePath
              );


            if (
              !filesByDate[dateFolder]
            ) {

              filesByDate[dateFolder] = [];
            }


            filesByDate[dateFolder].push(
              filePath
            );
          }


          // --------------------------------------------------
          // Process each date
          // --------------------------------------------------

          for (
            const [
              dateFolder,
              paths
            ]
            of Object.entries(
              filesByDate
            )
          ) {

            const subFolder =
              path.join(
                CONFIG.destinationBase,
                dateFolder,
                ext.toLowerCase()
              );


            if (
              !fs.existsSync(
                subFolder
              )
            ) {

              fs.mkdirSync(
                subFolder,
                {
                  recursive: true
                }
              );
            }


            const tempDateList =
              `/tmp/files_${ext}_${dateFolder}.txt`;


            fs.writeFileSync(
              tempDateList,
              paths.join('\n')
            );


            log(
              `Copying ${paths.length} ${ext} files to ${dateFolder}/${ext.toLowerCase()}...`
            );


            // ------------------------------------------------
            // RSYNC
            // KEKAL COMMAND ASAL
            // ------------------------------------------------

            const rsyncCmd =
              `rsync -a ` +
              `--ignore-errors ` +
              `--no-relative ` +
              `--chmod=Du=rwx,Dg=rwx,Do=rx,Fu=rw,Fg=rw,Fo=r ` +
              `--files-from="${tempDateList}" ` +
              `/ ` +
              `"${subFolder}/" ` +
              `--bwlimit=0`;


            await execAsync(
              rsyncCmd,
              EXEC_OPTIONS
            );


            if (
              fs.existsSync(
                tempDateList
              )
            ) {

              fs.unlinkSync(
                tempDateList
              );
            }
          }
        }


        if (
          fs.existsSync(listPath)
        ) {

          fs.unlinkSync(
            listPath
          );
        }
      }
    }


    return hasMedia
      ? CONFIG.destinationBase
      : false;


  } catch (err) {

    log(
      `Transfer error: ${err.message}`
    );

    await nasBeep(
      'error'
    );

    return false;
  }
}


// ============================================================
// SD CARD MONITOR
// KEKAL FLOW ASAL
// ============================================================

class SDCardMonitor {

  constructor() {

    this.processedDevices =
      new Set();

    this.isTransferring =
      false;
  }


  async checkForNewDevices() {

    if (
      this.isTransferring
    ) {

      return;
    }


    const devices =
      await getMountedDevices();


    const currentMounts =
      devices.map(
        d => d.mountpoint
      );


    for (
      const dev of devices
    ) {

      const isInSearchPath =
        CONFIG.searchPaths.some(
          p =>
            dev.mountpoint.startsWith(p)
        );


      if (
        (dev.isRemovable ||
          isInSearchPath) &&
        !this.processedDevices.has(
          dev.mountpoint
        )
      ) {

        this.processedDevices.add(
          dev.mountpoint
        );


        log(
          `>>> Device Found: ${dev.mountpoint}`
        );


        // Mario Coin
        await nasBeep(
          'detect'
        );


        this.isTransferring =
          true;


        // Mario transfer melody
        await nasBeep(
          'transfer-start'
        );


        const finalDest =
          await transferByExtension(
            dev.mountpoint
          );


        // Stop melody
        await nasBeep(
          'transfer-stop'
        );


        if (finalDest) {

          log(
            `✓ Transfer Complete to Base Path: ${finalDest}`
          );


          await this.ejectDevice(
            dev.mountpoint
          );

        }

        else {

          await nasBeep(
            'transfer-stop'
          );

          this.isTransferring =
            false;
        }
      }
    }


    // --------------------------------------------------------
    // Detect removed device
    // --------------------------------------------------------

    for (
      const oldMount
      of this.processedDevices
    ) {

      if (
        !currentMounts.includes(
          oldMount
        )
      ) {

        log(
          `<<< Device Removed: ${oldMount}`
        );

        this.processedDevices.delete(
          oldMount
        );
      }
    }
  }


  // ==========================================================
  // EJECT
  // ==========================================================
/*
  async ejectDevice(
    mountPoint
  ) {

    try {

      await execAsync(
        `sync`,
        EXEC_OPTIONS
      );


      await new Promise(
        r =>
          setTimeout(
            r,
            2000
          )
      );


      await execAsync(
        `umount -l "${mountPoint}"`,
        EXEC_OPTIONS
      );


      await nasBeep(
        'eject'
      );


    } catch (err) {

      log(
        `Eject failed: ${err.message}`
      );

    } finally {

      this.isTransferring =
        false;
    }
  }
*/
async ejectDevice(mountPoint) {
  try {
    // 1. Pastikan semua data dah flush
    await execAsync('sync', EXEC_OPTIONS);
    await new Promise(r => setTimeout(r, 1500));

    // 2. Cuba umount normal dulu
    try {
      await execAsync(`umount "${mountPoint}"`, EXEC_OPTIONS);
    } catch (e) {
      // Kalau busy, cuba lazy
      log(`Normal umount failed, trying lazy: ${e.message}`);
      await execAsync(`umount -l "${mountPoint}"`, EXEC_OPTIONS);
    }

    // 3. Cuba eject sebenar (jika command wujud)
    try {
      await execAsync(`eject "${mountPoint}"`, EXEC_OPTIONS);
    } catch (e) {
      // Optional – ramai NAS tak ada command eject
      log(`eject command not available or failed: ${e.message}`);
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

    log(
      'SD Monitor v2.4 (Audio + YYYYMMDD Anywhere) started.'
    );


    setInterval(
      () =>
        this.checkForNewDevices(),
      CONFIG.checkInterval
    );


    // IMPORTANT:
    // Original script checks immediately on startup.
    // Jangan tunggu 5 saat.
    this.checkForNewDevices();
  }
}


// ============================================================
// START MONITOR
// ============================================================

const monitor =
  new SDCardMonitor();

monitor.start();
