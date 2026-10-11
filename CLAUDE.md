# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RollingStock Planner** is a web-based emergency food and water stock management tool for disaster preparedness. It helps families practice "rolling stock" (consuming and replenishing supplies) with expiration alerts, family-based needs calculation, and disaster education content.

- **Live Demo**: https://ipusiron.github.io/rollingstock-planner/
- **Category**: Survival / Disaster Preparedness Tool
- **Part of**: "100 Security Tools with Generative AI" (Day 096)

## Tech Stack

- **Frontend**: Vanilla JavaScript (no framework), HTML5, CSS3
- **Data Storage**: Browser LocalStorage
- **Displays**: Native HTML lists and progress elements; no runtime dependencies
- **Deployment**: GitHub Pages (static site)

## Development Workflow

### Testing Locally

Open `index.html` directly in a browser (no build process needed):

```bash
start index.html
```

Or use a local server:

```bash
python -m http.server 8000
```

Run `npm test` with Node.js 22; no package installation is required.

### Deployment

Use a feature branch and pull request. Both push and pull_request Test runs must succeed before an ordinary merge. GitHub Pages serves main/root. Verify main CI, Pages deployment, published hashes and browser behavior before cleanup.

## Architecture

### Data Model (LocalStorage Keys)

| Key | Type | Description |
|---|---|---|
| rsp_state_v2 | JSON object | Atomic envelope: meta {app, ver:3}, items, family, alertMonths; key name is not the format version |
| rsp_items | JSON array | Read-only compatibility source, preserved unchanged |
| rsp_family | JSON object | Read-only compatibility source, preserved unchanged |
| rsp_alert_months | string | Read-only compatibility source, preserved unchanged |
| rsp_theme | string | light or dark, independent optional preference |
| rsp_language | string | ja or en, independent optional preference |

Items contain name, category, quantity, unit, expiry, kcal and createdAt.
Water may additionally contain explicit integer volumeMl, with unit=bottle and integer quantity. Never infer this field from names or total-volume records.
Family contains adults, children, seniors, dogs, cats, days, waterPerPerson,
adultKcal, childKcal, seniorKcal, dogWater and catWater.

### Core Application Flow

1. StockCore validates dates, finite numeric values, complete items and state.
2. StockStore loads without writing. Corrupt current data must not silently fall back to compatibility keys.
3. commitState saves a validated candidate before replacing in-memory state.
4. Conflicts and storage errors preserve the confirmed state and user input.
5. renderAll updates the table, totals, alerts, coverage and shopping memo even when items is empty.
6. refreshDay refreshes derived date-dependent output on day changes.

### UI Tabs (5 total)

1. **Stock (在庫管理)**: Item registration, search/sort, import/export, category row counts
2. **Family (家族構成)**: Household members + pets, auto-calculate needs
3. **Alerts (アラート・提案)**: Expiry warnings, rolling-stock suggestions, separate water/food coverage, deterministic stock check
4. **Settings (システム設定)**: Alert threshold, data import/export, clear all
5. **Basics (基礎知識)**: 13-section educational content (accordion format)

### Key Calculation Logic

- Water: category water AND unit L/ℓ or mL (case insensitive); mL is divided by 1000. Never infer bottle or box volume.
- Explicit bottled water uses quantity × volumeMl / 1000. Purchase counts round up; unknown or zero targets stay uncalculated.
- StockActions returns validated immutable candidates. Replenish combines only identical nonempty dates; other dates create a row.
- One-step undo survives language/theme changes, but not another successful save or reload. Failed saves preserve it.
- Human calories: category food only, quantity multiplied by kcal per unit.
- Ledger totals include dated and undated records. Planned totals exclude expired and undated records.
- Zero quantity is valid but excluded from totals, alert lists and category counts.
- Human water default: 3 L/person/day for drinking and cooking, excluding sanitation water.
- Calorie defaults (2000/1400/1800) are editable examples, not individual nutrition standards.
- Pet water starts null; a relevant null prevents a complete water target and ratio.
- Pet-food requirements are not calculated.
- A zero or unknown target produces null metrics, never a passing score.
- Compute achievement before rounding; no average grade combining water and food.
- Category counts are rows, not nutrition or mixed-unit quantities.

### Calendar Dates

Use strict YYYY-MM-DD validation and calendar day numbers, not elapsed local milliseconds across DST.
Month addition clamps to the destination month end.
Expiry states: expired, today, near, later, unknown.
Rolling candidates: food/water/pet-food, positive quantity, today through day +14 inclusive.
Dates do not establish food safety. Never recommend consuming expired food or medicine.

## Code Conventions

- **Bilingual UI**: messages.js provides Japanese/English text. URL language > saved choice > browser language. Switching preserves unfinished input and never translates user data.
- **Category codes**: `food`, `water`, `medicine`, `pet-food`, `daily`, `tool`, `other`
- **Date format**: ISO 8601 (`YYYY-MM-DD`) for storage and `input[type="date"]`
- **No dependencies**: Browser scripts and Node.js standard test runner only

## Important Behaviors

- Edit mode uses openModal('edit', itemIndex); save failures leave the dialog and inputs intact.
- Import replaces the entire state only after full validation, confirmation and successful persistence.
- Import limit: 10 MiB and 5000 rows. Reject any invalid row instead of dropping it.
- Formats 1, 2 and 3 can be read; save/export format is 3, including volumeMl. Reject unsupported versions.
- Theme default is light, applied before CSS by theme-init.js.
- Help uses a native popover; Escape closes it before the item dialog.
- Tabs support arrows/Home/End; modal focus is trapped and restored; background is inert.
- Pagination is 50 rows; search resets currentPage.
- Explicit temporary-session mode never pretends data is persisted.
- Recovery JSON contains original raw values and is not a normal import file.
- Multi-tab snapshots detect changed data but are not a cross-tab transaction lock.
- No network requests, AI service, push notifications, authentication or encryption are implemented.

## Security Measures

### XSS Prevention
- All user inputs escaped with `escapeHtml()` before rendering
- Category values validated against whitelist before use as CSS classes
- Input length limits: name (200), unit (50), expiry (strict YYYY-MM-DD)

### Input Validation

Core validation is authoritative, including import and storage reads.
Reject non-finite or negative numbers, nonexistent dates, unsupported category/version, incomplete objects and out-of-range values.
Do not clamp values, truncate strings or silently remove rows.
See TECHNICAL.md for exact limits.

### Browser Security

Meta CSP permits local scripts and styles, denies external connections, objects and form submissions.
Use textContent or escapeHtml for user data; categories used as classes must be validated.
Do not claim X-Frame-Options, frame-ancestors or X-Content-Type-Options work through meta tags.
Do not store private data in fixtures, screenshots or example JSON.

## File Structure

```
rollingstock-planner/
├── index.html        # Five tabs, dialog and educational content
├── script.js         # UI events and rendering
├── stock-core.js     # Pure calculations, calendar dates and validation
├── stock-actions.js  # Use, replenish, undo and shopping calculations
├── stock-store.js    # Persistence, conflicts and recovery
├── messages.js       # Complete Japanese/English dictionaries
├── i18n.js           # Interface binding and language preference
├── theme-init.js     # Early optional theme preference
├── style.css         # Light/dark, mobile-first layout
├── package.json      # Dependency-free npm test
├── test/             # Core, storage, UI and documentation tests
├── .github/workflows/test.yml
├── assets/           # Documentation screenshots
├── README.md         # Usage and limitations
├── README.en.md      # Complete English usage and limitations
├── TECHNICAL.md      # Implementation reference
└── CLAUDE.md         # This guide
```

## Additional Documentation

For detailed implementation information including algorithm explanations, security design rationale, and performance optimizations, see **TECHNICAL.md**.
