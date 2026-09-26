# 03 — AI Text Detector & Humanizer

## Part A — AI Text Detector

### Goal
User pastes text → we return the probability it was AI-generated, highlight the sentences that look AI-written, and explain why.

### How detection works (our approach: ensemble)

| Signal | How | Notes |
|--------|-----|-------|
| **1. Classifier model** (main signal) | Fine-tuned **DeBERTa-v3 / RoBERTa-large** binary classifier (human vs AI) | Trained on public + our own generated data (see datasets below) |
| **2. Perplexity** | Score text with a small LM (e.g. GPT-2 / Llama-3.2-1B / Qwen-1.5B); AI text tends to have low, even perplexity | Token-level log-probs |
| **3. Burstiness** | Variance of perplexity and sentence length across sentences; humans are "burstier" | Cheap to compute |
| **4. Binoculars-style score** | Ratio of perplexity between two related LMs (observer/performer) — a strong zero-shot detector from research | Good at catching newer models without retraining |
| **5. Stylometric features** | Type-token ratio, sentence-length distribution, punctuation habits, "AI-tell" phrases (*delve, tapestry, moreover, in today's fast-paced world, it's important to note*), em-dash overuse, list-heavy structure | Also powers the "why" explanation |

A small **meta-model** (logistic regression / gradient boosting) combines these into the final 0–100% score and is calibrated (Platt / isotonic) so "80%" actually means ~80% of such texts are AI in validation.

### Sentence-level highlighting
- Split into sentences (spaCy / `pysbd`).
- Score each sentence with a sliding window of context (sentence ± neighbors) through the classifier.
- Color: green (<30%), yellow (30–70%), red (>70%).

### Output
```json
{
  "aiProbability": 0.87,
  "label": "likely_ai",          // likely_human | mixed | likely_ai
  "confidence": "high",
  "wordCount": 412,
  "sentences": [ { "text": "...", "start": 0, "end": 84, "ai": 0.92 } ],
  "signals": { "perplexity": 12.4, "burstiness": 0.18, "binoculars": 0.81, "aiPhrases": ["delve", "moreover"] },
  "explanation": ["Very uniform sentence length", "Low perplexity throughout", "Contains 6 common AI phrases"]
}
```

### Training datasets (public, check licenses before commercial use)
- **RAID** (large multi-model, multi-domain, includes adversarial attacks) — best starting point.
- **HC3** (Human vs ChatGPT answers).
- **M4 / M4GT** (multi-generator, multi-domain).
- **MAGE / DeepfakeTextDetect**.
- **Our own generated set**: take human texts (Wikipedia, Reddit/essays with permissive licenses, news, reviews) → generate AI versions of the same topics with GPT-4o, Claude, Gemini, Llama, Mistral, DeepSeek, Qwen → balanced dataset. Refresh every time a major new model ships.
- Include **paraphrased/humanized AI text** (from competitor humanizers and our own) labeled as AI, so the detector stays robust.

### Model training & serving
- Train on a single A100/H100 (a few hours for DeBERTa-large) using Hugging Face `transformers` + `datasets`.
- Evaluate: AUROC, F1, **false positive rate on human text** (most important — must stay < 2–3%), per-domain and per-generator breakdown.
- Serve with FastAPI on a GPU (Modal / RunPod / HF Inference Endpoints). Export to ONNX for faster CPU fallback.
- Minimum input: 80 words (below that, show "not enough text for a reliable result").

### Honesty in the UI
AI detection is probabilistic. Show confidence, never say "this was definitely written by AI", and include a note that results should not be the sole basis for academic or employment decisions.

---

## Part B — Humanizer

### Goal
Rewrite AI-sounding text so it reads like a real person wrote it, keeping the original meaning, facts, and structure the user cares about.

### The "≤ 20% on other detectors" requirement — realistic framing
- This is set as a **measured quality target**, not an absolute guarantee. Third-party detectors (GPTZero, Originality.ai, Turnitin, Copyleaks, Winston, ZeroGPT, etc.) retrain constantly, so any fixed rewrite method degrades over time.
- **Target:** ≥ 90% of benchmark samples score ≤ 20% AI on each tracked detector, re-measured weekly (see doc 10).
- To hit and keep that target we need: (1) a strong multi-stage pipeline, (2) a detector feedback loop at generation time, (3) a continuous benchmark against real detectors, and (4) periodic retraining of our rewrite model.
- **Turnitin has no public API**, so it can only be checked manually / via institutional access. Don't advertise results for detectors we can't measure.
- Marketing copy should say something like "consistently scores as human on leading detectors" backed by a published benchmark, not "100% undetectable".

### What makes text read as AI (what we remove)
- Uniform sentence length and rhythm; low burstiness.
- Highly probable word choices (low perplexity).
- Stock phrases and transitions (*furthermore, moreover, in conclusion, it's worth noting, delve, landscape, robust, seamless, leverage*).
- Perfect parallel structure, rule-of-three lists, symmetrical paragraphs.
- Em-dash overuse, colon-led lists, headings everywhere.
- Hedging + over-politeness, generic conclusions that restate the intro.
- No personal voice, no concrete specifics, no contractions.

### Rewrite pipeline

```
input text
 │
 ├─ 1. Analyze
 │     - Run detector → sentence scores
 │     - Extract "protected spans": names, numbers, dates, quotes, citations, URLs, code, technical terms
 │     - Detect tone/genre (academic, blog, email, marketing...)
 │
 ├─ 2. Rewrite (chunked by paragraph, with document context)
 │     - Primary: LLM with a carefully engineered style prompt
 │       (vary sentence length, use contractions where tone allows, replace stock phrases,
 │        break symmetry, add natural transitions, keep protected spans verbatim)
 │     - Phase 2+: our own fine-tuned open model (Llama/Qwen/Mistral 7–8B, LoRA)
 │       trained on (AI text → human text) pairs — this is the biggest lever for beating detectors
 │     - Higher sampling temperature / nucleus sampling to raise perplexity naturally
 │
 ├─ 3. Post-process (deterministic)
 │     - Replace remaining blacklist phrases with varied alternatives
 │     - Normalize em-dashes / excessive colons
 │     - Sentence length variation check (split/merge where too uniform)
 │     - Restore protected spans exactly
 │
 ├─ 4. Quality gates
 │     - Meaning preservation: embedding cosine similarity ≥ 0.85 (e.g. `bge-large` / `text-embedding-3-small`)
 │       + NLI check (original entails rewrite and vice versa) per paragraph
 │     - Fact check: all numbers/names/protected spans present
 │     - Grammar check (LanguageTool) — must stay readable, no intentional typos
 │     - Length within ±15% of original (unless mode says otherwise)
 │
 ├─ 5. Detector feedback loop
 │     - Score output with OUR detector ensemble
 │     - Any paragraph still > threshold → rewrite that paragraph again with a stronger instruction
 │     - Max 3 iterations to control cost/latency
 │
 └─ output: humanized text + new AI score + similarity score + diff view
```

### Modes & controls
| Control | Options |
|---------|---------|
| Tone | Standard, Casual, Professional, Academic, Creative, Simple (easy-read) |
| Strength | Light (minimal edits), Balanced, Aggressive (maximum rewrite) |
| Keep | Toggle: keep formatting (headings/lists), keep length, keep specific words (user list) |
| Language | English v1; more later |

### Training our own rewrite model (phase 2 — key to the 20% target)
1. **Collect human writing** across genres (licensed/permissive sources, user-consented samples).
2. **Create pairs**: generate AI versions of the same content → pair (AI version → original human text). The model learns to map AI style to human style.
3. **Fine-tune** an open 7–8B model with LoRA/QLoRA (Unsloth / Axolotl) on ~50k–200k pairs.
4. **Preference tuning (DPO)**: for each input, generate several rewrites, rank them by (low detector score across our ensemble + external detector samples, high meaning similarity, good grammar), train on best vs worst.
5. Re-run steps 2–4 whenever the benchmark shows a detector's pass rate dropping below 90%.

### Latency & cost targets
- Detection: < 3s for 1,000 words.
- Humanize: < 20s for 1,000 words (streamed so the user sees output quickly).
- Cost per 1,000 words humanized: aim < $0.02 with a fine-tuned self-hosted model; ~$0.01–0.05 via commercial LLM APIs depending on model and iterations.

### What you need for this feature
- **LLM API** (OpenAI and/or Anthropic) for v1 rewriting and synthetic data generation; ideally keys for Gemini, Mistral, DeepSeek too for dataset diversity.
- **GPU hosting** (Modal / RunPod / HF Endpoints) for detector + later the fine-tuned rewrite model.
- **Hugging Face account** for datasets and model hosting (private repos).
- **Third-party detector API keys for benchmarking** (paid): GPTZero, Originality.ai, Copyleaks, Winston AI, Sapling; ZeroGPT/others via their APIs where available. Check each one's ToS on automated benchmarking.
- **LanguageTool** (self-hosted Docker or API) for grammar checks.
- Python packages: `fastapi`, `uvicorn`, `torch`, `transformers`, `datasets`, `sentence-transformers`, `spacy`, `pysbd`, `scikit-learn`, `textstat`, `peft`, `trl`, `unsloth` (training), `onnxruntime`.
- File parsing for uploads: `mammoth` (docx), `pdf-parse` (pdf) on the Node side.
