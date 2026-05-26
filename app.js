let job; let steps = [];
let currentStepIndex = 0; let selectedCheckIndex = 0; let panel = "checklist";
const storageKey = "meta_cnc_hud_state_v3";
const state = { checked: {}, demoAuto: false, autoTimer: null, live: { mode: "Réglage", tool: "T08 Ø6", g54: false, feed: 25, api: "SIM", safety: "ATTENTE", toolLength: false, simulation: false, firstPart: false }, sensors: { gps: "GPS: non testé", audio: "Audio: non testé", motion: "Capteurs: simulés PC" } };
const $ = (id) => document.getElementById(id);

async function init() {
  const res = await fetch("data.json", { cache: "no-store" });
  const data = await res.json();
  job = data.job; steps = data.steps;
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  Object.assign(state, saved);
  bind();
  await setupMotion();
  simulateApiRefresh();
  render();
}
function bind() {
  document.addEventListener("keydown", onKey);
  $("checklist-panel").addEventListener("click", (e) => {
    const item = e.target.closest(".item"); if (!item) return;
    selectedCheckIndex = Number(item.dataset.idx); toggleCheck();
  });
}
function onKey(e) {
  if (e.key === "ArrowRight") nextStep();
  if (e.key === "ArrowLeft") prevStep();
  if (e.key === "ArrowDown") move(1);
  if (e.key === "ArrowUp") move(-1);
  if (e.key === "Enter") toggleCheck();
  if (e.key === "Escape") { currentStepIndex = 0; selectedCheckIndex = 0; stopDemoAuto(); render(); }
  if (e.key.toLowerCase() === "r") resetAll();
  if (e.key.toLowerCase() === "m") togglePanel();
  if (e.key.toLowerCase() === "a") audioTest();
  if (e.key.toLowerCase() === "g") gpsTest();
  if (e.key.toLowerCase() === "d") toggleDemoAuto();
}
function stepKey(i) { return `s_${i}`; }
function list(i) { return state.checked[stepKey(i)] || []; }
function setList(i, arr) { state.checked[stepKey(i)] = arr; save(); }
function nextStep() { currentStepIndex = (currentStepIndex + 1) % steps.length; selectedCheckIndex = 0; render(); }
function prevStep() { currentStepIndex = (currentStepIndex - 1 + steps.length) % steps.length; selectedCheckIndex = 0; render(); }
function move(delta) { const n = steps[currentStepIndex].checks.length; selectedCheckIndex = (selectedCheckIndex + delta + n) % n; renderChecklist(); }
function toggleCheck() {
  const arr = list(currentStepIndex); const i = selectedCheckIndex; const p = arr.indexOf(i);
  if (p >= 0) arr.splice(p, 1); else arr.push(i); setList(currentStepIndex, arr);
  refreshCriticalStates(); render();
}
function refreshCriticalStates() {
  state.live.tool = isDone(2, 0) ? job.expectedToolShort : job.wrongToolShort;
  state.live.toolLength = isDone(3, 0);
  state.live.g54 = isDone(4, 3);
  state.live.simulation = isDone(5, 2);
  state.live.firstPart = isDone(6, 2);
  state.live.safety = state.live.g54 ? "OK" : "BLOQUÉ";
}
function isDone(stepIdx, checkIdx) { return (state.checked[stepKey(stepIdx)] || []).includes(checkIdx); }
function lockCount() {
  return [state.live.tool === job.expectedToolShort, state.live.toolLength, state.live.g54, state.live.simulation].filter(Boolean).length;
}
function getAlert() {
  const dangerPrefix = "⚠ ALERTE ATELIER —";
  if (currentStepIndex >= 2 && state.live.tool !== job.expectedToolShort) return ["danger", `${dangerPrefix} mauvais outil: ${state.live.tool}. Attendu ${job.expectedToolShort}.`];
  if (currentStepIndex >= 3 && !state.live.toolLength) return ["warning", "⚠ ALERTE CONTEXTUELLE — Outil correct mais longueur non mesurée. Risque collision Z."];
  if (currentStepIndex >= 4 && !state.live.g54) return ["danger", `${dangerPrefix} origine G54 non validée. Blocage lancement.`];
  if (currentStepIndex >= 5 && !state.live.simulation) return ["warning", "⚠ ALERTE CONTEXTUELLE — Simulation à vide non validée. Confirmer avant cycle."];
  if (currentStepIndex >= 6 && !state.live.firstPart) return ["warning", "⚠ ALERTE CONTEXTUELLE — Première pièce non validée. Contrôle cote requis."];
  if (allCriticalOk()) return ["ok", "✅ Feu vert série: verrous critiques validés."];
  return ["ok", "✓ Étape validable, poursuivre la procédure."];
}
function allCriticalOk() { return state.live.tool === job.expectedToolShort && state.live.toolLength && state.live.g54 && state.live.simulation && state.live.firstPart; }
function render() {
  const s = steps[currentStepIndex]; refreshCriticalStates();
  $("machine-name").textContent = job.machine;
  $("program-name").textContent = job.program;
  $("step-counter").textContent = `${currentStepIndex + 1}/${steps.length}`;
  $("live-mode").textContent = `MODE: ${state.live.mode}`;
  $("live-tool").textContent = `OUTIL: ${state.live.tool}`;
  $("live-origin").textContent = `G54: ${state.live.g54 ? "OK" : "NOK"}`;
  $("live-api").textContent = `API: ${state.live.api}`;
  $("live-feed").textContent = `${state.live.feed}%`;
  $("live-safety").textContent = state.live.safety;
  $("locks-gauge").textContent = `${lockCount()}/4`;
  $("step-category").textContent = s.category;
  $("left-context").textContent = s.context;
  $("step-title").textContent = s.title;
  $("step-action").textContent = s.action;
  $("value-note").textContent = `+ ${s.value}`;
  const [level, text] = getAlert(); const box = $("alert-box"); box.className = `alert-box alert-${level}`; box.textContent = text;
  $("panel-title").textContent = panel === "checklist" ? "Checklist étape" : panel === "demo" ? "Démo lunettes" : "Pourquoi lunettes > tablette";
  $("panel-mode").textContent = panel === "checklist" ? "M: Checklist" : panel === "demo" ? "M: Démo" : "M: Pourquoi";
  renderChecklist(); renderDemoPanel(); renderWhyPanel(); renderVisual(s.visual);
}
function renderChecklist() {
  const s = steps[currentStepIndex]; const host = $("checklist-panel"); host.innerHTML = "";
  s.checks.forEach((txt, i) => {
    const done = list(currentStepIndex).includes(i);
    host.insertAdjacentHTML("beforeend", `<div class="item ${done ? "done" : ""} ${i === selectedCheckIndex ? "selected" : ""}" data-idx="${i}"><span class="box">${done ? "✓" : ""}</span><span>${txt}</span></div>`);
  });
  $("checklist-panel").classList.toggle("active", panel === "checklist");
  $("demo-panel").classList.toggle("active", panel === "demo");
  $("why-panel").classList.toggle("active", panel === "why");
}
function renderDemoPanel() {
  const host = $("demo-panel");
  host.innerHTML = [
    `Démo auto opérateur: ${state.demoAuto ? "ACTIVE" : "OFF"} (D)`, "Gestes clavier: actifs", "Navigation mains libres: active", "Stockage local: actif", `Audio test: ${state.sensors.audio}`,
    `GPS téléphone: ${state.sensors.gps}`, `Capteurs: ${state.sensors.motion}`, "API atelier: simulée (fetch futur)",
    "Caméra/photo/micro: prévu via SDK mobile / Device Access Toolkit"
  ].map((t) => `<div class="demo-line ${t.includes("prévu") ? "off" : ""}">${t}</div>`).join("");
}
function renderWhyPanel() {
  const host = $("why-panel");
  host.innerHTML = [
    "✓ Vue machine + instructions sans quitter la zone d'usinage",
    "✓ Réduit les allers-retours tablette / pupitre",
    "✓ Alertes contextuelles pendant l'action (outil, G54, simulation)",
    "✓ Progression opérateur lisible en temps réel",
    "✓ Compatible web statique GitHub Pages"
  ].map((t) => `<div class='demo-line'>${t}</div>`).join("");
}
function renderVisual(kind) { const map = { program:`<svg viewBox='0 0 100 60'><rect x='8' y='6' width='84' height='48' fill='none' stroke='#8fd4ff'/><text x='14' y='22' fill='#d8eeff' font-size='7'>O1205_POCHE_ALU</text><text x='14' y='34' fill='#d8eeff' font-size='7'>N10 G54 G17</text></svg>`, vise:`<svg viewBox='0 0 100 60'><rect x='8' y='22' width='84' height='18' fill='none' stroke='#8fd4ff'/><rect x='38' y='14' width='24' height='26' fill='#2c4a66'/></svg>`, tool:`<svg viewBox='0 0 100 60'><line x1='50' y1='6' x2='50' y2='44' stroke='#8fd4ff' stroke-width='5'/><polygon points='42,44 58,44 50,55' fill='#8fd4ff'/></svg>`, toolLength:`<svg viewBox='0 0 100 60'><line x1='35' y1='8' x2='35' y2='52' stroke='#8fd4ff'/><line x1='55' y1='8' x2='55' y2='52' stroke='#8fd4ff'/><text x='58' y='30' fill='#fff' font-size='7'>L?</text></svg>`, g54:`<svg viewBox='0 0 100 60'><line x1='18' y1='46' x2='82' y2='46' stroke='#8fd4ff'/><line x1='18' y1='46' x2='18' y2='10' stroke='#8fd4ff'/><text x='21' y='14' fill='#fff' font-size='7'>G54</text></svg>`, path:`<svg viewBox='0 0 100 60'><polyline points='8,46 20,20 35,34 52,16 74,30 92,12' fill='none' stroke='#8fd4ff' stroke-width='2'/></svg>`, part:`<svg viewBox='0 0 100 60'><rect x='20' y='14' width='60' height='34' fill='none' stroke='#8fd4ff'/><text x='24' y='32' fill='#fff' font-size='8'>60.04 OK</text></svg>`, green:`<svg viewBox='0 0 100 60'><circle cx='50' cy='30' r='18' fill='none' stroke='#40df86' stroke-width='4'/><polyline points='40,30 48,38 62,22' fill='none' stroke='#40df86' stroke-width='4'/></svg>` }; $("step-visual").innerHTML = map[kind] || ""; }
function togglePanel() { panel = panel === "checklist" ? "demo" : panel === "demo" ? "why" : "checklist"; render(); }
function toggleDemoAuto() {
  if (state.demoAuto) { stopDemoAuto(); } else {
    state.demoAuto = true;
    state.autoTimer = setInterval(() => {
      const checks = steps[currentStepIndex].checks.length;
      selectedCheckIndex = Math.floor(Math.random() * checks);
      toggleCheck();
      if (Math.random() > 0.45) nextStep();
    }, 2800);
  }
  render(); save();
}
function stopDemoAuto() { state.demoAuto = false; clearInterval(state.autoTimer); state.autoTimer = null; save(); }
function resetAll() { localStorage.removeItem(storageKey); state.checked = {}; panel = "checklist"; currentStepIndex = 0; selectedCheckIndex = 0; stopDemoAuto(); state.live = { mode:"Réglage", tool:"T08 Ø6", g54:false, feed:25, api:"SIM", safety:"ATTENTE", toolLength:false, simulation:false, firstPart:false }; render(); }
function save() { localStorage.setItem(storageKey, JSON.stringify({ checked: state.checked, live: state.live, sensors: state.sensors, demoAuto: state.demoAuto })); }
function audioTest() { let ok = false; try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.03; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.14); ok = true; } catch {}
  if ("speechSynthesis" in window) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance("Alerte CNC")); ok = true; }
  state.sensors.audio = ok ? "OK" : "audio non disponible dans ce navigateur"; render(); }
function gpsTest() { if (!navigator.geolocation) { state.sensors.gps = "indisponible"; render(); return; }
  navigator.geolocation.getCurrentPosition(() => { state.sensors.gps = "GPS téléphone OK"; render(); }, () => { state.sensors.gps = "permission refusée / indisponible"; render(); }, { timeout: 3500 }); }
function attachDeviceOrientationListener() { window.addEventListener("deviceorientation", (e) => {
    state.sensors.motion = `capteur OK α:${Math.round(e.alpha || 0)}`; if (panel === "demo") render(); }, { passive: true }); }
async function setupMotion() { if (!("DeviceOrientationEvent" in window)) { setInterval(() => { state.sensors.motion = `simulé PC α:${Math.floor(Math.random() * 30)}`; if (panel === "demo") render(); }, 3000); return; }
  try { if (typeof DeviceOrientationEvent.requestPermission === "function") { const permission = await DeviceOrientationEvent.requestPermission(); if (permission !== "granted") { state.sensors.motion = "capteurs: permission refusée"; return; } }
    attachDeviceOrientationListener(); } catch { state.sensors.motion = "capteurs: permission indisponible"; } }
function simulateApiRefresh() { setInterval(() => { const modes = ["Réglage", "Single Block", "MDI"]; state.live.mode = modes[Math.floor(Math.random() * modes.length)]; state.live.feed = [20, 25, 30, 35][Math.floor(Math.random() * 4)]; state.live.api = Math.random() > 0.2 ? "SIM CONNECTÉ" : "SIM LATENCE"; render(); }, 4500); }
init().catch((e) => { $("step-title").textContent = "Erreur data.json"; $("alert-box").className = "alert-box alert-danger"; $("alert-box").textContent = e.message; });
