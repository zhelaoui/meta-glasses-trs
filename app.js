let job = null;
let steps = [];

let currentStepIndex = 0;
let selectedCheckIndex = 0;

let storageKey = "meta_cnc_display_demo_state";
let savedState = {};

const machineName = document.getElementById("machine-name");
const jobName = document.getElementById("job-name");
const stepCounter = document.getElementById("step-counter");
const stepCategory = document.getElementById("step-category");
const stepTitle = document.getElementById("step-title");
const stepAction = document.getElementById("step-action");
const dataList = document.getElementById("data-list");
const checklist = document.getElementById("checklist");
const alertBox = document.getElementById("alert-box");

const liveMode = document.getElementById("live-mode");
const liveTool = document.getElementById("live-tool");
const liveOrigin = document.getElementById("live-origin");

async function loadProcedure() {
  try {
    const response = await fetch("data.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Erreur chargement data.json : ${response.status}`);
    }

    const data = await response.json();

    job = data.job;
    steps = data.steps;

    storageKey = `meta_cnc_display_${job.id}`;
    savedState = JSON.parse(localStorage.getItem(storageKey) || "{}");

    currentStepIndex = 0;
    selectedCheckIndex = 0;

    render();
  } catch (error) {
    console.error(error);

    machineName.textContent = "Erreur";
    jobName.textContent = "Impossible de charger data.json";
    stepTitle.textContent = "Fichier data.json introuvable";
    stepAction.textContent = "Vérifie que le fichier data.json est dans le même dossier que index.html.";
    alertBox.className = "alert-box alert-danger";
    alertBox.textContent = "⚠ Chargement impossible. Lance la page avec http://localhost/meta-glasses-trs/";
  }
}

function stepKey(index) {
  return `step_${index}`;
}

function getChecked(index) {
  return savedState[stepKey(index)] || [];
}

function saveChecked(index, checked) {
  savedState[stepKey(index)] = checked;
  localStorage.setItem(storageKey, JSON.stringify(savedState));
}

function isChecked(stepIndex, checkIndex) {
  return getChecked(stepIndex).includes(checkIndex);
}

function getFakeLiveData() {
  const toolMounted = isChecked(2, 0);
  const toolLengthMeasured = isChecked(2, 3);
  const originControlled = isChecked(3, 3);
  const simulationOk = isChecked(4, 3);
  const firstPartOk = isChecked(5, 3);

  let mode = "Réglage";
  let tool = toolMounted ? job.expectedToolShort : job.wrongToolShort;
  let origin = originControlled ? "OK" : "Non";

  if (currentStepIndex >= 4) {
    mode = simulationOk ? "Single" : "Réglage";
  }

  if (currentStepIndex === 5 && firstPartOk) {
    mode = "Série OK";
  }

  return {
    mode,
    tool,
    origin,
    toolMounted,
    toolLengthMeasured,
    originControlled,
    simulationOk,
    firstPartOk
  };
}

function getContextAlert(live) {
  if (currentStepIndex >= 2 && !live.toolMounted) {
    return {
      level: "danger",
      text: `⚠ Outil non conforme : attendu ${job.expectedToolShort}, détecté ${job.wrongToolShort}. Ne pas lancer.`
    };
  }

  if (currentStepIndex >= 2 && live.toolMounted && !live.toolLengthMeasured) {
    return {
      level: "warning",
      text: "⚠ Outil correct, mais longueur non mesurée. Risque collision en Z."
    };
  }

  if (currentStepIndex >= 3 && !live.originControlled) {
    return {
      level: "danger",
      text: `⚠ Origine ${job.origin} non validée. Le lancement programme est interdit.`
    };
  }

  if (currentStepIndex >= 4 && !live.simulationOk) {
    return {
      level: "warning",
      text: "⚠ Simulation non terminée. Premier passage conseillé en avance réduite."
    };
  }

  if (currentStepIndex === 5 && !live.firstPartOk) {
    return {
      level: "warning",
      text: "⚠ Première pièce non validée. La série ne doit pas démarrer."
    };
  }

  return {
    level: "ok",
    text: "✓ Conditions principales validées pour cette étape."
  };
}

function render() {
  if (!job || !steps.length) {
    return;
  }

  const step = steps[currentStepIndex];
  const live = getFakeLiveData();
  const alert = getContextAlert(live);

  machineName.textContent = job.machine;
  jobName.textContent = job.title;
  stepCounter.textContent = `${currentStepIndex + 1}/${steps.length}`;

  liveMode.textContent = live.mode;
  liveTool.textContent = live.tool;
  liveOrigin.textContent = live.origin;

  alertBox.className = `alert-box alert-${alert.level}`;
  alertBox.textContent = alert.text;

  stepCategory.textContent = step.category;
  stepTitle.textContent = step.title;
  stepAction.textContent = step.action;

  renderData(step.data);
  renderChecklist(step.checks);

  selectedCheckIndex = Math.min(selectedCheckIndex, step.checks.length - 1);
  updateSelection();
}

function renderData(rows) {
  dataList.innerHTML = "";

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "data-row";

    row.innerHTML = `
      <span>${label}</span>
      <strong>${value}</strong>
    `;

    dataList.appendChild(row);
  });
}

function renderChecklist(items) {
  checklist.innerHTML = "";

  const checked = getChecked(currentStepIndex);

  items.forEach((text, index) => {
    const item = document.createElement("div");
    item.className = "check-item";
    item.dataset.index = index;

    if (checked.includes(index)) {
      item.classList.add("done");
    }

    item.innerHTML = `
      <span class="check-icon">${checked.includes(index) ? "✓" : ""}</span>
      <span class="check-text">${text}</span>
    `;

    checklist.appendChild(item);
  });
}

function updateSelection() {
  const items = Array.from(document.querySelectorAll(".check-item"));

  items.forEach(item => item.classList.remove("selected"));

  if (items[selectedCheckIndex]) {
    items[selectedCheckIndex].classList.add("selected");
  }
}

function nextStep() {
  if (!steps.length) return;

  currentStepIndex = (currentStepIndex + 1) % steps.length;
  selectedCheckIndex = 0;
  render();
}

function previousStep() {
  if (!steps.length) return;

  currentStepIndex = (currentStepIndex - 1 + steps.length) % steps.length;
  selectedCheckIndex = 0;
  render();
}

function moveSelection(direction) {
  if (!steps.length) return;

  const count = steps[currentStepIndex].checks.length;

  selectedCheckIndex += direction;

  if (selectedCheckIndex < 0) {
    selectedCheckIndex = count - 1;
  }

  if (selectedCheckIndex >= count) {
    selectedCheckIndex = 0;
  }

  updateSelection();
}

function toggleCheck() {
  if (!steps.length) return;

  const checked = getChecked(currentStepIndex);
  const index = selectedCheckIndex;
  const position = checked.indexOf(index);

  if (position >= 0) {
    checked.splice(position, 1);
  } else {
    checked.push(index);
  }

  saveChecked(currentStepIndex, checked);
  render();

  const selected = document.querySelector(".check-item.selected");

  if (selected) {
    selected.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(0.96)" },
        { transform: "scale(1)" }
      ],
      { duration: 150 }
    );
  }
}

function resetDemo() {
  localStorage.removeItem(storageKey);
  savedState = {};

  currentStepIndex = 0;
  selectedCheckIndex = 0;

  render();
}

document.addEventListener("keydown", event => {
  switch (event.key) {
    case "ArrowRight":
      nextStep();
      break;

    case "ArrowLeft":
      previousStep();
      break;

    case "ArrowDown":
      moveSelection(1);
      break;

    case "ArrowUp":
      moveSelection(-1);
      break;

    case "Enter":
      toggleCheck();
      break;

    case "Escape":
      currentStepIndex = 0;
      selectedCheckIndex = 0;
      render();
      break;

    case "r":
    case "R":
      resetDemo();
      break;
  }
});

loadProcedure();