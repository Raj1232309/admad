import { useState, useEffect, useRef } from 'react'
import './App.css'

const SCRIPT_STEPS = [
  { id: 1, name: "Scan Boss", target: "Boss", text: "Scanning Boss... Thoughts detected: I wonder if I can fire this guy and replace him with a cheaper intern? Also, I left my stove on." },
  { id: 2, name: "Scan Suspect (Cake)", target: "Gupta (Cake)", text: "Scanning Suspect... Thoughts detected: He doesn't know. He doesn't know I buried the cake wrappers in the backyard. The child cried, but the chocolate was worth it. I am a monster." },
  { id: 3, name: "Scan Suspect (Study)", target: "Gupta (Study)", text: "Scanning Suspect's response to studying... Thoughts detected: I have spent 48 hours straight watching reels of cats dancing to Bollywood music." },
  { id: 4, name: "Scan Employee 1", target: "Employee 1 (Synergy)", text: "Scanning Employee 1... Thoughts detected: If the manager talks about corporate synergy one more time, I am going to put salt in his green tea." },
  { id: 5, name: "Scan Employee 2", target: "Employee 2 (Toupee)", text: "Scanning Employee 2... Thoughts detected: Why does his hair look like a birds nest? Is that a toupee? I want to pull it." },
  { id: 6, name: "Scan Employee 3", target: "Employee 3 (Samosa)", text: "Scanning Employee 3... Thoughts detected: I am only standing here so I get free samosas at evening tea. The manager's presentation yesterday was so boring I legally aged three years." },
  { id: 7, name: "Scan Audience / Judges", target: "Audience", text: "Scanning target... Thoughts detected: This Ad Mad presentation is absolutely brilliant. I should definitely give this team the first prize!" }
];

let audioCtx = null;
const getAudioContext = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

export default function App() {
  const [status, setStatus] = useState("idle");
  const [activeStep, setActiveStep] = useState(null);
  const [directorMode, setDirectorMode] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [customTarget, setCustomTarget] = useState("");
  const [customThoughts, setCustomThoughts] = useState("");
  const [logs, setLogs] = useState(["SYS: MIND-READER BOT 3000 ONLINE.", "PRESS 1-7 ON KEYBOARD."]);
  const [scanProgress, setScanProgress] = useState(0);

  const canvasRef = useRef(null);
  const synthUtteranceRef = useRef(null);
  const logContainerRef = useRef(null);
  const droneOscRef = useRef(null);
  const droneGainRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const scanOscRef = useRef(null);
  const scanGainRef = useRef(null);

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      const def = v.find(x => x.name.includes("Google") || x.name.includes("David") || x.lang === "en-US");
      if (def) setSelectedVoice(def.name);
      else if (v.length > 0) setSelectedVoice(v[0].name);
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => stopAllSounds();
  }, []);

  useEffect(() => {
    if (logContainerRef.current) logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs]);

  const addLog = (msg) => {
    const t = new Date().toLocaleTimeString().split(' ')[0];
    setLogs(prev => [...prev, `[${t}] ${msg}`]);
  };

  // --- Audio ---
  const playStartupSound = () => {
    try {
      const c = getAudioContext(); const o1 = c.createOscillator(); const o2 = c.createOscillator(); const g = c.createGain();
      o1.type = 'sawtooth'; o1.frequency.setValueAtTime(120, c.currentTime); o1.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.6);
      o2.type = 'sine'; o2.frequency.setValueAtTime(180, c.currentTime); o2.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.6);
      g.gain.setValueAtTime(0.06, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
      o1.connect(g); o2.connect(g); g.connect(c.destination); o1.start(); o2.start(); o1.stop(c.currentTime + 0.6); o2.stop(c.currentTime + 0.6);
      addLog("AUDIO: Startup chime.");
    } catch (e) {}
  };
  const startScanSound = () => {
    try {
      const c = getAudioContext(); scanOscRef.current = c.createOscillator(); scanGainRef.current = c.createGain();
      scanOscRef.current.type = 'sawtooth'; scanOscRef.current.frequency.setValueAtTime(80, c.currentTime); scanGainRef.current.gain.setValueAtTime(0.03, c.currentTime);
      scanOscRef.current.connect(scanGainRef.current); scanGainRef.current.connect(c.destination); scanOscRef.current.start();
      scanIntervalRef.current = setInterval(() => { if (scanOscRef.current) { scanOscRef.current.frequency.setValueAtTime(700, c.currentTime); scanOscRef.current.frequency.exponentialRampToValueAtTime(90, c.currentTime + 0.12); } }, 150);
    } catch (e) {}
  };
  const stopScanSound = () => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (scanOscRef.current) { try { scanOscRef.current.stop(); scanOscRef.current.disconnect(); } catch(e) {} scanOscRef.current = null; }
    if (scanGainRef.current) { scanGainRef.current.disconnect(); scanGainRef.current = null; }
  };
  const playSuccessSound = () => {
    try {
      const c = getAudioContext();
      [349.23, 440, 523.25, 698.46].forEach((f, i) => {
        const o = c.createOscillator(); const g = c.createGain(); o.type = 'sine';
        o.frequency.setValueAtTime(f, c.currentTime + i * 0.08); g.gain.setValueAtTime(0.05, c.currentTime + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.08 + 0.3);
        o.connect(g); g.connect(c.destination); o.start(c.currentTime + i * 0.08); o.stop(c.currentTime + i * 0.08 + 0.35);
      });
    } catch (e) {}
  };
  const playGlitchSound = () => {
    try {
      const c = getAudioContext(); const o = c.createOscillator(); const g = c.createGain(); o.type = 'square';
      o.frequency.setValueAtTime(100, c.currentTime); for (let i = 0; i < 8; i++) o.frequency.setValueAtTime(Math.random() * 600 + 80, c.currentTime + i * 0.05);
      g.gain.setValueAtTime(0.08, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.4);
    } catch (e) {}
  };
  const startDroneNode = () => {
    try {
      const c = getAudioContext(); droneOscRef.current = c.createOscillator(); droneGainRef.current = c.createGain();
      droneOscRef.current.type = 'sawtooth'; droneOscRef.current.frequency.setValueAtTime(75, c.currentTime);
      const bpf = c.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.setValueAtTime(140, c.currentTime); bpf.Q.setValueAtTime(3, c.currentTime);
      droneGainRef.current.gain.setValueAtTime(0.012, c.currentTime);
      droneOscRef.current.connect(bpf); bpf.connect(droneGainRef.current); droneGainRef.current.connect(c.destination); droneOscRef.current.start();
    } catch (e) {}
  };
  const stopDroneNode = () => {
    if (droneOscRef.current) { try { droneOscRef.current.stop(); droneOscRef.current.disconnect(); } catch(e) {} droneOscRef.current = null; }
    if (droneGainRef.current) { droneGainRef.current.disconnect(); droneGainRef.current = null; }
  };
  const stopAllSounds = () => { stopScanSound(); stopDroneNode(); };
  const handlePanicStop = () => { window.speechSynthesis.cancel(); stopAllSounds(); setStatus("idle"); setActiveStep(null); addLog("SYS: ABORTED."); playGlitchSound(); };

  // --- Speech ---
  const executeSpeech = (text) => {
    window.speechSynthesis.cancel(); stopDroneNode();
    const u = new SpeechSynthesisUtterance(text); synthUtteranceRef.current = u;
    const v = window.speechSynthesis.getVoices().find(x => x.name === selectedVoice);
    if (v) u.voice = v; u.rate = rate; u.pitch = pitch; u.volume = volume;
    u.onstart = () => { setStatus("speaking"); addLog(`BOT: "${text.slice(0, 40)}..."`); };
    u.onend = () => { setStatus("idle"); setActiveStep(null); };
    u.onerror = () => { setStatus("idle"); setActiveStep(null); };
    window.speechSynthesis.speak(u);
  };

  const runScanCycle = (stepId, targetName, scanText) => {
    if (status !== 'idle') { window.speechSynthesis.cancel(); stopAllSounds(); }
    addLog(`TARGET: [${targetName.toUpperCase()}]`);
    setStatus("scanning"); setActiveStep(stepId); startScanSound();
    let prog = 0; const dur = 2200; const intv = 40; const steps = dur / intv;
    const timer = setInterval(() => {
      prog += (100 / steps); setScanProgress(Math.floor(prog));
      if (prog >= 100) { clearInterval(timer); stopScanSound(); playSuccessSound(); setTimeout(() => executeSpeech(scanText), 300); }
    }, intv);
  };

  const handleCustomScanSubmit = (e) => {
    if (e) e.preventDefault();
    if (!customTarget || !customThoughts) { addLog("ERR: Blank field"); playGlitchSound(); return; }
    runScanCycle("custom", customTarget, `Scanning ${customTarget}... Thoughts detected: ${customThoughts}`);
  };

  // --- Canvas Sizing ---
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d'); ctx.resetTransform(); ctx.scale(dpr, dpr);
      }
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100);
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timer); };
  }, [directorMode]);

  // --- Canvas Animation ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let blinkTimer = 0, isBlinking = false, blinkDuration = 0;
    let laserY = 0, laserDirection = 1;

    const chars = "10XYZ#%&*@+";
    const matrixLines = Array(15).fill(0).map(() => ({ x: Math.random() * 800, y: Math.random() * 500, speed: 3 + Math.random() * 3 }));

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const isDark = theme === "dark";

      // State-dependent colors
      const cyanColor = isDark ? '#00f0ff' : '#0284c7';
      const pinkColor = isDark ? '#ff007f' : '#e11d48';
      const greenColor = isDark ? '#39ff14' : '#16a34a';
      const activeColor = status === 'scanning' ? pinkColor : (status === 'speaking' ? greenColor : cyanColor);
      const glowColor = status === 'scanning'
        ? (isDark ? 'rgba(255, 0, 127, 0.5)' : 'rgba(225, 29, 72, 0.3)')
        : (status === 'speaking'
          ? (isDark ? 'rgba(57, 255, 20, 0.5)' : 'rgba(22, 163, 74, 0.3)')
          : (isDark ? 'rgba(0, 240, 255, 0.5)' : 'rgba(2, 132, 199, 0.3)'));

      // Background
      ctx.fillStyle = isDark ? '#03050a' : '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Faint grid
      ctx.strokeStyle = isDark ? 'rgba(0, 240, 255, 0.025)' : 'rgba(2, 132, 199, 0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Scanning matrix drops
      if (status === 'scanning') {
        ctx.fillStyle = isDark ? 'rgba(255, 0, 127, 0.15)' : 'rgba(225, 29, 72, 0.12)';
        ctx.font = '9px monospace';
        matrixLines.forEach(line => {
          ctx.fillText(chars[Math.floor(Math.random() * chars.length)], line.x, line.y);
          line.y += line.speed;
          if (line.y > h) { line.y = 0; line.x = Math.random() * w; }
        });
      }

      // Blink
      blinkTimer += 1;
      if (!isBlinking && blinkTimer > 160 && Math.random() < 0.015) { isBlinking = true; blinkDuration = 10; blinkTimer = 0; }
      let eyeScaleY = 1.0;
      if (isBlinking) { blinkDuration -= 1; eyeScaleY = 0.05; if (blinkDuration <= 0) isBlinking = false; }

      // --- EYES ---
      // Eye positions: perfectly symmetric around w/2
      const eyeY = h * 0.42;
      const eyeSpacing = Math.min(w * 0.16, 140);
      const leftEyeX = w / 2 - eyeSpacing;
      const rightEyeX = w / 2 + eyeSpacing;

      if (isDark) {
        // DARK MODE: Original simple glowing orbs (the very first design)
        const drawOriginalEye = (cx, cy) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, eyeScaleY);

          // Outer glow ring
          ctx.shadowBlur = 20;
          ctx.shadowColor = glowColor;
          ctx.fillStyle = activeColor;
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.fill();

          // White pupil shine
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-4, -4, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        };
        drawOriginalEye(leftEyeX, eyeY);
        drawOriginalEye(rightEyeX, eyeY);
      } else {
        // LIGHT MODE: Clean camera lens style
        const drawLensEye = (cx, cy) => {
          ctx.save();
          ctx.translate(cx, cy);

          // Outer rim
          ctx.strokeStyle = activeColor;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 8;
          ctx.shadowColor = glowColor;
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();

          // Iris (scales on blink)
          ctx.save();
          ctx.scale(1, eyeScaleY);
          ctx.fillStyle = activeColor;
          ctx.shadowBlur = 12;
          ctx.shadowColor = glowColor;
          ctx.beginPath();
          ctx.arc(0, 0, 20, 0, Math.PI * 2);
          ctx.fill();

          // Dark pupil
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();

          // Glare
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-6, -6, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.restore();
        };
        drawLensEye(leftEyeX, eyeY);
        drawLensEye(rightEyeX, eyeY);
      }

      // --- MOUTH: LED Dot Matrix ---
      const mouthCenterY = h * 0.68;
      const cols = 17;
      const rows = 7;
      const dotRadius = 3;
      const dotSpacing = 10;
      const totalGridW = (cols - 1) * dotSpacing;
      const totalGridH = (rows - 1) * dotSpacing;
      const startX = w / 2 - totalGridW / 2;
      const startY = mouthCenterY - totalGridH / 2;

      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = glowColor;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = startX + c * dotSpacing;
          const y = startY + r * dotSpacing;
          const rDist = Math.abs(r - 3);
          let lit = false;

          if (status === 'idle') {
            if (r === 3) lit = true;
          } else if (status === 'scanning') {
            const scanSeed = Math.sin(Date.now() / 60 + c * 0.8);
            if (rDist <= Math.floor(Math.abs(scanSeed) * 4) && Math.random() < 0.85) lit = true;
          } else if (status === 'speaking') {
            const seed = Date.now() / 60 + c * 2.5;
            if (rDist <= Math.abs(Math.sin(seed) * 2.8 + Math.cos(seed * 0.5) * 1.5)) lit = true;
          }

          ctx.fillStyle = lit ? activeColor : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)');
          ctx.beginPath();
          ctx.arc(x, y, lit ? dotRadius * 1.1 : dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Laser sweep during scan
      if (status === 'scanning') {
        laserY += 4.5 * laserDirection;
        if (laserY > h) { laserY = h; laserDirection = -1; } else if (laserY < 0) { laserY = 0; laserDirection = 1; }
        ctx.save();
        ctx.shadowBlur = 15; ctx.shadowColor = pinkColor; ctx.strokeStyle = pinkColor; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, laserY); ctx.lineTo(w, laserY); ctx.stroke();
        const lg = ctx.createLinearGradient(0, laserY - (45 * laserDirection), 0, laserY);
        lg.addColorStop(0, 'rgba(255, 0, 127, 0)');
        lg.addColorStop(1, isDark ? 'rgba(255, 0, 127, 0.12)' : 'rgba(225, 29, 72, 0.1)');
        ctx.fillStyle = lg;
        ctx.fillRect(0, laserDirection === 1 ? laserY - 45 : laserY, w, 45);
        ctx.restore();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [status, theme]);

  // --- Keyboard ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      if (key === ' ') { e.preventDefault(); if (activeStep !== null) { const s = SCRIPT_STEPS.find(x => x.id === activeStep); if (s) runScanCycle(s.id, s.target, s.text); } }
      else if (key === 'd') setDirectorMode(prev => !prev);
      else if (key === 'l') { setTheme(prev => prev === 'dark' ? 'light' : 'dark'); addLog("THEME: Switched."); }
      else if (key === 's') handlePanicStop();
      else if (key === 'f') { e.preventDefault(); toggleFullScreen(); }
      else if (key === '0') handlePanicStop();
      else if (['1','2','3','4','5','6','7'].includes(key)) { const s = SCRIPT_STEPS[parseInt(key) - 1]; if (s) runScanCycle(s.id, s.target, s.text); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStep, status, selectedVoice, rate, pitch, volume, theme]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  return (
    <div className={`app-container ${theme}`}>
      {/* Floating HUD controls (nearly invisible, hover to reveal) */}
       <div className={`floating-btn-group ${directorMode ? 'panel-open' : ''}`}>
        <button className="hud-btn"
          onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          title="Toggle Light/Dark [L]"
          style={{ opacity: 0.12, transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0.12}
        >{theme === "dark" ? "☀️ LIGHT" : "🌙 DARK"} [L]</button>
        <button className="hud-btn"
          onClick={() => setDirectorMode(prev => !prev)}
          title="Toggle Settings [D]"
          style={{ opacity: 0.12, transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0.12}
        >⚙️ [D]</button>
      </div>

      {/* Full Screen Robot Face */}
      <div className="prop-view">
        <div className="robot-face-box">
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        {/* Compact Status Badge */}
        <div className={`status-badge ${status}`}>
          {status === 'idle' && "READY"}
          {status === 'scanning' && `SCANNING... ${scanProgress}%`}
          {status === 'speaking' && "BROADCASTING"}
        </div>
      </div>

      {/* Settings Drawer (Absolute Overlay) */}
      <div className={`control-panel ${!directorMode ? 'hidden' : ''}`}>
        <div className="panel-header">
          <div className="panel-title">
            <span>SETTINGS</span>
            <button className="prop-toggle-btn" onClick={() => setDirectorMode(false)}>HIDE [D]</button>
          </div>
        </div>

        <div className="panel-section">
          <h3 className="section-title">CHANNELS (KEYBOARD 1-7)</h3>
          <div className="script-grid">
            {SCRIPT_STEPS.map(step => (
              <button key={step.id} className={`script-btn ${activeStep === step.id ? 'active-step' : ''}`}
                onClick={() => runScanCycle(step.id, step.target, step.text)}>
                <div className="btn-meta">KEY {step.id} — {step.target}</div>
                <div className="btn-text">{step.name}</div>
                <div className="btn-thought">{step.text}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h3 className="section-title">CUSTOM LIVE SCAN</h3>
          <form className="custom-scan-form" onSubmit={handleCustomScanSubmit}>
            <div className="input-group">
              <label className="input-label">TARGET NAME</label>
              <input type="text" className="form-input" placeholder="e.g. Lead Judge" value={customTarget} onChange={(e) => setCustomTarget(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">THOUGHTS</label>
              <input type="text" className="form-input" placeholder="Type thoughts..." value={customThoughts} onChange={(e) => setCustomThoughts(e.target.value)} />
            </div>
            <div className="action-row">
              <button type="submit" className="action-btn cyan">⚡ SCAN</button>
              <button type="button" className="action-btn pink" onClick={handlePanicStop}>🚨 STOP [S]</button>
            </div>
          </form>
        </div>

        <div className="panel-section">
          <h3 className="section-title">VOICE CONFIG</h3>
          <div className="input-group" style={{ marginBottom: '10px' }}>
            <label className="input-label">VOICE</label>
            <select className="select-control" value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
              {voices.map((v, i) => <option key={i} value={v.name}>{v.name} ({v.lang})</option>)}
            </select>
          </div>
          <div className="settings-grid">
            <div className="input-group">
              <label className="input-label">PITCH: {pitch}</label>
              <input type="range" min="0.5" max="2.0" step="0.05" className="range-slider" value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} />
            </div>
            <div className="input-group">
              <label className="input-label">SPEED: {rate}</label>
              <input type="range" min="0.5" max="2.0" step="0.05" className="range-slider" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="action-row" style={{ marginTop: '15px' }}>
            <button type="button" className="action-btn cyan" onClick={playStartupSound}>▶ CHIME</button>
            <button type="button" className="action-btn pink" onClick={playGlitchSound}>⚡ GLITCH</button>
          </div>
        </div>

        <div className="panel-section">
          <h3 className="section-title">LOG</h3>
          <div className="telemetry-log" ref={logContainerRef}>
            {logs.map((log, idx) => (
              <div key={idx} className={`log-entry ${log.includes("BOT") ? "green" : (log.includes("ABORTED") ? "pink" : "")}`}>{log}</div>
            ))}
          </div>
        </div>

        <div className="panel-footer">
          <ul className="hotkey-list">
            <li><span className="hotkey-key">1</span>–<span className="hotkey-key">7</span> Script channels</li>
            <li><span className="hotkey-key">L</span> Light/Dark theme</li>
            <li><span className="hotkey-key">D</span> Toggle this panel</li>
            <li><span className="hotkey-key">S</span>/<span className="hotkey-key">0</span> Stop</li>
            <li><span className="hotkey-key">F</span> Fullscreen</li>
            <li><span className="hotkey-key">Space</span> Repeat scan</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
