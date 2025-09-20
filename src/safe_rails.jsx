import React, { useEffect, useRef, useState } from "react";

// SafeRails - Single-file React component
// How to use:
// 1) Create a new React app (e.g. with `npx create-react-app saferails`)
// 2) Replace src/App.js with the contents of this file (or import this component into App.js)
// 3) Replace src/App.css with nothing (optional) and run `npm start`.
// This component uses plain CSS injected at runtime so no extra setup is needed.

export default function SafeRailsApp() {
  const svgRef = useRef(null);
  const trainARef = useRef({ pos: 0, dir: 1 });
  const trainBRef = useRef({ pos: 0.5, dir: -1 }); // start at opposite side
  const requestRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(0.02); // fraction per second
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [status, setStatus] = useState("Idle — ready to run");

  // inject minimal styles
  useEffect(() => {
    const css = `
      .app-wrap { font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding: 18px; }
      .panel { display:flex; gap:12px; align-items:center; margin-bottom:10px }
      .controls { display:flex; gap:10px; align-items:center }
      button { background:#0b74ff; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer }
      button.danger { background:#ff4d4f }
      .stat { background:#f3f4f6; padding:8px 12px; border-radius:8px }
      .svg-box { width:100%; max-width:900px; margin: 12px auto; background:linear-gradient(180deg,#e6f2ff 0%, #ffffff 100%); border-radius:12px; padding:12px }
      .legend { display:flex; gap:10px; margin-top:8px }
      .legend .item { display:flex; gap:6px; align-items:center }
      .dot { width:14px; height:14px; border-radius:4px }
    `;
    const style = document.createElement("style");
    style.innerHTML = css;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // core animation: move trains along an SVG path
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const path = svg.querySelector("#mainTrack");
    if (!path) return;

    let lastTime = null;

    function frame(t) {
      if (!lastTime) lastTime = t;
      const dt = (t - lastTime) / 1000; // seconds
      lastTime = t;

      if (running) {
        // advance both trains
        trainARef.current.pos += trainARef.current.dir * speed * dt;
        trainBRef.current.pos += trainBRef.current.dir * speed * dt;
        // normalize positions to [0,1]
        trainARef.current.pos = mod1(trainARef.current.pos);
        trainBRef.current.pos = mod1(trainBRef.current.pos);

        // update DOM positions
        updateTrainPosition(path, "trainA", trainARef.current.pos);
        updateTrainPosition(path, "trainB", trainBRef.current.pos);

        // compute distance along path (shortest along path in fraction)
        const d = fractionalPathDistance(path, trainARef.current.pos, trainBRef.current.pos);
        // assume total path length corresponds to 1000 meters for demo (scaleable)
        const meters = Math.round(d * 1000);
        setDistanceMeters(meters);

        // collision avoidance: if closer than safeDistance, stop both
        const safeDistanceMeters = 120; // configurable threshold
        if (meters < safeDistanceMeters) {
          setStatus("Warning: Trains too close — automatic braking engaged");
          setRunning(false);
        } else {
          setStatus("Running — all clear");
        }
      }

      requestRef.current = requestAnimationFrame(frame);
    }

    requestRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(requestRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, speed]);

  function mod1(x) {
    return ((x % 1) + 1) % 1;
  }

  function updateTrainPosition(path, id, frac) {
    const trainEl = document.getElementById(id);
    if (!trainEl) return;
    const total = path.getTotalLength();
    const point = path.getPointAtLength(frac * total);
    // rotate train to tangent
    const ahead = path.getPointAtLength((frac * total + 5) % total);
    const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * (180 / Math.PI);
    trainEl.setAttribute("transform", `translate(${point.x}, ${point.y}) rotate(${angle})`);
  }

  // compute shortest fractional distance along path between two fractions
  function fractionalPathDistance(path, f1, f2) {
    const total = path.getTotalLength();
    const a = Math.abs(f1 - f2);
    const dFrac = Math.min(a, 1 - a);
    return dFrac; // fraction of full path
  }

  function handleStart() {
    setStatus("Starting...");
    setRunning(true);
  }
  function handlePause() {
    setRunning(false);
    setStatus("Paused");
  }
  function handleReset() {
    setRunning(false);
    trainARef.current.pos = 0;
    trainBRef.current.pos = 0.5;
    const svg = svgRef.current;
    const path = svg.querySelector("#mainTrack");
    updateTrainPosition(path, "trainA", trainARef.current.pos);
    updateTrainPosition(path, "trainB", trainBRef.current.pos);
    setDistanceMeters(Math.round(fractionalPathDistance(path, trainARef.current.pos, trainBRef.current.pos) * 1000));
    setStatus("Reset — ready");
  }

  // simple UI for changing direction
  function swapDirections() {
    trainARef.current.dir *= -1;
    trainBRef.current.dir *= -1;
    setStatus("Direction swapped");
  }

  return (
    <div className="app-wrap">
      <h1 style={{ fontSize: 22, marginBottom: 8 ,fontWeight:700}}>SafeRails — AI-Powered Precise Train Traffic Control</h1>
      <div className="panel">
        <div className="controls">
          <button onClick={handleStart} disabled={running}>Start</button>
          <button onClick={handlePause} disabled={!running}>Pause</button>
          <button onClick={handleReset}>Reset</button>
          <button className="danger" onClick={swapDirections}>Swap Directions</button>
        </div>
        <div style={{ marginLeft: 12 }} className="stat">Status: {status}</div>
      </div>

      <div className="panel">
        <label>Speed: </label>
        <input
          type="range"
          min="0.005"
          max="0.08"
          step="0.005"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
        />
        <div className="stat">Speed: {(speed * 100).toFixed(1)}% /s</div>
        <div className="stat">Distance (approx): {distanceMeters} m</div>
      </div>

      <div className="svg-box">
        <svg ref={svgRef} viewBox="0 0 1000 600" width="100%" height="520">
          {/* Background map grid + river + stations */}
          <defs>
            <linearGradient id="riverG" x1="0" x2="1">
              <stop offset="0" stopColor="#a3d5ff" stopOpacity="0.9" />
              <stop offset="1" stopColor="#e8f6ff" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="1000" height="600" fill="#f6fafb" rx="10" />

          {/* A stylized river */}
          <path d="M0,120 C200,40 400,200 600,120 C780,50 900,180 1000,120 L1000,200 L0,200 Z" fill="url(#riverG)" opacity="0.9" />

          {/* stations */}
          <g id="stations">
            <g transform="translate(140,420)">
              <rect x="-40" y="-18" width="80" height="36" rx="6" fill="#fff" stroke="#cbd5e1" />
              <text x="0" y="6" fontSize="12" textAnchor="middle">Central</text>
            </g>
            <g transform="translate(860,120)">
              <rect x="-40" y="-18" width="80" height="36" rx="6" fill="#fff" stroke="#cbd5e1" />
              <text x="0" y="6" fontSize="12" textAnchor="middle">Harbor</text>
            </g>
            <g transform="translate(520,320)">
              <rect x="-46" y="-18" width="92" height="36" rx="6" fill="#fff" stroke="#cbd5e1" />
              <text x="0" y="6" fontSize="12" textAnchor="middle">Midtown</text>
            </g>
          </g>

          {/* Main track path (looping) */}
          <path id="mainTrack" d="M100,480 C220,420 360,500 480,360 C560,260 720,240 860,160 C920,120 940,80 980,60 L980,60 C940,110 860,140 780,160 C640,200 560,220 480,300 C360,420 220,340 100,480 Z"
            fill="none" stroke="#444" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

          {/* rails (decorative dashed lines) */}
          <path d="M100,480 C220,420 360,500 480,360 C560,260 720,240 860,160 C920,120 940,80 980,60 L980,60 C940,110 860,140 780,160 C640,200 560,220 480,300 C360,420 220,340 100,480 Z"
            fill="none" stroke="#888" strokeWidth="2" strokeDasharray="12 8" opacity="0.5" />

          {/* Signals (example) */}
          <g id="signals">
            <circle cx="200" cy="440" r="8" fill="#22c55e" />
            <circle cx="520" cy="300" r="8" fill="#22c55e" />
            <circle cx="860" cy="160" r="8" fill="#22c55e" />
          </g>

          {/* Train shapes placed at path positions — we'll transform (translate+rotate) them */}
          <g id="trainA" transform="translate(0,0)">
            <rect x="-20" y="-8" width="40" height="16" rx="3" fill="#0b74ff" stroke="#053a7a" strokeWidth="1" />
            <rect x="8" y="-6" width="8" height="12" rx="1" fill="#0b74ff" opacity="0.9" />
            <circle cx="-12" cy="10" r="4" fill="#111" />
            <circle cx="12" cy="10" r="4" fill="#111" />
          </g>

          <g id="trainB" transform="translate(0,0)">
            <rect x="-20" y="-8" width="40" height="16" rx="3" fill="#ff8a00" stroke="#7a3d03" strokeWidth="1" />
            <rect x="-28" y="-6" width="8" height="12" rx="1" fill="#ff8a00" opacity="0.9" />
            <circle cx="-12" cy="10" r="4" fill="#111" />
            <circle cx="12" cy="10" r="4" fill="#111" />
          </g>

        </svg>

        <div className="legend">
          <div className="item"><div className="dot" style={{ background: "#0b74ff" }} /> Train A</div>
          <div className="item"><div className="dot" style={{ background: "#ff8a00" }} /> Train B</div>
          <div className="item"><div className="dot" style={{ background: "#22c55e" }} /> Signal (GO)</div>
        </div>

      </div>

      <div style={{ marginTop: 12 }}>
        {/* <h3 style={{ marginBottom: 6 }}>How it demonstrates SafeRails features</h3>
        <ul>
          <li>Animated trains moving along a realistic track (SVG path).</li>
          <li>Collision avoidance: trains automatically brake when closer than a safe distance.</li>
          <li>Direction control, start/pause/reset and speed slider to simulate traffic management.</li>
          <li>Readable, single-file React code you can present to judges and extend into a full system (add AI logic, map tiles, live telemetry, etc.).</li>
        </ul> */}

        {/* <p style={{ marginTop: 8 }}><strong>Notes for judges/demo:</strong> This is a client-side visualization. For a full Smart India Hackathon submission, connect this front-end to a back-end that runs the route-planning, scheduling, and AI collision-avoidance algorithms — the UI will visualize their decisions in real time.</p> */}
      </div>
    </div>
  );
}
