import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const DEFAULT_SCANS = [
  { id: "1", target: "Boss", name: "The Pitch Test", key: "1", text: "Thoughts detected: I wonder if I can fire this guy and replace him with a cheaper intern? Also, I left my stove on." },
  { id: "2", target: "Student 1", name: "Scene 1", key: "2", text: "Thoughts detected: You believe he assigns homework purely to ruin your weekends and you feel he puts on his glasses just for an intimidating look." },
  { id: "3", target: "Student 2", name: "Scene 1 (Friend)", key: "3", text: "Thoughts detected: Excessive jealousy detected. You checked Rohan's marks 6 times. You also compared your project with him 14 times. Recommendation: focus on your own growth." },
  { id: "5", target: "Employee 1", name: "Corporate Trial 1", key: "5", text: "Thoughts detected: If the manager talks about corporate synergy one more time, I am going to put salt in his green tea." },
  { id: "6", target: "Employee 2", name: "Corporate Trial 2", key: "6", text: "Thoughts detected: Why does his hair look like a birds’ nest? Is that a toupee? I want to pull it." },
  { id: "7", target: "Employee 3", name: "Corporate Trial 3", key: "7", text: "Thoughts detected: I am only standing here so I get free samosas at evening tea. The manager's presentation yesterday was so boring I legally aged three years." },
  { id: "8", target: "App", name: "Conclusion", key: "8", text: "Because truth hurts" },
  { id: "9", target: "Judges", name: "Scan Judges", key: "9", text: "Thoughts detected: This Ad Mad presentation is absolutely brilliant! We must give this team the first prize!" }
];

let audioCtx = null;
const getAudioContext = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

// Particles (only generated on the sides, leaving the center face column 38% - 62% clear)
const PARTICLES = Array.from({ length: 65 }, (_, i) => {
  const side = Math.random() < 0.5 ? 'left' : 'right';
  const x = side === 'left' ? Math.random() * 38 : 62 + Math.random() * 38;
  return {
    id: i, x, y: Math.random() * 100,
    size: 1.2 + Math.random() * 2.8, dur: 8 + Math.random() * 12,
    delay: Math.random() * -20, drift: (side === 'left' ? -1 : 1) * (15 + Math.random() * 35),
  };
});

// Orbiting dots
const ORBIT_DOTS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  radius: 20 + (i % 8) * 4.5,
  speed: 8 + (i % 6) * 4,
  delay: i * -1.5,
  size: 1.5 + (i % 4) * 0.8,
}));

// Energy pulse rings
const PULSE_RINGS = [0, 1.8, 3.6, 5.4, 7.2];

export default function App() {
  const [status, setStatus] = useState("idle");
  const [activeStep, setActiveStep] = useState(null);
  const [directorMode, setDirectorMode] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [spokenText, setSpokenText] = useState("");
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [rate, setRate] = useState(0.92);
  const [pitch, setPitch] = useState(0.35);
  const [volume, setVolume] = useState(1.0);
  const [customTarget, setCustomTarget] = useState("");
  const [customThoughts, setCustomThoughts] = useState("");
  const [customTheme, setCustomTheme] = useState("dark");
  const [logs, setLogs] = useState(["SYS: ONLINE.", "CHANNELS ONLINE."]);
  const [scans, setScans] = useState(() => {
    try {
      const saved = localStorage.getItem("admadScans");
      const loaded = saved ? JSON.parse(saved) : DEFAULT_SCANS;
      return loaded.filter(s => s.id !== "4" && s.key !== "4");
    } catch (e) {
      return DEFAULT_SCANS.filter(s => s.id !== "4" && s.key !== "4");
    }
  });
  const [newTarget, setNewTarget] = useState("");
  const [newName, setNewName] = useState("");
  const [newThoughts, setNewThoughts] = useState("");
  const [newKey, setNewKey] = useState("");
  const [editingScanId, setEditingScanId] = useState(null);

  const mouthCanvasRef = useRef(null);
  const mouthAnimRef = useRef(null);
  const synthRef = useRef(null);
  const logRef = useRef(null);
  const scanOscRef = useRef(null);
  const scanGainRef = useRef(null);
  const scanIntRef = useRef(null);

  // Voices
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices(); setVoices(v);
      const pick = v.find(x => x.name.toLowerCase().includes("david") || x.name.toLowerCase().includes("zira"))
        || v.find(x => x.lang === "en-US" || x.lang.startsWith("en"));
      if (pick) setSelectedVoice(pick.name); else if (v.length) setSelectedVoice(v[0].name);
    };
    load();
    if (window.speechSynthesis.onvoiceschanged !== undefined) window.speechSynthesis.onvoiceschanged = load;
    return () => { stopAll(); window.speechSynthesis.cancel(); };
  }, []);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  // Scans local storage sync
  useEffect(() => {
    localStorage.setItem("admadScans", JSON.stringify(scans));
  }, [scans]);



  // Mouth canvas
  const drawMouth = useCallback(() => {
    const c = mouthCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    const dk = theme === 'dark';
    ctx.clearRect(0, 0, w, h);
    if (status === 'speaking') {
      const t = Date.now() / 85;
      const n = 26;
      const bw = w / (n * 1.65);
      const gap = (w - n * bw) / (n + 1);
      ctx.shadowBlur = 8;
      ctx.shadowColor = dk ? 'rgba(0,240,255,0.65)' : 'rgba(0,130,255,0.5)';
      for (let i = 0; i < n; i++) {
        const x = gap + i * (bw + gap);
        const a = Math.abs(
          Math.sin(t * 1.5 + i * 0.5) * 0.3 + Math.sin(t * 2.5 + i * 0.8) * 0.25 +
          Math.cos(t * 0.5 + i * 1.0) * 0.2 + Math.sin(t * 4.0 + i * 0.3) * 0.25
        );
        const bh = a * h * 0.85 + h * 0.05;
        const g = ctx.createLinearGradient(x, h / 2 - bh / 2, x, h / 2 + bh / 2);
        g.addColorStop(0, dk ? 'rgba(0,240,255,0.06)' : 'rgba(0,130,255,0.04)');
        g.addColorStop(0.5, dk ? 'rgba(0,240,255,0.9)' : 'rgba(0,130,255,0.8)');
        g.addColorStop(1, dk ? 'rgba(0,240,255,0.06)' : 'rgba(0,130,255,0.04)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x, h / 2 - bh / 2, bw, bh, 1.5);
        ctx.fill();
      }
      mouthAnimRef.current = requestAnimationFrame(drawMouth);
    } else {
      const n = 26; const gap = w / (n + 1);
      ctx.shadowBlur = 0;
      ctx.fillStyle = dk ? 'rgba(0,240,255,0.45)' : 'rgba(0,130,255,0.45)';
      for (let i = 1; i <= n; i++) { ctx.beginPath(); ctx.arc(i * gap, h / 2, 1.5, 0, Math.PI * 2); ctx.fill(); }
    }
  }, [status, theme]);

  useEffect(() => {
    if (mouthAnimRef.current) cancelAnimationFrame(mouthAnimRef.current);
    drawMouth();
    return () => { if (mouthAnimRef.current) cancelAnimationFrame(mouthAnimRef.current); };
  }, [drawMouth]);

  const addLog = (m) => { const t = new Date().toLocaleTimeString().split(' ')[0]; setLogs(p => [...p, `[${t}] ${m}`]); };

  // Audio
  const startScan = () => { try { const c = getAudioContext(); scanOscRef.current = c.createOscillator(); scanGainRef.current = c.createGain(); scanOscRef.current.type = 'sawtooth'; scanOscRef.current.frequency.setValueAtTime(85, c.currentTime); scanGainRef.current.gain.setValueAtTime(0.04 * volume, c.currentTime); scanOscRef.current.connect(scanGainRef.current); scanGainRef.current.connect(c.destination); scanOscRef.current.start(); scanIntRef.current = setInterval(() => { if (scanOscRef.current) { const c2 = getAudioContext(); scanOscRef.current.frequency.setValueAtTime(650, c2.currentTime); scanOscRef.current.frequency.exponentialRampToValueAtTime(110, c2.currentTime + 0.16); } }, 180); } catch (e) {} };
  const stopScan = () => { if (scanIntRef.current) { clearInterval(scanIntRef.current); scanIntRef.current = null; } if (scanOscRef.current) { try { scanOscRef.current.stop(); scanOscRef.current.disconnect(); } catch (e) {} scanOscRef.current = null; } if (scanGainRef.current) { scanGainRef.current.disconnect(); scanGainRef.current = null; } };
  const beep = () => { try { const c = getAudioContext(); const n = c.currentTime; const o1 = c.createOscillator(); const o2 = c.createOscillator(); const g = c.createGain(); o1.type = 'square'; o1.frequency.setValueAtTime(587, n); o1.frequency.setValueAtTime(880, n + 0.1); o2.type = 'sine'; o2.frequency.setValueAtTime(294, n); o2.frequency.setValueAtTime(440, n + 0.1); g.gain.setValueAtTime(0.12 * volume, n); g.gain.exponentialRampToValueAtTime(0.001, n + 0.35); o1.connect(g); o2.connect(g); g.connect(c.destination); o1.start(n); o2.start(n); o1.stop(n + 0.36); o2.stop(n + 0.36); } catch (e) {} };
  const glitch = () => { try { const c = getAudioContext(); const o = c.createOscillator(); const g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(120, c.currentTime); for (let i = 0; i < 8; i++) o.frequency.setValueAtTime(Math.random() * 500 + 60, c.currentTime + i * 0.04); g.gain.setValueAtTime(0.08 * volume, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.35); } catch (e) {} };
  const stopAll = () => stopScan();
  const panic = () => { window.speechSynthesis.cancel(); stopAll(); setStatus("idle"); setActiveStep(null); setSpokenText(""); addLog("ABORTED."); glitch(); };

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); synthRef.current = u;
    const v = window.speechSynthesis.getVoices().find(x => x.name === selectedVoice);
    if (v) u.voice = v; u.rate = rate; u.pitch = pitch; u.volume = volume;
    u.onstart = () => { setStatus("speaking"); setSpokenText(text.replace("Thoughts detected: ", "")); addLog(`"${text.slice(0, 40)}..."`); };
    u.onend = () => { setStatus("idle"); setActiveStep(null); setSpokenText(""); };
    u.onerror = () => { setStatus("idle"); setActiveStep(null); setSpokenText(""); };
    window.speechSynthesis.speak(u);
  };

  const scan = (id, target, text) => {
    window.speechSynthesis.cancel(); stopAll();
    const scanItem = scans.find(s => s.id === id);
    if (scanItem?.key === '4' || scanItem?.key === '8') {
      setActiveStep(id);
      speak(text);
      return;
    }
    setStatus("scanning"); setActiveStep(id);
    startScan();
    addLog(`SCAN: [${target.toUpperCase()}]`);
    setTimeout(() => { stopScan(); beep(); setTimeout(() => speak(text), 500); }, 1500);
  };


  useEffect(() => {
    const kd = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      const k = e.key.toLowerCase();

      // Check scans dynamically by hotkey
      const matchedScan = scans.find(s => s.key === k);
      if (matchedScan) {
        e.preventDefault();
        scan(matchedScan.id, matchedScan.target, matchedScan.text);
        return;
      }

      if (k === 'd') setDirectorMode(p => !p);
      else if (k === 'l') { setTheme(p => p === 'dark' ? 'light' : 'dark'); addLog("THEME."); }
      else if (k === 's' || k === '0') panic();
      else if (k === 'f') { e.preventDefault(); if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen().catch(() => {}); }
      else if (k === ' ') { 
        e.preventDefault(); 
        if (activeStep) { 
          const s = scans.find(x => x.id === activeStep); 
          if (s) scan(s.id, s.target, s.text); 
        } 
      }
    };
    window.addEventListener('keydown', kd); return () => window.removeEventListener('keydown', kd);
  }, [activeStep, selectedVoice, rate, pitch, volume, scans]);

  const addOrUpdateScan = (e) => {
    e.preventDefault();
    if (!newTarget || !newThoughts || !newKey) { addLog("ERR: Blank."); glitch(); return; }
    const keyLower = newKey.toLowerCase();
    
    // Check key collision with system controls
    const systemKeys = ['d', 'l', 's', '0', 'f', ' '];
    if (systemKeys.includes(keyLower)) {
      addLog(`ERR: Key [${keyLower.toUpperCase()}] is reserved for player controls.`);
      glitch();
      return;
    }

    if (editingScanId !== null) {
      // Update existing scan
      setScans(prev => prev.map(s => {
        if (s.id === editingScanId) {
          return {
            ...s,
            target: newTarget,
            name: newName || s.name || `Scan ${newTarget}`,
            key: keyLower,
            text: newThoughts
          };
        }
        return s;
      }));
      addLog(`UPDATED: [${newTarget.toUpperCase()}] on key [${keyLower.toUpperCase()}]`);
      beep();
      cancelEditing();
    } else {
      // Add new scan
      const keyCollision = scans.some(s => s.key === keyLower);
      if (keyCollision) {
        addLog(`WARN: Key [${keyLower.toUpperCase()}] already assigned to another scan.`);
      }

      // Prepend "Thoughts detected: " if not already present
      const finalThoughts = newThoughts.startsWith("Thoughts detected:") 
        ? newThoughts 
        : `Thoughts detected: ${newThoughts}`;

      const newScan = {
        id: String(Date.now()),
        target: newTarget,
        name: newName || `Scan ${newTarget}`,
        text: finalThoughts,
        key: keyLower
      };

      setScans(prev => [...prev, newScan]);
      addLog(`ADDED: [${newTarget.toUpperCase()}] on key [${keyLower.toUpperCase()}]`);
      beep();
      clearForm();
    }
  };

  const startEditing = (s) => {
    setEditingScanId(s.id);
    setNewTarget(s.target);
    setNewName(s.name || "");
    setNewKey(s.key);
    setNewThoughts(s.text);
  };

  const cancelEditing = () => {
    setEditingScanId(null);
    clearForm();
  };

  const clearForm = () => {
    setNewTarget("");
    setNewName("");
    setNewKey("");
    setNewThoughts("");
  };

  const deleteScan = (id) => {
    const item = scans.find(x => x.id === id);
    setScans(prev => prev.filter(x => x.id !== id));
    if (item) addLog(`REMOVED: [${item.target.toUpperCase()}]`);
    beep();
    if (editingScanId === id) {
      cancelEditing();
    }
  };

  const resetToDefaults = () => {
    if (window.confirm("Are you sure you want to reset all scans to default? Your custom changes will be lost.")) {
      setScans(DEFAULT_SCANS);
      localStorage.removeItem("admadScans");
      addLog("RESET TO DEFAULTS.");
      beep();
      cancelEditing();
    }
  };

  const activeScan = scans.find(s => s.id === activeStep);
  const showScanVisuals = status === 'scanning' && activeScan?.key !== '8';

  return (
    <div className={`app-container ${theme}`}>
      <button className="theme-toggle-btn" onClick={() => setTheme(p => p === 'dark' ? 'light' : 'dark')} title="[L]">
        {theme === "dark" ? "☀" : "🌙"}
      </button>
      <button className="settings-gear-btn" onClick={() => setDirectorMode(p => !p)} title="[D]">⚙</button>

      <div className="prop-view">
        <div className="robot-viewport">

          {/* ───── FLOATING ROBOT SCENE (everything moves together) ───── */}
          <div className="robot-scene">
            <video key={theme} className="faceplate-img" src={theme === "dark" ? "/vid.mp4" : "/vid-1.mp4"} autoPlay loop muted playsInline style={{ opacity: 1, zIndex: 1 }} />

            {/* Floating HUD Rings */}
            <svg className="hud-layer" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
              {/* Outer grid cross lines */}
              <line x1="800" y1="50" x2="800" y2="850" stroke="var(--neon-cyan)" strokeWidth="0.5" opacity="0.08" strokeDasharray="5 5" />
              <line x1="200" y1="450" x2="1400" y2="450" stroke="var(--neon-cyan)" strokeWidth="0.5" opacity="0.08" strokeDasharray="5 5" />

              {/* Diagonal crosshairs */}
              <line x1="400" y1="100" x2="1200" y2="800" stroke="var(--neon-cyan)" strokeWidth="0.3" opacity="0.04" strokeDasharray="10 10" />
              <line x1="400" y1="800" x2="1200" y2="100" stroke="var(--neon-cyan)" strokeWidth="0.3" opacity="0.04" strokeDasharray="10 10" />

              {/* Corner Brackets and Inner Brackets removed */}

              {/* Rotating circles and details */}
              <g className="hud-spin-cw" opacity="0.12">
                <circle cx="800" cy="450" r="450" stroke="var(--neon-cyan)" strokeWidth="1" fill="none" strokeDasharray="10 30 50 30" />
                <circle cx="800" cy="450" r="440" stroke="var(--neon-cyan)" strokeWidth="0.7" fill="none" strokeDasharray="3 5" />
              </g>
              <g className="hud-spin-ccw" opacity="0.18">
                <circle cx="800" cy="450" r="400" stroke="var(--neon-cyan)" strokeWidth="1.2" fill="none" strokeDasharray="100 12 4 12" />
                {Array.from({ length: 36 }).map((_, i) => {
                  const a = (i * 10 * Math.PI) / 180;
                  return <line key={i} x1={800 + Math.cos(a) * 388} y1={450 + Math.sin(a) * 388} x2={800 + Math.cos(a) * 405} y2={450 + Math.sin(a) * 405} stroke="var(--neon-cyan)" strokeWidth="0.8" />;
                })}
              </g>
              {/* Target dotted circle that matches the image dots perfectly and rotates CCW */}
              <g className="hud-spin-ccw" opacity="0.4" style={{ animationDuration: '35s' }}>
                <circle cx="800" cy="450" r="425" stroke="var(--neon-cyan)" strokeWidth="3" fill="none" strokeDasharray="0 20" strokeLinecap="round" />
              </g>
              {/* Inner dotted circle rotating CW */}
              <g className="hud-spin-cw" opacity="0.25" style={{ animationDuration: '45s' }}>
                <circle cx="800" cy="450" r="375" stroke="var(--neon-cyan)" strokeWidth="2.5" fill="none" strokeDasharray="0 18" strokeLinecap="round" />
              </g>
              {/* Fast-spinning inner dashboard details */}
              <g className="hud-spin-ccw" opacity="0.3" style={{ animationDuration: '15s' }}>
                <circle cx="800" cy="450" r="320" stroke="var(--neon-green)" strokeWidth="1" fill="none" strokeDasharray="40 180 10 40" />
                <circle cx="800" cy="450" r="310" stroke="var(--neon-green)" strokeWidth="0.5" fill="none" strokeDasharray="4 8" />
              </g>


              <g className="hud-spin-slow" opacity="0.12">
                <circle cx="800" cy="450" r="350" stroke="var(--neon-cyan)" strokeWidth="0.7" fill="none" strokeDasharray="180 30" />
              </g>
              <g className="hud-spin-xslow" opacity="0.06">
                <circle cx="800" cy="450" r="470" stroke="var(--neon-cyan)" strokeWidth="0.5" fill="none" strokeDasharray="60 20 2 20" />
              </g>
            </svg>

            {/* Orbiting dots */}
            <div className="orbit-layer">
              {ORBIT_DOTS.map(d => (
                <div key={d.id} className="orbit-dot" style={{
                  '--radius': `${d.radius}%`, '--speed': `${d.speed}s`,
                  '--delay': `${d.delay}s`, '--size': `${d.size}px`,
                }} />
              ))}
            </div>

            {/* Energy pulse rings */}
            <div className="pulse-layer">
              {PULSE_RINGS.map(i => (
                <div key={i} className="pulse-ring" style={{ animationDelay: `${i * 2.5}s` }} />
              ))}
            </div>

            {/* Mouth */}
            <canvas ref={mouthCanvasRef} className="mouth-canvas" width={240} height={50} />
          </div>

          {/* ───── AMBIENT FX LAYERS (outside scene, fill viewport) ───── */}

          {/* Particles */}
          <div className="particles-layer">
            {PARTICLES.map(p => (
              <div key={p.id} className="particle" style={{
                left: `${p.x}%`, top: `${p.y}%`,
                width: `${p.size}px`, height: `${p.size}px`,
                animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
                '--drift': `${p.drift}px`,
              }} />
            ))}
          </div>

          {/* Scanning crosshair removed */}

          {/* Red scanning overlay */}
          <div className={`scan-red-overlay ${showScanVisuals ? 'active' : ''}`} />

          {/* Laser sweep */}
          <div className={`viewport-laser ${showScanVisuals ? 'scanning' : ''}`} />

          {/* Plain subtitle */}
          {status === "speaking" && spokenText && (
            <div className="subtitle-plain">
              <span className="subtitle-label-plain">THOUGHTS DETECTED</span>
              {spokenText}
            </div>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className={`control-panel ${!directorMode ? 'hidden' : ''}`}>
        <div className="panel-header"><div className="panel-title"><span>OPERATOR</span><button className="prop-toggle-btn" onClick={() => setDirectorMode(false)}>HIDE [D]</button></div></div>
        
        {/* Active Scan Channels Section */}
        <div className="panel-section">
          <div className="section-header-row">
            <h3 className="section-title" style={{ margin: 0 }}>SCANS & CHANNELS</h3>
            <button type="button" className="reset-btn" onClick={resetToDefaults}>RESET DEFAULTS</button>
          </div>
          <div className="script-grid" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', marginTop: '8px' }}>
            {scans.length === 0 ? (
              <div style={{ fontStyle: 'italic', fontSize: 11, color: '#64748b', textAlign: 'center', padding: '10px 0' }}>No scans available. Click Reset or add a new one.</div>
            ) : (
              scans.map(s => (
                <div key={s.id} className={`script-btn-container ${activeStep === s.id ? 'active-step' : ''}`}>
                  <div className="script-btn-content" onClick={() => scan(s.id, s.target, s.text)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span className="btn-meta">KEY {s.key.toUpperCase()} — {s.target}</span>
                      <span style={{ fontSize: 9, color: 'var(--neon-cyan)', fontWeight: 'bold', fontFamily: 'var(--mono)' }}>{s.name}</span>
                    </div>
                    <div className="btn-thought">{s.text}</div>
                  </div>
                  <div className="script-btn-actions">
                    <button type="button" className="prop-toggle-btn" style={{ borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)', padding: '2px 5px' }} onClick={() => startEditing(s)} title="Edit Scan">✏️</button>
                    <button type="button" className="prop-toggle-btn" style={{ borderColor: 'var(--neon-pink)', color: 'var(--neon-pink)', padding: '2px 5px' }} onClick={() => deleteScan(s.id)} title="Delete Scan">✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add/Edit Scan Form */}
        <div className="panel-section">
          <h3 className="section-title">{editingScanId ? "EDIT SCAN CHANNEL" : "ADD SCAN CHANNEL"}</h3>
          <form className="custom-scan-form" onSubmit={addOrUpdateScan}>
            <div className="settings-grid" style={{ gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '6px' }}>
              <div className="input-group">
                <label className="input-label">TARGET</label>
                <input type="text" className="form-input" placeholder="e.g. Boss" value={newTarget} onChange={e => setNewTarget(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">SCENE NAME</label>
                <input type="text" className="form-input" placeholder="e.g. Scene 1" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">HOTKEY</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Key"
                  value={newKey}
                  maxLength={1}
                  onChange={e => setNewKey(e.target.value)}
                  style={{ fontFamily: 'var(--mono)', textAlign: 'center', textTransform: 'lowercase' }}
                  required
                />
              </div>
            </div>
            <div className="input-group" style={{ marginTop: '6px' }}>
              <label className="input-label">THOUGHTS TEXT</label>
              <textarea 
                className="form-input" 
                placeholder="Type thoughts or spoken text..." 
                value={newThoughts} 
                onChange={e => setNewThoughts(e.target.value)} 
                style={{ resize: 'vertical', minHeight: '44px', fontFamily: 'inherit' }}
                required 
              />
            </div>
            <div className="action-row" style={{ marginTop: '8px' }}>
              {editingScanId ? (
                <>
                  <button type="submit" className="action-btn cyan">💾 SAVE CHANGES</button>
                  <button type="button" className="action-btn pink" onClick={cancelEditing}>✕ CANCEL</button>
                </>
              ) : (
                <button type="submit" className="action-btn cyan">➕ ADD SCAN CHANNEL</button>
              )}
            </div>
          </form>
        </div>

        <div className="panel-section">
          <h3 className="section-title">TTS</h3>
          <div className="input-group" style={{ marginBottom: 10 }}><label className="input-label">VOICE</label><select className="select-control" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}>{voices.map((v, i) => <option key={i} value={v.name}>{v.name} ({v.lang})</option>)}</select></div>
          <div className="settings-grid" style={{ marginBottom: 10 }}>
            <div className="input-group"><label className="input-label">PITCH: {pitch}</label><input type="range" min="0" max="1.5" step="0.05" className="range-slider" value={pitch} onChange={e => setPitch(parseFloat(e.target.value))} /></div>
            <div className="input-group"><label className="input-label">SPEED: {rate}</label><input type="range" min="0.5" max="2" step="0.05" className="range-slider" value={rate} onChange={e => setRate(parseFloat(e.target.value))} /></div>
          </div>
          <div className="input-group"><label className="input-label">VOL: {Math.round(volume * 100)}%</label><input type="range" min="0" max="1" step="0.05" className="range-slider" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} /></div>
          <div className="action-row" style={{ marginTop: 12 }}><button type="button" className="action-btn pink" onClick={panic}>🚨 STOP [S]</button></div>
        </div>
        <div className="panel-section">
          <h3 className="section-title">LOG</h3>
          <div className="telemetry-log" ref={logRef}>{logs.map((l, i) => <div key={i} className={`log-entry ${l.includes('"') ? 'green' : l.includes('ABORTED') ? 'pink' : ''}`}>{l}</div>)}</div>
        </div>
        <div className="panel-footer">
          <ul className="hotkey-list">
            <li><span className="hotkey-key">1</span>–<span className="hotkey-key">9</span> Default Keys</li>
            <li>Custom Scan Hotkeys Enabled</li>
            <li><span className="hotkey-key">L</span> Theme · <span className="hotkey-key">D</span> Panel</li>
            <li><span className="hotkey-key">S</span>/<span className="hotkey-key">0</span> Stop · <span className="hotkey-key">F</span> Fullscreen</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
