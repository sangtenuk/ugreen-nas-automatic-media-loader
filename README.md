<header>
      <h1>Ugreen NAS Automatic Media Loader</h1>
      <p>Automatically detect, organize, and transfer media from your SD cards and USB drives — completely hands-free.</p>
    </header>
<br>

    
<h3>⚡ Instant Device Detection</h3>
<p>Scans every 5 seconds for newly inserted SD cards and removable drives. Works with standard <code>/mnt</code> mount points and removable media.</p>
<br>

<h3>🕹️ Arcade-Style Sound Feedback</h3>
<p>Classic arcade UI tones for every stage:</p>
<ul>
<li>Coin sound when a card is detected</li>
<li>Continuous arcade loop during transfer</li>
<li>Success jingle when complete</li>
<li>Error tones if something goes wrong</li>
</ul>
<br>

<h3>📁 Smart Media Recognition</h3>
<p>Supports a wide range of professional and consumer formats:</p>
<ul>
<li><strong>Video</strong> → mp4, mov, mxf</li>
<li><strong>Photos</strong> → jpg, jpeg, png</li>
<li><strong>RAW</strong> → arw, cr2, cr3, dng</li>
<li><strong>Audio</strong> → wav, mp3, m4a, aac, ogg, flac</li>
</ul>
<br>

<h3>📅 Intelligent Date-Based Organization</h3>
<p>Automatically extracts the shooting date (<code>YYYYMMDD</code>) from anywhere in the filename. Files are sorted into clean folders:</p>
<ul>
<li><code>/volume1/temporary/2026-08-18/mp4/</code></li>
<li><code>/volume1/temporary/2026-08-18/wav/</code></li>
<li>…and so on</li>
</ul>
<br>

<h3>🚀 High-Speed Reliable Transfer</h3>
<p>Uses optimized <code>rsync</code> with proper permissions, error tolerance, and no bandwidth limits. Handles cards containing thousands of files without issues.</p>

<h3>🔌 Safe Auto-Eject</h3>
<p>After transfer finishes:</p>
<ul>
<li>Forces data sync</li>
<li>Unmounts the drive cleanly</li>
<li>Attempts proper eject</li>
<li>Plays success sound</li>
</ul>
<br>

<h3>🛡️ Background Protection</h3>
<p>Prevents overlapping transfers. Tracks inserted and removed devices so the same card is never processed twice.</p>
<br>

<h3>📋 Full Activity Logging</h3>
<p>Every action is logged with timestamps to both the console and <code>/var/log/sd-card-transfer.log</code>.</p>
<br>

<footer>
<p><strong>Just insert the card. Walk away.</strong><br>
Your media is already sorted and ready.</p>
</footer>

  </div>
</body>
</html>
