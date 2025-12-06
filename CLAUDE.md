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
- **Charts**: Chart.js 4.4.1 (CDN)
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

### Deployment

Push to `main` branch. GitHub Pages automatically serves from root directory.

## Architecture

### Data Model (LocalStorage Keys)

| Key | Type | Description |
|-----|------|-------------|
| `rsp_items` | JSON array | Stock items: `{name, category, quantity, unit, expiry, kcal, createdAt}` |
| `rsp_family` | JSON object | Family composition: `{adults, children, seniors, dogs, cats, days}` |
| `rsp_alert_months` | string | Warning threshold in months (default: "2") |
| `rsp_theme` | string | Theme setting ("dark" or "light") |

### Core Application Flow (script.js)

1. **State Management**: In-memory state (`items`, `family`, `alertMonths`) synchronized with LocalStorage
2. **Data Validation**: All LocalStorage data validated on load via `validateItems()`, `validateFamily()`, `validateAlertMonths()`
3. **Tab Navigation**: Client-side tab switching; charts redraw on visibility
4. **Modal Pattern**: `openModal(mode, itemIndex)` / `closeModal()` for item CRUD
5. **Rendering Pipeline**: `renderAll()` → `renderTable()` + `renderAlerts()` → Charts update

### UI Tabs (5 total)

1. **Stock (在庫管理)**: Item registration, search/sort, import/export, category chart
2. **Family (家族構成)**: Household members + pets, auto-calculate needs
3. **Alerts (アラート・提案)**: Expiry warnings, rolling-stock suggestions, coverage charts, AI advisor
4. **Settings (システム設定)**: Alert threshold, data import/export, clear all
5. **Basics (基礎知識)**: 13-section educational content (accordion format)

### Key Calculation Logic

**Water needs (per day):**
- Adults: 4L | Children: 2L | Seniors: 3L | Dogs: 1L | Cats: 0.3L

**Calorie needs (per day):**
- Adults: 2000kcal | Children: 1400kcal | Seniors: 1800kcal

**Expiry status (4 levels):**
- `期限切れ` (red): Past expiry date
- `本日期限` (orange): Expires today
- `要消費` (yellow): Within `alertMonths` threshold
- `OK` (green): Beyond threshold

**Rolling stock list**: Items expiring within 14 days

### Water Detection Logic

Items counted as water if:
- `category === 'water'` OR
- `unit.toLowerCase()` is `'l'` or `'ℓ'`

## Code Conventions

- **Japanese UI**: All labels, messages, and content are in Japanese
- **Category codes**: `food`, `water`, `medicine`, `pet-food`, `daily`, `tool`, `other`
- **Date format**: ISO 8601 (`YYYY-MM-DD`) for storage and `input[type="date"]`
- **No dependencies**: Pure JavaScript except Chart.js CDN

## Important Behaviors

- **Edit mode**: `openModal('edit', itemIndex)` populates form; `#editIndex` hidden field tracks which item
- **Import/Export**: JSON format includes `{meta, items, family, alertMonths}`
- **Chart updates**: Charts redraw on tab activation and data changes
- **Theme toggle**: Persists in LocalStorage, defaults to 'dark'
- **Tooltips**: Desktop = hover, Mobile = tap to toggle (via `.help-icon.active` class)
- **Pagination**: 50 items per page, `currentPage` resets on search

## Chart.js Configuration

**Critical**: All charts must be wrapped in `.chart-container` divs with fixed heights to prevent infinite scroll bugs.

```html
<div class="chart-container small">
  <canvas id="categoryChart"></canvas>
</div>
```

Required options:
- `responsive: true`
- `maintainAspectRatio: true` (NOT false!)
- `aspectRatio`: explicit value (1 for doughnut, 1.5 for bar)
- Proper destroy before recreate: `chart.destroy(); chart = null;`

Heights:
- `.chart-container`: 200px (bar charts)
- `.chart-container.small`: 140px (doughnut chart)

## Security Measures

### XSS Prevention
- All user inputs escaped with `escapeHtml()` before rendering
- Category values validated against whitelist before use as CSS classes
- Input length limits: name (200), unit (50), expiry (20)

### Input Validation
- **Category**: Restricted to 7 allowed values
- **Quantity/Kcal**: Non-negative numbers via `Math.max(0, ...)`
- **Family members**: Capped at 0-100 per type
- **Days**: Restricted to `[3, 7, 14, 30, 180]`
- **Alert months**: Restricted to `[1, 2, 3, 6]`

### Import Security
- File size limit: 10MB
- All imported data validated and sanitized
- Invalid items filtered out, categories normalized

### HTTP Headers (meta tags)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `referrer: strict-origin-when-cross-origin`

## File Structure

```
rollingstock-planner/
├── index.html      # Single-page app (807 lines, 5 tab panels + modal)
├── script.js       # All application logic (~1150 lines)
├── style.css       # Dark/light theme, responsive layout
├── assets/         # Images (favicon, screenshot)
├── README.md       # Project documentation (Japanese)
├── TECHNICAL.md    # Detailed implementation docs (Japanese)
└── CLAUDE.md       # This file
```

## Additional Documentation

For detailed implementation information including algorithm explanations, security design rationale, and performance optimizations, see **TECHNICAL.md**.
