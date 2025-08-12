# AI Desktop Automation – MVP Specification

## 1) Problem & Goals

**Problem.** Knowledge workers repeat multi-step computer tasks across apps (files, browser, email). Existing RPA tools are heavy; scripting assumes developer skills.

**Goal (MVP).** Let a user **teach by demonstration + narration**, then **replay reliably** with minimal setup. Emphasis on desktop + web workflows on **Windows** first.

**Primary use cases (MVP):**

- Mail-merge style outreach using spreadsheet + Gmail/Outlook.
- File ops: rename/move/export batches, fill forms on a web portal.
- Data “copy-paste” bridges between two apps or a file and a web form.

**Non-goals (MVP):** Native mobile apps; complex Citrix/VDI; privileged OS automation; human-in-the-loop marketplaces.

---

## 2) User Personas & Top Jobs

- **Solo Professional (primary).** Non-technical user who repeats a weekly admin chore. Needs reliability, guardrails.
- **Ops Specialist (secondary).** Creates flows for colleagues; wants parameterization and scheduling.

**Top Jobs to be Done:**

1. _Record a task once_ and store as a reusable “Flow”.
2. _Run a Flow safely_ with variables filled from a spreadsheet or prompt.
3. _Verify & recover_ when something changes (UI moved, network slow).

---

## 3) Success Metrics (MVP)

- T=Day 14: 80% of recorded Flows can run end-to-end at least twice without edit.
- Median Flow creation time ≤ 5 min for a 10–15 step task.
- <2% misclick rate per 100 actions (measured via guard checks).
- NPS ≥ 30 from pilot users; at least 3 distinct weekly use cases executed 3+ times.

---

## 4) System Overview

The app captures **semantic actions** via OS accessibility APIs & browser hooks, translates them into a **Flow DSL**, and replays with resilient selectors, waits, and guard checks. Where available, it uses **first-party APIs** (e.g., Gmail/Outlook) instead of UI automation.

**Key subsystems:** Recorder, STT/NLP, Flow Synthesizer, Flow Store, Secrets Vault, Runner/Executor, Browser Agent, Data Connectors, Guard/Verifier, UI Shell, Logging & Telemetry.

---

## 5) Platform Scope (MVP)

- **OS:** Windows 11 (x64). Limited testing on Windows 10.
- **Browsers:** Chromium (bundled), Edge; Firefox not supported in MVP.
- **Email:** Gmail via API (OAuth) and Outlook via Graph (delegated) as preferred; UI automation fallback.
- **Files:** Local filesystem; CSV/XLSX read-only; Google Sheets read.

---

## 6) Functional Requirements

### 6.1 Recorder

- Start/Stop control with countdown, mic toggle, and “pause recording”.
- Capture per step:
  - Application/window identity; control target (role/name/value from UIA).
  - Action: click (left/right/double), setText, select, hotkey, scroll.
  - For web: CSS/ARIA/XPath selector, page URL, frame, and DOM attributes.
  - Timing/event markers: page load, dialog opened/closed, network idle.
- Capture user **narration audio**; transcribe to text.
- Capture screenshots around actions (low-res, locally stored).
- Redaction: blur predefined regions; “privacy mode” to skip screen grabs.

### 6.2 Flow Synthesizer (Teach-by-Demo → Flow)

- Convert recorded trace + narration into a **Flow DSL** with:
  - Steps (actions), Variables (inputs/paths/text), Loops (over spreadsheet rows), Conditions (if element visible), Waits.
- Auto-parameterize:
  - File paths, URLs, email subject/body, form fields → variables.
  - Detect tabular data and map columns → tokens ({{name}}, {{email}}).
- Generate **multi-locator** strategies (primary + fallbacks) for each target.
- Create **Guard Checks** per critical step (e.g., confirm draft count increased).

### 6.3 Flow Runner / Executor

- Dry-run mode: highlights intended actions without executing.
- Live run: executes steps with retries, timeouts, and recovery branches.
- Wait primitives: element-visible, element-enabled, innerText-contains, URL-match, file-exists, process-open.
- Error handling: per-step retry policy; skip/continue; pause-for-user.
- Audit trail: per-step screenshots, timestamps, and result (OK/Retry/Fail).

### 6.4 Browser Agent

- Embedded Chromium with Playwright. Recording of selectors; navigation; frame & shadow DOM support.
- Profile isolation per Flow; cookie jar managed by the app; optional SSO reuse.

### 6.5 Data Connectors (MVP)

- **Files:** CSV/XLSX (read), local folder picker.
- **Google Sheets:** read (API, OAuth).
- **Email:** Gmail API (send), Outlook/Graph (send). UI fallback if API unavailable.

### 6.6 Variables & Prompting

- Flow-level variables: text, number, boolean, file path, table (rows).
- Run-time prompt UI to input/confirm variables; CSV/XLSX/Sheets can bind to table variables.
- Secrets typed once → stored in vault; referenced by name in Flows.

### 6.7 Flow Management

- Create, rename, duplicate, archive Flows.
- Version history (lightweight): up to 10 revisions with diffs.
- Import/export single Flow file (encrypted, includes assets).

### 6.8 Safeguards & Permissions

- Per-Flow permission scopes: can-send-email, can-read-files-in-folder, can-control-browser.
- Confirmation gates for destructive actions (send, delete, move/overwrite).
- Global kill-switch hotkey.

---

## 7) Non-Functional Requirements

- **Reliability:** ≥ 95% step success on stable UIs; deterministic waits; exponential backoff.
- **Performance:** Cold start < 5s; action latency < 300ms median; replay 10–15 step flow in < 60s when network normal.
- **Privacy/Security:** Local-first storage; AES-256 at rest; DPAPI/Windows credential locker for secrets; no cloud unless user opts in.
- **Observability:** Local logs (rotating), anonymized telemetry toggle, export run report (PDF/CSV).
- **Accessibility:** Works with system scaling 100–150%; keyboard navigation for app UI.

---

## 8) Flow DSL (MVP)

Human-readable JSON/YAML structure.

```yaml
version: 0.1
name: Weekly Outreach
variables:
  sheet: { type: table, source: file }
  subject: { type: text }
  template: { type: textmultiline }
steps:
  - open_app: { name: chromium }
  - navigate: { url: 'https://mail.google.com' }
  - wait_for: { selector: '[role=button][gh=cm]' }
  - for_each: { row: sheet.rows }
    do:
      - click: { selector: '[role=button][gh=cm]' }
      - type: { selector: 'textarea[name=to]', text: '{{row.email}}' }
      - type: { selector: 'input[name=subjectbox]', text: '{{subject}}' }
      - type:
          {
            selector: "div[aria-label='Message Body']",
            text: "Hello {{row.name}},\n{{template}}",
          }
      - click: { selector: "div[aria-label='Send ‪(Ctrl-Enter)‬']" }
      - guard: { type: gmail_sent_count_increases }
```

**Notes:** Guards can be built-in (e.g., Gmail sent-count check via API) or element-based assertions.

---

## 9) Data Model (MVP)

**Flow**

- id (uuid), name, createdAt, updatedAt, version
- dsl (json), metadata (tags, category), permissions[]

**Variable**

- name, type (text/number/bool/path/table/secret), default, source (prompt/file/sheets), required

**Run**

- id, flowId, startAt, endAt, status (ok/fail/partial)
- steps[]: {idx, action, target, params, attempts, result, screenshotPath}
- metrics: {durationMs, retries, guardsPassed}

**Secret**

- name (unique), storedEncryptedValue, createdAt, lastUsed

---

## 10) UI/UX (MVP)

**Shell:** Tauri/Electron desktop app with left nav (Flows, Runs, Settings).

**A. Create Flow**

1. New Flow → Record (countdown 3..2..1).
2. User performs task while narrating.
3. Stop → “Review & Parameterize” screen:
   - Auto-suggested variables with inline edit.
   - Detected loops (preview table mapping).
   - Detected guards (toggle on/off).
4. Save Flow.

**B. Run Flow**

1. Pick Flow → Run.
2. Variable Prompt (subject/template/sheet picker).
3. Dry-run overlay (optional) → Live Run.
4. Live console shows steps, waits, retries, and screenshots.
5. Summary: successes, failures, transcript link, export.

**C. Settings**

- Accounts (Google/O365 OAuth), Secrets Vault, Privacy (redaction zones), Telemetry toggle, Hotkeys.

---

## 11) Integrations & Permissions

- **Google:** OAuth (installed app), scopes: send email, read spreadsheets (optional).
- **Microsoft Graph:** Mail.Send.
- **Local FS:** user-granted folders via picker; store folder IDs; enforce per-Flow scoping.

---

## 12) Security & Privacy

- Local-only by default; no cloud processing.
- Secrets stored with Windows DPAPI, non-exportable unless user explicitly opts to export (re-encrypted with password-derived key).
- Redaction: user-defined rectangles persisted per app/window signature.
- Safe mode: block keystroke capture in password fields (heuristic + AX hints).
- Signed installer; auto-update with delta packages; code integrity checks.

---

## 13) Error Handling & Recovery

- Element not found → try alternate locator → refresh/reopen → pause-for-user.
- Network slowness → extend waits with capped backoff; show spinner with concrete condition (“Waiting for compose box”).
- Permission failures (API) → prompt to re-auth; auto-open consent page.
- Conflict (file exists) → rename with suffix or prompt strategy.

---

## 14) Telemetry & Diagnostics (Opt-in)

- Anonymized counts: step types, retries, average run time.
- Local diagnostics bundle export: logs + screenshots + redacted trace.

---

## 15) Testing Plan

- **Unit**: DSL parser, selector strategy, wait conditions.
- **Integration**: Gmail send via API and UI; Sheets/CSV; file moves.
- **E2E scenarios**: 1) Weekly outreach; 2) Web form filing; 3) File rename batch; each with flaky-network chaos test.
- **Usability**: 10 pilot users to record and run a flow without guidance.

---

## 16) Tech Stack (MVP)

- **Desktop shell**: Tauri (Rust) or Electron (Node).
- **Automation**: Playwright (Node) for web; UIA via pywinauto/WinAppDriver or Rust bindings; hotkeys via OS APIs.
- **LLM/NLP**: Local prompt templates; optional cloud STT (Whisper local acceptable).
- **Storage**: SQLite (Flows, Runs), file store for screenshots; Vault via DPAPI.
- **Updater**: Squirrel (Electron) or Tauri updater.

---

## 17) Constraints & Risks

- Anti-automation measures (CAPTCHA, Gmail UI churn) → prefer API paths; offer manual checkpoints.
- Accessibility gaps (canvas apps) → CV/OCR fallback slated for post-MVP.
- Multi-monitor & DPI scaling → extensive testing (100/125/150%).

---

## 18) Roadmap

**MVP (0.1)** – Windows + Chromium; CSV/XLSX/Sheets read; Gmail/Outlook send; Flow DSL; dry-run; vault; logs.\
**0.2** – macOS AX support; scheduler; richer conditions; CV/OCR fallback.\
**0.3** – Flow editor UI (drag/drop), Firefox support, team share/export with key wrapping.\
**1.0** – Plugin SDK, marketplace for Flows, policy management for orgs.

---

## 19) Acceptance Criteria (MVP)

- User records a 12–20 step workflow with narration and runs it successfully with a CSV of ≥ 20 rows, sending emails via API, with ≥ 95% step pass rate and full audit trail.
- If the “Compose” button selector changes but aria-label remains, multi-locator fallback should still pass without manual edit.
- A privacy redaction zone prevents screenshots from capturing a password field during recording and run.

---

## 20) Open Questions

- How much on-device LLM vs. cloud? (privacy vs. capability)
- Should selectors be auto-healed using similarity scoring at run time?
- Do we allow community Flow sharing in MVP (risk: secrets/PII)?
- Granularity of permissions (per-app vs. per-window vs. per-selector)?

## 21) AI‑Assisted Build Task List (MVP)

This section breaks the MVP into AI-friendly, automatable tasks. Each task includes Objective, Key Steps, Deliverables, Acceptance Criteria, and Suggested AI Prompts.

> **Stack choice for this plan:** Electron (Node + TypeScript + React) for the desktop shell, Playwright for web automation, macOS Accessibility (AX) for native Mac recording/automation, Whisper for STT (local or cloud), SQLite for storage. Windows support remains in the spec but is out-of-scope for this initial Mac + Chrome path.

### 1) Repo & Project Scaffold

**Objective.** Initialize a secure, typed, multi-package workspace.

- **Key Steps**
  - Create a pnpm workspace monorepo: `apps/desktop` (Electron shell), `packages/recorder-web`, `packages/recorder-mac`, `packages/runner`, `packages/dsl`, `packages/common`, `packages/stt`, `packages/email`.
  - Configure TypeScript project references; ESLint + Prettier; commit hooks with lint-staged.
  - Renderer: React + Vite; Main: Electron `main.ts` with contextIsolation, sandbox, disabled `remote`.
  - Secure IPC channels (`ipcMain.handle` with schema validation via Zod).
- **Deliverables.** Monorepo with example window; CI workflow (lint/test/build) for macOS.
- **Acceptance.** `pnpm build` and `pnpm dev` run; window opens; CI passes.
- **AI Prompt.** “Generate pnpm workspace with Electron + Vite + React, TS project refs, Zod IPC schemas, eslint/prettier/lint-staged.”

### 2) OS Permissions & Signing (macOS)

**Objective.** Ensure the app can access Accessibility & Screen Recording.

- **Key Steps**
  - Add Hardened Runtime + entitlements for Electron app; prepare signing identities.
  - Guide for users to grant Accessibility + Screen Recording in System Settings (TCC).
  - Build postinstall script to open the TCC pane.
- **Deliverables.** `entitlements.plist`, signing config, onboarding modal.
- **Acceptance.** On first run, app requests/obtains Accessibility & Screen Recording permissions.
- **AI Prompt.** “Create Electron entitlements for macOS Accessibility & Screen Recording; show onboarding modal that links to System Settings via AppleScript / `open x-apple.systempreferences:...`.”

### 3) Speech‑to‑Text (STT) Module

**Objective.** Record mic during _Record_ sessions and transcribe narration.

- **Key Steps**
  - Renderer UI toggle for mic; capture audio as WAV (48kHz) with WebAudio.
  - Save chunks to `/runs/<id>/audio/segment-*.wav`.
  - Transcribe with: (A) local Whisper via `whisper.cpp`-backed Node addon; (B) cloud fallback (e.g., Whisper API). Add batching + timestamps.
  - Return transcript with word-level or phrase-level timestamps.
- **Deliverables.** `packages/stt` with `transcribe(file|buffer): Transcript` API.
- **Acceptance.** 10‑minute audio produces a timestamped transcript ≤ 2× real-time on M1/M2.
- **AI Prompt.** “Write a TypeScript wrapper for whisper.cpp with streaming WAV input and phrase timestamps; provide tests with a sample WAV.”

### 4) Web Recorder (Chrome/Chromium)

**Objective.** Capture semantic user actions and resilient selectors in the browser.

- **Key Steps**
  - Launch embedded Chromium via Playwright with a dedicated user profile.
  - Inject a content-script to listen to clicks, inputs, selects, and navigation.
  - Generate ARIA-first selectors (Playwright’s `getByRole/getByLabel`) with CSS/XPath fallbacks; record frame & shadow DOM paths.
  - Capture page state markers: URL, title, network-idle, dialog open/close.
  - Store per-step screenshot (cropped around target).
- **Deliverables.** `packages/recorder-web` exposing `startRecording(sessionId)`, emitting `RecordedStep` events.
- **Acceptance.** Interactions in Gmail compose and a generic form yield a JSON trace with selectors and screenshots.
- **AI Prompt.** “Create a Playwright-based recorder that emits JSON steps with ARIA-first selectors, frame info, and cropped PNGs around targets.”

### 5) macOS Native Recorder (AX)

**Objective.** Capture actions on native Mac apps via Accessibility API.

- **Key Steps**
  - Implement Node N-API addon that queries AXUIElement under cursor and on focus changes; read attributes: `AXRole`, `AXSubrole`, `AXIdentifier`, `AXTitle`, `AXValue`.
  - CGEventTap to observe clicks/keystrokes (exclude secure fields by role/heuristics).
  - For each action, compute a stable target descriptor (role + title/identifier + ancestry), and snapshot a small bounding box via Screen Recording API.
  - Redaction zones (user-defined rectangles) applied before saving screenshots.
- **Deliverables.** `packages/recorder-mac` emitting `RecordedStep` with `targetDescriptor`.
- **Acceptance.** Actions in TextEdit/Mail are captured with correct roles; secure text fields are never persisted.
- **AI Prompt.** “Build a macOS AX recorder in a Node N-API addon capturing AX hierarchy and emitting JSON steps; include TypeScript types and a sample.”

### 6) Unified Trace Schema

**Objective.** Normalize web + mac traces into one schema.

- **Key Steps**
  - Define `RecordedStep` union: `click`, `type`, `select`, `navigate`, `wait`, `open_app`, with fields for web (`selector`, `framePath`) and native (`targetDescriptor`).
  - Add metadata: timestamp, app/window id, screenshotPath.
- **Deliverables.** `packages/common` with `trace.schema.ts` (Zod + JSON Schema export).
- **Acceptance.** Both recorders validate against the schema; invalid data rejected.
- **AI Prompt.** “Design a Zod schema for a cross-platform RecordedStep union and generate JSON Schema + TS types.”

### 7) Flow DSL & Validator

**Objective.** Express flows as human-readable YAML/JSON with variables, loops, waits, guards.

- **Key Steps**
  - Write JSON Schema + TypeScript types for DSL v0.1 (as in the spec).
  - Implement parser/validator and pretty-printer.
  - Provide example flows and fixtures for tests.
- **Deliverables.** `packages/dsl` with `parseFlow()`, `validateFlow()`, examples.
- **Acceptance.** Example flows validate; invalid constructs give actionable errors.
- **AI Prompt.** “Implement a TypeScript parser/validator for this YAML DSL; include Jest tests and error messages pointing to line/column.”

### 8) Flow Synthesizer (Trace + Transcript → DSL)

**Objective.** Convert recorded trace and narration into a parameterized flow.

- **Key Steps**
  - Chunk transcript by pauses; align steps by timestamps → segments.
  - Heuristics to detect loops (similar actions over a table) and variables (file paths, emails, subjects) → create `variables` section.
  - LLM templating pass to propose variable names and a step list; post-process to valid DSL; attach multi-locator strategies.
- **Deliverables.** `packages/dsl` function `synthesizeFlow(trace, transcript): Flow`.
- **Acceptance.** Gmail mail-merge demo yields a valid flow with variables `sheet`, `subject`, `template` and a `for_each` loop.
- **AI Prompt.** “Given this JSON trace and narration, infer loops/variables and output YAML conforming to the provided JSON Schema.”

### 9) Runner / Executor

**Objective.** Execute flows with retries, waits, and guards.

- **Key Steps**
  - Implement primitives: `open_app`, `navigate`, `wait_for`, `click`, `type`, `select`, `guard`.
  - Web execution via Playwright; native execution via AX (find element by descriptor; fall back to coordinate click if requested).
  - Multi-locator resolution: try ARIA → CSS → XPath; exponential backoff waits.
  - Guards: element-visible, URL-match, text-contains; plugin interface for app-specific (e.g., Gmail “sent” check via API).
- **Deliverables.** `packages/runner` with `run(flow, variables, hooks)` + event stream.
- **Acceptance.** Can run the example Gmail flow end-to-end (UI-only and API path).
- **AI Prompt.** “Write a Playwright-based executor for the DSL primitives with retryable waits and a guard plugin system; include unit tests.”

### 10) Email Connectors (Gmail/Outlook)

**Objective.** Prefer APIs for sending email; UI fallback for demo.

- **Key Steps**
  - Gmail: OAuth installed-app, scopes for `gmail.send`; token cache in Keychain.
  - Outlook (Graph): delegated `Mail.Send` as optional.
  - Templating with Mustache/Jinja-like replacement from table rows.
- **Deliverables.** `packages/email` with `sendEmail({to, subject, body, attachments})` and `renderTemplate(template, row)`.
- **Acceptance.** Test sends to a sandbox inbox; failure surfaces cleanly.
- **AI Prompt.** “Implement Gmail send with OAuth token storage in macOS Keychain; provide CLI test script.”

### 11) Data Connectors (CSV/XLSX/Sheets)

**Objective.** Bind table variables to external data.

- **Key Steps**
  - CSV/XLSX: parse (e.g., Papaparse/SheetJS); type inference; header mapping UI.
  - Google Sheets read-only via OAuth.
  - Validate rows before run; preview first N rows.
- **Deliverables.** `packages/common` table types; `apps/desktop` variable-binding UI.
- **Acceptance.** User selects a CSV; preview shows rows; flow can iterate.
- **AI Prompt.** “Build a React component to map CSV columns to variable names with validation and preview.”

### 12) Secrets Vault

**Objective.** Securely store tokens/passwords.

- **Key Steps**
  - macOS Keychain access via `keytar`; namespaced by flow id.
  - Wrapper API with `getSecret/setSecret/deleteSecret` + rotation.
- **Deliverables.** `packages/common/secrets`.
- **Acceptance.** Secrets persist across restarts; export omits secret values.
- **AI Prompt.** “Create a Keychain wrapper with typed methods and integration tests (mocked in CI).”

### 13) Safeguards & Dry‑Run

**Objective.** Prevent destructive actions and provide visibility.

- **Key Steps**
  - Dry-run overlay in Chromium highlighting intended targets.
  - Global kill-switch hotkey (e.g., Ctrl/Cmd+Shift+Esc) that aborts runs.
  - Confirmation dialogs for `send/delete/move`.
- **Deliverables.** Dry-run renderer, hotkey handler, confirmation modals.
- **Acceptance.** Dry-run shows highlights; kill-switch interrupts within 200ms.
- **AI Prompt.** “Implement a dry-run highlighter using Playwright locator bounding boxes overlaid in a transparent window.”

### 14) Logging & Run Reports

**Objective.** Make runs auditable and debuggable.

- **Key Steps**
  - Per-step JSON log + PNG screenshot; rolling storage; export as ZIP.
  - Local SQLite for runs; viewer UI with filters and step detail.
- **Deliverables.** `packages/common/logging`, run report exporter.
- **Acceptance.** After a run, user can open a report and see step-by-step.
- **AI Prompt.** “Design a SQLite schema for storing runs with steps and screenshots; build a viewer component.”

### 15) Desktop UI Flows

**Objective.** Provide UX to record, parameterize, and run flows.

- **Key Steps**
  - Record screen: countdown, mic toggle, permission status.
  - Review & Parameterize: auto-suggested variables, loop detection preview, guard toggles.
  - Run screen: variable prompt, dry-run switch, live console, summary.
- **Deliverables.** React routes/pages and components in `apps/desktop`.
- **Acceptance.** A user can create → review → run a flow without touching code.
- **AI Prompt.** “Generate React pages for Record/Review/Run with state machines (XState) and type-safe IPC calls.”

### 16) Packaging & Auto‑Update (macOS)

**Objective.** Ship signed/notarized builds and enable updates.

- **Key Steps**
  - Configure `electron-builder` for `dmg` and auto-update; notarization with Apple Developer account.
  - Release pipeline on GitHub Actions; artifacts upload; delta updates.
- **Deliverables.** `electron-builder.yml`, CI release workflow.
- **Acceptance.** `pnpm dist` produces a signed DMG; notarization succeeds; auto-update applies a patch build.
- **AI Prompt.** “Create electron-builder config for signed/notarized macOS DMG with auto-update.”

### 17) Example Flows & Demos

**Objective.** Ship ready-to-run demos.

- **Key Steps**
  - Gmail mail-merge (API) with a sample CSV.
  - Web form filler (UI) on a public test form.
  - File rename batch using Finder/TextEdit.
- **Deliverables.** `examples/` folder with flows, data, and walkthroughs.
- **Acceptance.** QA verifies all examples pass on a clean Mac with granted perms.
- **AI Prompt.** “Author three sample flows in YAML and validation tests that they load and run in CI (headless for web).”

### 18) QA & Chaos Testing

**Objective.** Ensure resilience to latency and minor UI changes.

- **Key Steps**
  - Playwright network throttling; randomized delays; selector mutation tests.
  - DPI scaling and multi-monitor checks.
- **Deliverables.** E2E tests and chaos scripts.
- **Acceptance.** Flows pass under “Regular 3G” throttle and minor DOM changes.
- **AI Prompt.** “Write Playwright tests that simulate slow network and altered selectors; ensure executor retries correctly.”

### 19) Telemetry (Opt‑in) & Diagnostics

**Objective.** Help users and improve reliability without leaking PII.

- **Key Steps**
  - Event schema (counts, timings, retry rates), redaction on by default.
  - Local diagnostics bundle export (logs + redacted screenshots + flow).
- **Deliverables.** Telemetry module with user toggle; diagnostics exporter.
- **Acceptance.** Opt-in only; export produces a ZIP under 20MB for typical runs.
- **AI Prompt.** “Define a minimal telemetry event schema and build a redacted diagnostics exporter.”

### 20) Documentation & Onboarding

**Objective.** Make setup self-serve.

- **Key Steps**
  - Quickstart guide; permission grant walkthrough with screenshots.
  - In-app tooltips; first-run tutorial flow.
- **Deliverables.** `/docs` site (Docusaurus/Next) and in-app help.
- **Acceptance.** A new user completes the Gmail demo within 10 minutes.
- **AI Prompt.** “Draft a Quickstart and first-run tutorial with images and checklists.”

### 21) Definition of Done (MVP)

- Record in Chrome & macOS apps; synthesize a flow with variables; run via API/UI; dry-run + kill-switch; logs & report; signed DMG.
- Pilot user successfully creates and runs their own 10–15 step flow with a CSV of ≥ 20 rows and emails sent via Gmail API.

### 22) Backlog (Post‑MVP)

- Windows UIA recorder/runner; scheduler; OCR/vision fallback; selector auto-healing; org policies; plugin marketplace.
