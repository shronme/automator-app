# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Desktop Automation MVP application that allows users to teach workflows by demonstration and replay them reliably. The app focuses on Windows desktop + web workflows initially, with a planned expansion to macOS.

Key capabilities:

- Record user actions across desktop apps and browsers via accessibility APIs
- Convert recordings into parameterized Flow DSL (YAML/JSON)
- Replay workflows with resilient selectors, retries, and guard checks
- Prefer first-party APIs (Gmail, Outlook) over UI automation when available

## Architecture

The application is designed as a monorepo with multiple packages:

**Core Packages Structure (Planned):**

- `apps/desktop` - Electron/Tauri desktop shell with React UI
- `packages/recorder-web` - Browser automation via Playwright
- `packages/recorder-mac` - macOS native recording via Accessibility API
- `packages/runner` - Flow execution engine with retries and guards
- `packages/dsl` - Flow DSL parser, validator, and synthesizer
- `packages/email` - Gmail/Outlook API connectors
- `packages/common` - Shared types, schemas, and utilities
- `packages/stt` - Speech-to-text for narration transcription

**Tech Stack:**

- Desktop: Electron (Node + TypeScript + React) or Tauri (Rust)
- Web Automation: Playwright for Chromium/Edge
- Native Automation: Windows UIA, macOS Accessibility APIs
- Storage: SQLite for flows/runs, encrypted secrets vault
- STT: Whisper (local or cloud)

## Flow DSL Format

Flows are expressed in human-readable YAML with variables, loops, waits, and guards:

```yaml
version: 0.1
name: Weekly Outreach
variables:
  sheet: { type: table, source: file }
  subject: { type: text }
steps:
  - open_app: { name: chromium }
  - navigate: { url: 'https://mail.google.com' }
  - for_each: { row: sheet.rows }
    do:
      - click: { selector: '[role=button][gh=cm]' }
      - type: { selector: 'textarea[name=to]', text: '{{row.email}}' }
      - guard: { type: gmail_sent_count_increases }
```

## Development Commands

Since this is a greenfield project without existing package.json, the following commands will be established during development:

**Monorepo Management:**

- `pnpm install` - Install all dependencies
- `pnpm build` - Build all packages
- `pnpm dev` - Start development servers
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all code
- `pnpm typecheck` - TypeScript checking

**Package-specific:**

- `pnpm --filter desktop dev` - Run desktop app in development
- `pnpm --filter runner test` - Test execution engine
- `pnpm --filter dsl validate` - Validate Flow DSL schemas

## Key Components

**Recorder System:**

- Captures semantic actions via OS accessibility APIs
- Generates resilient selectors (ARIA-first with CSS/XPath fallbacks)
- Records user narration and screenshots
- Supports privacy redaction zones

**Flow Synthesizer:**

- Converts recorded traces + narration into parameterized Flow DSL
- Auto-detects variables (file paths, emails, form fields)
- Identifies loops over tabular data
- Creates multi-locator strategies and guard checks

**Flow Runner:**

- Executes flows with exponential backoff retries
- Supports dry-run mode with visual highlighting
- Implements wait primitives (element-visible, URL-match, etc.)
- Provides audit trail with screenshots and timestamps

**Security & Privacy:**

- Local-first storage with AES-256 encryption
- Secrets stored via OS credential locker (DPAPI/Keychain)
- Permission scoping per flow
- Global kill-switch for emergency stops

## Testing Strategy

**Unit Tests:** DSL parser, selector strategies, wait conditions
**Integration:** API connectors (Gmail, Sheets), file operations  
**E2E Scenarios:** Mail merge, web form filling, file batch operations
**Chaos Testing:** Network throttling, UI changes, permission failures

## Development Guidelines

**Code Conventions:**

- TypeScript with strict mode enabled
- Zod schemas for all data validation
- Secure IPC with contextIsolation for Electron
- Multi-platform support (Windows primary, macOS secondary)

**Security Requirements:**

- Never log or expose secrets/tokens
- Validate all external data inputs
- Use secure defaults for permissions
- Implement proper error boundaries

## MVP Success Criteria

- 80% of recorded flows run end-to-end without edits by day 14
- <2% misclick rate per 100 actions via guard checks
- Median flow creation time ≤ 5 minutes for 10-15 step tasks
- Support for Gmail API email sending with OAuth
- CSV/XLSX data source integration
- Signed/notarized builds with auto-update capability
