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
}

// --- Configuration ---
const COLORS = {
  ACCURATE: "#4ade80", // Green
  MODERATE: "#facc15", // Yellow
  HALLUCINATION: "#ef4444", // Red
};

// --- Initialization ---
const container = document.getElementById("app");
if (!container) throw new Error("Root element #app not found");

// Configure the Globe via constructor (init is private)
// We rely on Gralobe to handle the rendering of the statistic
const globe = new GlobeViz(container, {
  texture: "dark", // Matches our theme
  // labels: "data", // Default is now "data", so we can omit or be explicit
  effects: {
    atmosphere: true,
    atmosphereIntensity: 0.35, // Slightly increased for better "quality" feel
    glowPulse: true, // Subtle pulse for AI/Tech feel
    gridLines: false,
  },
});

function updateStats(count: number, avgError: number) {
  const ui = document.getElementById("stats");
  if (!ui) return;
  const color =
    avgError < 0.05
      ? COLORS.ACCURATE
      : avgError < 0.2
      ? COLORS.MODERATE
      : COLORS.HALLUCINATION;
  ui.innerHTML = `
        <div class="stat-row">
            <span class="stat-label">Datapoints</span> 
            <span class="stat-value font-mono">${count}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Global Error</span> 
            <span class="stat-value font-mono" style="color: ${color}">
                ${(avgError * 100).toFixed(1)}%
            </span>
        </div>
    `;
}

// --- Processing Logic ---

function processJson(json: InspectLog) {
  if (!json.samples || !Array.isArray(json.samples)) {
    throw new Error("Invalid format: 'samples' array missing.");
  }

  // Map samples to ID -> Value
  const values: Record<string, number> = {};
  let totalError = 0;
  let count = 0;

  json.samples.forEach((sample) => {
    const country = sample.metadata.country;

    let errorRate = 0;
    const scores = sample.scores ? Object.values(sample.scores) : [];
    if (scores.length > 0 && typeof scores[0].value === "number") {
      errorRate = scores[0].value;
    }

    values[country] = errorRate; // 0.0 to 1.0+
    totalError += errorRate;
    count++;
  });

  // Calculate stats
  const avgError = count > 0 ? totalError / count : 0;
  updateStats(count, avgError);

  // Construct StatisticData
  const statistic = {
    definition: {
      id: "hallucination_index",
      name: "Hallucination Index",
      unit: "%",
      description: "Relative error in statistical recall",
      colorScale: [COLORS.ACCURATE, COLORS.MODERATE, COLORS.HALLUCINATION] as [
        string,
        string,
        string
      ],
      domain: [0, 0.5] as [number, number],
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    values: values,
  };

  // Update Globe
  globe.setStatistic(statistic);
}

// --- Demo & Simulation Logic ---
async function loadDemoData() {
  try {
    const title = document.querySelector("#ui h1");
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

function runSimulation() {
  const title = document.querySelector("#ui h1");
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
        sim: { value: errorRate, explanation: "Simulated" },
      },
      metadata: {
        country: country,
        year: 2022,
        metric: "sim_metric",
        actual_value: 0,
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
      processJson({ samples: demoData });
      const title = document.querySelector("#ui h1");
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
          };
        });

        processJson({ samples: popData });
        const title = document.querySelector("#ui h1");
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
  const topic = topicInput.value.trim() || "GDP 2022";
  // HARDENED PROMPT: Explicitly forbids markdown and conversational filler
  const prompt = `
SYSTEM INSTRUCTION: You are a strict JSON Generator.
Topic: "${topic}"

TASK:
Generate a JSON object containing statistical accuracy tests for the above topic.
1. Output MUST be valid, parseable JSON.
2. Do NOT wrap output in markdown code blocks (e.g. no \`\`\`json ... \`\`\`).
3. Do NOT include any conversational text before or after the JSON.
4. The structure must EXACTLY match this schema:

{
  "samples": [
    {
      "input": "Question string...",
      "target": "Expected Answer",
      "scores": {
        "metric": {
          "value": 0.5  // Number between 0.0 (Perfect) and 1.0 (Total Hallucination)
        }
      },
      "metadata": {
        "country": "Country Name",
        "actual_value": 12345
      }
    }
  ]
}

REQUIREMENTS:
- Generate at least 20 diverse countries.
- "value" 0.0 represents accurate data (Green).
- "value" 1.0 represents specific hallucination (Red).
- Ensure "country" names are standard English (e.g., "France", "United States").

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

    // Normalize structure if simplified JSON is pasted
    if (!json.samples && Array.isArray(json)) {
      processJson({ samples: json });
    } else {
      processJson(json);
    }

    researchOverlay?.classList.remove("visible");
    // 5. Update UI
    const title = document.querySelector("#ui h1");
    if (title) {
      // Try to infer topic from first input or generic
      let topic = "Custom Knowledge";
      // Assuming `log` and `data` are accessible or can be derived from `json`
      // For this context, `json` is the parsed InspectLog.
      // `data` would typically be the processed data points for the globe,
      // which `processJson` would generate. We'll use `json.samples.length` for count.
      if (json.samples && json.samples.length > 0) {
        const input = json.samples[0].input;
        // Heuristic: Extract "What is [TOPIC] of..."
        const match = input.match(/What is (.*?) of/i);
        if (match && match[1]) topic = match[1];
      }
      title.innerHTML = `Visualizing: <span style="color: #646cff">${topic}</span> (${
        json.samples?.length || 0
      } Countries)`;
    }

    const legendTitle = document.querySelector("#legend h3");
    if (legendTitle)
      legendTitle.textContent = "Hallucination Error Rate (0=Truth, 1=Lie)";
  } catch (e) {
    console.error(e);
    alert("Invalid JSON. Please ensure the AI output is clean JSON.");
  }
});

// --- Drag & Drop Handler ---
// --- Configuration GUI ---
import GUI from "lil-gui";

// Wait for globe to be ready implicitly or just init GUI
const gui = new GUI({ title: "Globe Settings" });
gui.domElement.style.position = "absolute";
gui.domElement.style.top = "24px";
gui.domElement.style.right = "24px";

// Configuration State
const config = {
  atmosphere: 0.35,
  glow: true,
  clouds: false,
  grid: false,
  cityLights: false,
  labels: "data" as "all" | "data" | "none",
  screenshot: () => {
    globe.screenshot({ filename: "hallucination-heatmap.png" });
  },
};

// Bind controls to Globe API
const visuals = gui.addFolder("Visuals");
visuals
  .add(config, "atmosphere", 0, 1.0)
  .name("Atmosphere")
  .onChange((v: number) => {
    globe.setEffects({ atmosphereIntensity: v });
  });
visuals
  .add(config, "glow")
  .name("AI Pulse")
  .onChange((v: boolean) => {
    globe.setEffects({ glowPulse: v });
  });
visuals
  .add(config, "clouds")
  .name("Clouds")
  .onChange((v: boolean) => {
    globe.setEffects({ clouds: v });
  });
visuals
  .add(config, "grid")
  .name("Grid Lines")
  .onChange((v: boolean) => {
    globe.setEffects({ gridLines: v });
  });
visuals
  .add(config, "cityLights")
  .name("City Lights")
  .onChange((v: boolean) => {
    globe.setEffects({ cityLights: v });
  });

gui
  .add(config, "labels", ["all", "data", "none"])
  .name("Labels")
  .onChange((v: any) => {
    globe.setLabels(v);
  });

gui.add(config, "screenshot").name("📸 Screenshot");
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
