# AI Manipulation Hackathon: Project Brainstorming & Ideas

This repository serves as a workspace for the "AI Manipulation" hackathon. The goal is to build small, hacky, creative, and valuable open-source tools to measure, detect, or mitigate AI manipulation.

**Context**: [Inspect Tool](https://inspect.aisi.org.uk/) | [Hackathon Info](https://apartresearch.com/)

---

## 🧠 Pivot: The "Global Hallucination Index" (Using Gralobe + Inspect)

We will build a tool that _visualizes AI reliability_ on a global scale. This directly complements MapTheory's goal of using AI for research by answering: "Where can we trust the AI?"

### Selected Idea: "The Hallucination Heatmap"

**Concept**: A visual benchmark that evaluates an LLM's statistical accuracy for every country on Earth and maps the "Error Rate" onto a 3D Globe.

- **Why this matters**:

  - **Bias Detection**: Does ChatGPT hallucinate more about the Global South than the West?
  - **Safety**: If an educational app (like MapTheory) uses AI stats, _which countries_ need manual verification?
  - **Ecological Validity**: We aren't testing logic puzzles; we are testing _real-world knowledge retrieval_.

- **The Workflow**:
  1.  **Ground Truth**: We fetch a reliable dataset (e.g., World Bank 2023 GDP per capita) for 195 countries.
  2.  **Inspect Eval**: We use `inspect-ai` to ask the model: _"What was the GDP per capita of [Country] in 2023?"_ for all 195 countries.
  3.  **Scoring**: We calculate the `% Error` ($|Predicted - Actual| / Actual$).
  4.  **Viz (Gralobe)**: We feed this JSON into a generic `Gralobe` viewer.
      - **Color**: Green (Accurate) $\to$ Red (Hallucinated).
      - **Height**: Model Confidence (if available) or Magnitude of Error.

### Features

- **"StatGuard" Library**: The core python scoring logic can be extracted as a reusable library (`pip install statguard`) for any app to validate AI numbers.
- **Interactive Globe**: Click a country to see "What the AI said" vs "Reality".

---

## 🛠 Tech Stack Plan

1.  **Evaluation (Python / Inspect)**

    - Use `inspect-ai` to define the task.
    - Dataset: `pandas` integration with World Bank API.
    - Output: Standard Inspect JSON logs.

2.  **Visualization (TypeScript / Gralobe)**
    - Minimal web app in `viz/`.
    - Parse Inspect JSON logs.
    - Render using `Gralobe` (reusing the library from the parent workspace).

---

## 🚀 Execution Plan (Weekend)

1.  **Data Prep**: Download "Ground Truth" CSV (GDP, Population, CO2).
2.  **Inspect Task**: Write `evals/global_knowledge.py`.
3.  **Run**: Evaluate `gpt-4o-mini` (cheap/fast) on 200 countries.
4.  **Viz**: Build a simple HTML page that imports `Gralobe` and renders the error map.
