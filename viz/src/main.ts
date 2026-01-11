import { GlobeViz } from "gralobe";

// --- Types (Local) ---
interface InspectScore {
  value: number;
  explanation?: string;
  answer?: string;
}

interface InspectSample {
  input: string;
  target: string;
  scores?: Record<string, InspectScore>;
  metadata: {
    country: string;
    year: number;
    metric: string;
    actual_value: string | number;
    [key: string]: any;
  };
}

interface InspectLog {
  samples: InspectSample[];
  status?: string;
  meta?: {
    topic?: string;
    description?: string;
    metric?: string;
  };
}

// --- Initialization ---
const containerLeft = document.getElementById("app-left");
const containerRight = document.getElementById("app-right");
if (!containerLeft || !containerRight)
  throw new Error("Globe containers not found");

// Configure Globes
// Force cast to any to avoid strict TexturePreset enum issues during quick hackathon iterations
const globeOptions: any = {
  texture: "dark",
  labels: "all", // SHOW ALL LABELS BY DEFAULT as requested
  effects: {
    atmosphere: true,
    atmosphereIntensity: 0.25,
    glowPulse: true,
    gridLines: false, // Default off for cleaner look
  },
};

// ... existing code ...

// --- Methodology Modal Logic ---
const btnMethodology = document.getElementById("btn-methodology");
const methodologyOverlay = document.getElementById("methodology-overlay");
const closeMethodology = document.getElementById("close-methodology");

if (btnMethodology && methodologyOverlay && closeMethodology) {
  btnMethodology.addEventListener("click", () => {
    methodologyOverlay.classList.add("visible");
  });
  closeMethodology.addEventListener("click", () => {
    methodologyOverlay.classList.remove("visible");
  });
  methodologyOverlay.addEventListener("click", (e) => {
    if (e.target === methodologyOverlay)
      methodologyOverlay.classList.remove("visible");
  });
}

const globeLeft = new GlobeViz(containerLeft, globeOptions);
const globeRight = new GlobeViz(containerRight, globeOptions);

// IMMEDIATELY set placeholder statistics to override gralobe's default
// This prevents gralobe's "Life Expectancy" from showing before demo loads
globeLeft.setStatistic({
  definition: {
    id: "init_context",
    name: "GDP (USD Billions)", // Clear name for demo
    unit: "USD B",
    description: "Actual GDP values",
    colorScale: ["#1c1917", "#5eead4", "#2dd4bf"],
    domain: [0, 5000],
    format: (v: number) => `$${v}B`,
  },
  values: {},
});
globeRight.setStatistic({
  definition: {
    id: "init_risk",
    name: "AI Error Rate", // Clear name
    unit: "%",
    description: "How wrong the AI was",
    colorScale: ["#86efac", "#fbbf24", "#f43f5e"],
    domain: [0, 1],
    format: (v: number) => `${(v * 100).toFixed(0)}%`,
  },
  values: {},
});

// Simplified updateStats that takes no args
// function updateStats removed

// --- Processing Logic ---

// --- Global State ---
let currentJson: InspectLog | null = null;
let currentMode: "mpe" | "grader" | "consensus" = "mpe";

// --- Toggle Logic ---
const btnMpe = document.getElementById("btn-mode-mpe");
const btnGrader = document.getElementById("btn-mode-grader");
const btnConsensus = document.getElementById("btn-mode-consensus");

if (btnMpe && btnGrader && btnConsensus) {
  btnMpe.addEventListener("click", () => setMode("mpe"));
  btnGrader.addEventListener("click", () => setMode("grader"));
  btnConsensus.addEventListener("click", () => setMode("consensus"));
}

function setMode(mode: "mpe" | "grader" | "consensus") {
  currentMode = mode;
  // Update UI - clear all, then add to active
  btnMpe?.classList.remove("active");
  btnGrader?.classList.remove("active");
  btnConsensus?.classList.remove("active");
  if (mode === "mpe") btnMpe?.classList.add("active");
  else if (mode === "grader") btnGrader?.classList.add("active");
  else if (mode === "consensus") btnConsensus?.classList.add("active");
  // Re-process data if exists
  if (currentJson) processJson(currentJson);
}

function processJson(json: InspectLog) {
  currentJson = json; // Store for toggling
  if (!json.samples || !Array.isArray(json.samples)) {
    throw new Error("Invalid format: 'samples' array missing.");
  }

  // Right Globe: Score
  const errorValues: Record<string, number> = {};
  // Left Globe: Context
  const contextValues: Record<string, number> = {};

  const topic = json.meta?.topic || "Data Analysis";
  const metricName = json.meta?.metric || "Value";

  json.samples.forEach((sample) => {
    const country = sample.metadata.country;
    let score = 0;

    if (currentMode === "mpe") {
      // Standard MPE from scorer
      const scores = sample.scores ? Object.values(sample.scores) : [];
      if (scores.length > 0 && typeof scores[0].value === "number") {
        score = scores[0].value;
      }
    } else if (currentMode === "grader") {
      // AI Grader Mode
      if (sample.scores?.model_grader) {
        score = 1 - sample.scores.model_grader.value;
      } else {
        const mpe = sample.scores?.mpe_scorer?.value || 0;
        score = mpe;
      }
    } else if (currentMode === "consensus") {
      // Cross-Model Consensus: Low consensus = high risk
      if (sample.scores?.consensus) {
        // Consensus is 0-1 (1 = all models agree). We invert for risk display.
        score = 1 - sample.scores.consensus.value;
      } else {
        // Fallback: use variance if available, or MPE
        const mpe = sample.scores?.mpe_scorer?.value || 0;
        score = mpe;
      }
    }

    errorValues[country] = score;

    // Context (Left Globe) - Same as before
    let actualVal = 0;
    if (typeof sample.metadata.actual_value === "number") {
      const raw = sample.metadata.actual_value;
      if (raw > 1e12) actualVal = raw / 1e12;
      else if (raw > 1e9) actualVal = raw / 1e9;
      else actualVal = raw;
    } else {
      actualVal = 1;
    }
    contextValues[country] = actualVal;
  });

  // --- Right Globe Config ---
  let globeConfig: {
    id: string;
    name: string;
    description: string;
    colorScale: [string, string, string];
  };

  if (currentMode === "mpe") {
    globeConfig = {
      id: "mpe_error",
      name: "Statistical Error",
      description: "Mean Percentage Error (MPE)",
      colorScale: ["#86efac", "#fbbf24", "#f43f5e"], // Green -> Amber -> Red
    };
  } else if (currentMode === "grader") {
    globeConfig = {
      id: "grader_risk",
      name: "AI Grade (Inverted)",
      description: "100% - Quality Score from GPT-5 Nano",
      colorScale: ["#86efac", "#60a5fa", "#a855f7"], // Green -> Blue -> Purple
    };
  } else {
    globeConfig = {
      id: "consensus_risk",
      name: "Model Disagreement",
      description: "Low consensus = high uncertainty",
      colorScale: ["#86efac", "#22d3ee", "#f97316"], // Green -> Cyan -> Orange (Debate zones)
    };
  }

  globeRight.setStatistic({
    definition: {
      id: globeConfig.id,
      name: globeConfig.name,
      unit: "%",
      description: globeConfig.description,
      colorScale: globeConfig.colorScale,
      domain: [0, 0.5],
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    values: errorValues,
  });

  // --- Left Globe Config ---
  globeLeft.setStatistic({
    definition: {
      id: "context_index",
      name: topic,
      unit: metricName,
      description: `Reference Data`,
      colorScale: ["#1c1917", "#5eead4", "#2dd4bf"],
      domain: [0, 30],
      format: (v: number) => `$${v.toFixed(1)}T`,
    },
    values: contextValues,
  });
}

// ... existing code ...

// --- Demo & Simulation Logic ---
async function loadDemoData() {
  try {
    const title = document.querySelector("#header-text p"); // Subtitle
    if (title) title.textContent = "Loading Demo...";

    const res = await fetch("/demo_data.json");
    if (!res.ok) throw new Error("Could not load demo data");

    const json = (await res.json()) as InspectLog;
    processJson(json);

    if (title) title.textContent = "Demo Data Loaded";
  } catch (e) {
    console.error(e);
    alert("Failed to load demo data");
  }
}

// --- AUTO-LOAD DEMO ON STARTUP ---
fetch("/demo_data.json")
  .then((res) => {
    if (!res.ok) throw new Error("Could not load demo data");
    return res.json();
  })
  .then((json: InspectLog) => {
    // Auto-display on initial load
    processJson(json);
    console.log("Demo data auto-loaded on startup");
  })
  .catch((err) => console.error("Failed to auto-load demo data", err));

function runSimulation() {
  const title = document.querySelector("#header-text p");
  if (title) title.textContent = "Simulating Eval...";

  // Generate random hallucinations for visible countries
  const countries = [
    "United States",
    "China",
    "India",
    "Germany",
    "Japan",
    "United Kingdom",
    "France",
    "Brazil",
    "Italy",
    "Canada",
    "Russia",
    "South Korea",
    "Australia",
    "Spain",
    "Mexico",
    "Indonesia",
    "Turkey",
    "Netherlands",
    "Saudi Arabia",
    "Switzerland",
    "Argentina",
    "Sweden",
    "Poland",
    "Belgium",
    "Thailand",
    "Iran",
    "Austria",
    "Norway",
    "United Arab Emirates",
    "Nigeria",
    "South Africa",
    "Egypt",
    "Vietnam",
    "Pakistan",
  ];

  const syntheticSamples: InspectSample[] = countries.map((country) => {
    // Random error rate:
    // 70% chance of being accurate (<5%)
    // 20% chance of distinct error (10-30%)
    // 10% chance of massive hallucination (>50%)
    const rand = Math.random();
    let errorRate = 0;

    if (rand > 0.9) errorRate = 0.5 + Math.random(); // Hallucination
    else if (rand > 0.7) errorRate = 0.1 + Math.random() * 0.2; // Moderate
    else errorRate = Math.random() * 0.05; // Accurate

    return {
      input: `Simulated Input for ${country}`,
      target: "0",
      scores: {
        metric: { value: errorRate, explanation: "Simulated" },
      },
      metadata: {
        country: country,
        year: 2022,
        metric: "sim_metric",
        actual_value: Math.floor(Math.random() * 1000), // Simulate context value
      },
    };
  });

  processJson({ samples: syntheticSamples });

  if (title) title.textContent = "Simulation Complete";
}

// --- Event Listeners ---
document
  .getElementById("btn-load-demo")
  ?.addEventListener("click", loadDemoData);

// Load demo data once and make it available to other listeners
fetch("/demo_data.json")
  .then((res) => {
    if (!res.ok) throw new Error("Could not load demo data");
    return res.json();
  })
  .then((json: InspectLog) => {
    const demoData = json.samples; // Store the loaded demo data

    // --- Event Listeners with Access to demoData ---

    // Demo 1: GDP
    document.getElementById("btn-demo-gdp")?.addEventListener("click", () => {
      processJson({
        samples: demoData,
        meta: {
          topic: "Global GDP",
          description: "Standard Economic Data",
          metric: "USD (Billions)",
        },
      });
      const title = document.getElementById("app-title");
      if (title)
        title.innerHTML = `Visualizing: <span style="color: #646cff">GPT-5.2 Knowledge on GDP</span> (Synthetic Demo)`;
    });

    // Demo 2: Population (Synthetic)
    document.getElementById("btn-demo-pop")?.addEventListener("click", () => {
      console.log("Population Demo Clicked");
      try {
        // Generate synthetic Population data with Safe Access
        const popData = demoData.map((d: any) => {
          // Safe access to value, default to 0 if missing
          const baseVal = d.scores?.metric?.value ?? d.scores?.sim?.value ?? 0;

          return {
            ...d,
            scores: {
              metric: {
                // Skew errors slightly higher for population
                value: Math.min(
                  1.0,
                  Math.max(0, baseVal * 1.5 + (Math.random() * 0.2 - 0.1))
                ),
              },
            },
            metadata: {
              ...d.metadata,
              actual_value: Math.floor(Math.random() * 1000000), // Fake population
            },
          };
        });

        processJson({
          samples: popData,
          meta: {
            topic: "Global Population",
            description: "Synthetic Bias Test",
            metric: "People",
          },
        });
        const title = document.getElementById("app-title");
        if (title)
          title.innerHTML = `Visualizing: <span style="color: #646cff">GPT-5.2 Knowledge on Population</span> (Synthetic Demo)`;
      } catch (err) {
        console.error("Error in Population Demo:", err);
        alert("Failed to generate population demo. See console.");
      }
    });
  })
  .catch((err) => console.error("Failed to load demo data", err));

// --- Modal Logic ---
const aboutOverlay = document.getElementById("about-overlay");
const researchOverlay = document.getElementById("research-overlay");
const confirmResetOverlay = document.getElementById("confirm-reset-overlay");

document
  .getElementById("btn-about")
  ?.addEventListener("click", () => aboutOverlay?.classList.add("visible"));
document
  .getElementById("close-about")
  ?.addEventListener("click", () => aboutOverlay?.classList.remove("visible"));

document.getElementById("btn-research")?.addEventListener("click", () => {
  console.log("BYO Research Clicked");
  if (researchOverlay) {
    researchOverlay.classList.add("visible");
  } else {
    console.error("Research Overlay not found!");
  }
});
document
  .getElementById("close-research")
  ?.addEventListener("click", () =>
    researchOverlay?.classList.remove("visible")
  );

// Reset Confirmation Logic
document.getElementById("btn-reset")?.addEventListener("click", () => {
  confirmResetOverlay?.classList.add("visible");
});

document.getElementById("btn-cancel-reset")?.addEventListener("click", () => {
  confirmResetOverlay?.classList.remove("visible");
});

document.getElementById("btn-confirm-reset")?.addEventListener("click", () => {
  window.location.reload();
});

// Close on outside click
[aboutOverlay, researchOverlay, confirmResetOverlay].forEach((overlay) => {
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("visible");
  });
});

// --- Research Workflow Logic ---
const topicInput = document.getElementById("topic-input") as HTMLInputElement;
const btnCopyPrompt = document.getElementById("btn-copy-prompt");
const pasteArea = document.getElementById(
  "json-paste-area"
) as HTMLTextAreaElement;
const btnProcessPaste = document.getElementById("btn-process-paste");

btnCopyPrompt?.addEventListener("click", async () => {
  const topic = topicInput.value.trim() || "Global GDP 2024";

  // HARDENED PROMPT: Requests Metadata for UI Context
  const prompt = `
SYSTEM INSTRUCTION: You are a strict JSON Data Generator.
Topic: "${topic}"

TASK:
Generate a JSON object containing statistical accuracy tests for the above topic.
1. Output MUST be valid, parseable JSON.
2. Do NOT wrap output in markdown code blocks.
3. Structure MUST match:

{
  "meta": {
    "topic": "Short Title (e.g. 'Pet Ownership Rates')",
    "description": "Brief explanation of what '1.0' error means in this context",
    "metric": "Unit (e.g. % of households)"
  },
  "samples": [
    {
      "input": "Question...",
      "target": "Real Answer",
      "scores": {
        "metric": { "value": 0.5 } // 0.0=Accurate, 1.0=Hallucination
      },
      "metadata": {
        "country": "Country Name",
        "actual_value": 12345
      }
    }
  ]
}

REQUIREMENTS:
- Generate 20+ diverse countries.
- "value" 0.0 = Accurate.
- "value" 1.0 = Massive Hallucination / Fabrication.
- Use standard English country names.

BEGIN JSON OUTPUT:
`.trim();

  try {
    await navigator.clipboard.writeText(prompt);
    const originalText = btnCopyPrompt.textContent;
    btnCopyPrompt.textContent = "Copied!";
    setTimeout(() => (btnCopyPrompt.textContent = originalText), 2000);
  } catch (err) {
    alert("Failed to copy. Please manually copy the prompt logic.");
  }
});

// --- Header Toggle Logic ---
const header = document.getElementById("hud-header");
const toggleArea = document.getElementById("header-toggle-area");
const minBtn = document.getElementById("btn-minimize-header");

function toggleHeader() {
  header?.classList.toggle("minimized");
}

toggleArea?.addEventListener("click", toggleHeader);
minBtn?.addEventListener("click", (e) => {
  e.stopPropagation(); // Prevent double trigger
  toggleHeader();
});

btnProcessPaste?.addEventListener("click", () => {
  try {
    let text = pasteArea.value.trim();

    // Robustness: Strip markdown code blocks if the AI disobeyed
    if (text.startsWith("```json")) {
      text = text.replace(/^```json/, "").replace(/```$/, "");
    } else if (text.startsWith("```")) {
      text = text.replace(/^```/, "").replace(/```$/, "");
    }

    const json = JSON.parse(text) as InspectLog;

    // Support legacy/array format dynamically
    if (!json.samples && Array.isArray(json)) {
      processJson({ samples: json });
    } else {
      processJson(json);
    }

    researchOverlay?.classList.remove("visible");

    // 5. Update UI Context (Header)
    const title = document.getElementById("app-title");
    const subtitle = document.getElementById("app-subtitle");

    // Use metadata if available, otherwise fallback
    const topic = json.meta?.topic || "Custom Analysis";
    const desc =
      json.meta?.description ||
      `Visualizing ${json.samples?.length || 0} Data Points`;

    if (title && subtitle) {
      title.innerHTML = `Analysis: <span style="color: #22d3ee">${topic}</span>`;
      subtitle.textContent = desc;
    }

    // 6. Update Legend Context
    const legendTitle = document.getElementById("legend-title");
    const legendSubtitle = document.getElementById("legend-subtitle");

    if (legendTitle) {
      legendTitle.textContent = "Hallucination Confidence";
    }
    if (legendSubtitle && json.meta?.metric) {
      legendSubtitle.innerHTML = `Metric: <span style="color: #cbd5e1">${json.meta.metric}</span>`;
      legendSubtitle.style.color = "#22d3ee";
    }
  } catch (e) {
    console.error(e);
    alert("Invalid JSON. Please ensure the AI output is clean JSON.");
  }
});

// --- Drag & Drop Handler ---
// --- Configuration GUI ---
import GUI from "lil-gui";

const gui = new GUI({ title: "⚙️ Both Globes" }); // Clear that it affects both
// Position: TOP-LEFT of the left globe panel area
gui.domElement.style.position = "fixed";
gui.domElement.style.top = "100px"; // Below header
gui.domElement.style.left = "24px";
gui.domElement.style.bottom = "auto";
gui.domElement.style.right = "auto";

// Helper to sync effects
function setGlobalEffects(effects: any) {
  globeLeft.setEffects(effects);
  globeRight.setEffects(effects);
}

const config = {
  atmosphere: 0.25,
  glow: true,
  clouds: false,
  grid: false,
  cityLights: false,
  labels: "data" as "all" | "data" | "none",
  screenshot: () => {
    // Screenshot right globe (Analysis) by default or maybe both?
    // Gralobe API likely supports one.
    globeRight.screenshot({ filename: "hallucination-analysis.png" });
  },
};

const visuals = gui.addFolder("Visuals");
visuals
  .add(config, "atmosphere", 0, 1.0)
  .name("Atmosphere")
  .onChange((v: number) => setGlobalEffects({ atmosphereIntensity: v }));
visuals
  .add(config, "glow")
  .name("AI Pulse")
  .onChange((v: boolean) => setGlobalEffects({ glowPulse: v }));
visuals
  .add(config, "clouds")
  .name("Clouds")
  .onChange((v: boolean) => setGlobalEffects({ clouds: v }));
visuals
  .add(config, "grid")
  .name("Grid Lines")
  .onChange((v: boolean) => setGlobalEffects({ gridLines: v }));
visuals
  .add(config, "cityLights")
  .name("City Lights")
  .onChange((v: boolean) => setGlobalEffects({ cityLights: v }));

gui
  .add(config, "labels", ["all", "data", "none"])
  .name("Labels")
  .onChange((v: any) => {
    globeLeft.setLabels(v);
    globeRight.setLabels(v);
  });

gui.add(config, "screenshot").name("📸 Snap Analysis");
// --- Drag & Drop Handler ---
function setupDragDrop() {
  const dropZone = document.body;
  const dropOverlay = document.getElementById("drop-overlay");

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropOverlay?.classList.remove("hidden");
    dropOverlay!.style.opacity = "1";
  });

  dropZone.addEventListener("dragleave", (e) => {
    // Only hide if we actually left the window/body
    if (
      e.relatedTarget === null ||
      e.relatedTarget === document.documentElement
    ) {
      dropOverlay!.style.opacity = "0";
      setTimeout(() => dropOverlay?.classList.add("hidden"), 200);
    }
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropOverlay!.style.opacity = "0";
    setTimeout(() => dropOverlay?.classList.add("hidden"), 200);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const json = JSON.parse(ev.target?.result as string) as InspectLog;
            // Normalize structure if simplified JSON is pasted
            if (!json.samples && Array.isArray(json)) {
              // Handle raw array paste if user made a mistake
              processJson({ samples: json });
            } else {
              processJson(json);
            }

            const title = document.querySelector("#ui h1");
            if (title) title.textContent = "Analysis Loaded";
          } catch (err) {
            alert("Error parsing JSON file: " + err);
          }
        };
        reader.readAsText(file);
      } else {
        alert("Please drop a valid .json file");
      }
    }
  });
}

// Binds
document.getElementById("btn-demo")?.addEventListener("click", loadDemoData);
document.getElementById("btn-sim")?.addEventListener("click", runSimulation);

setupDragDrop();

// Pitch Modal Logic
const pitchOverlay = document.getElementById("pitch-overlay");
const btnPitch = document.getElementById("btn-pitch");
const closePitch = document.getElementById("close-pitch");

btnPitch?.addEventListener("click", () => {
  pitchOverlay?.classList.add("visible");
});

closePitch?.addEventListener("click", () => {
  pitchOverlay?.classList.remove("visible");
});

pitchOverlay?.addEventListener("click", (e) => {
  if (e.target === pitchOverlay) {
    pitchOverlay.classList.remove("visible");
  }
});
