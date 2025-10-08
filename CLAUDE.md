# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RollingStock Planner** is a web-based emergency food and water stock management tool for disaster preparedness. It helps families practice "rolling stock" (consuming and replenishing supplies) with expiration alerts, family-based needs calculation, and disaster education content.

- **Live Demo**: https://ipusiron.github.io/rollingstock-planner/
- **Category**: Survival / Disaster Preparedness Tool
- **Part of**: "生成AIで作るセキュリティツール100" (100 Security Tools with Generative AI) - Day 096

## Tech Stack

- **Frontend**: Vanilla JavaScript (no framework), HTML5, CSS3
- **Data Storage**: Browser LocalStorage
- **Charts**: Chart.js (loaded via CDN)
- **Deployment**: GitHub Pages (static site)

## Architecture

### Data Model

All data is stored in LocalStorage with these keys:

- `rsp_items` (JSON array): Stock items with fields: `name`, `category`, `quantity`, `unit`, `expiry`, `kcal`, `createdAt`
- `rsp_family` (JSON object): Family composition: `adults`, `children`, `seniors`, `dogs`, `cats`, `days`
- `rsp_alert_months` (string): Warning threshold in months (default: 2)

### Core Modules (script.js)

1. **State Management** (lines 12-17): In-memory state synchronized with LocalStorage
2. **Data Persistence** (lines 24-28): `loadJSON()` and `saveJSON()` helpers
3. **Date Utilities** (lines 30-48): Date parsing, formatting, and difference calculations
4. **Tab Navigation** (lines 60-71): Client-side tab switching with chart refresh triggers
5. **Stock Management** (lines 84-155): CRUD operations for inventory items
6. **Calculations** (lines 193-226):
   - `calcTotals()`: Aggregates water (in L) and calories from all items
   - `calcNeeds()`: Calculates required water/calories based on family composition
   - `coverage()`: Computes sufficiency percentages
7. **Rendering** (lines 231-325): Table with filtering, sorting, and status badges
8. **Alerts** (lines 346-398): Expiry warnings and rolling-stock suggestions
9. **Charts** (lines 404-458): Category breakdown (doughnut), coverage (bar charts)

### UI Tabs (index.html)

1. **Stock**: Item registration, search/sort, import/export JSON, category chart
2. **Family Setup**: Configure household members and pets to auto-calculate needs
3. **Alerts & Suggestions**: Expiry warnings, consumption recommendations, coverage charts
4. **Survival Basics**: Educational content (checklist, ethical dilemmas, best practices)

### Key Calculation Logic

- **Water needs**: Adults 4L/day, Children 2L/day, Seniors 3L/day, Dogs 1L/day, Cats 0.3L/day
- **Calorie needs**: Adults 2000kcal/day, Children 1400kcal/day, Seniors 1800kcal/day
- **Expiry alerts**: Items within `alertMonths` threshold get "要消費" badge; expired items get "期限切れ"
- **Rolling stock list**: Items expiring within 14 days recommended for consumption

## Development Workflow

### Testing Locally

Open `index.html` directly in a browser (no build process needed):

```bash
start index.html
```

Or use a local server:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

### Deployment

Push to `main` branch. GitHub Pages automatically serves from root directory.

## Code Conventions

- **Japanese UI**: All labels, messages, and content are in Japanese
- **Category codes**: `food`, `water`, `medicine`, `pet-food`, `daily`, `tool`, `other`
- **Date format**: ISO 8601 (`YYYY-MM-DD`) for storage and input[type="date"]
- **No dependencies**: Pure JavaScript (except Chart.js CDN)
- **LocalStorage only**: No backend, no API calls

## Important Behaviors

- Water detection: Items with `category='water'` OR `unit='L'/'ℓ'` are counted as water
- Calorie calculation: Only items with non-null `kcal` field contribute to total
- Edit mode: Clicking "編集" populates form with existing item data; `editIndex` hidden field tracks which item
- Import/Export: JSON format includes `meta`, `items`, `family`, `alertMonths` fields
- Chart updates: Charts redraw on tab activation (visibility check) and data changes
- Theme toggle: Persists in LocalStorage (`rsp_theme`), defaults to 'dark'
- Tooltips: Desktop = hover, Mobile = tap to toggle

## Chart.js Configuration

**Critical**: All charts must be wrapped in `.chart-container` divs with fixed heights to prevent infinite scroll bugs.

```html
<!-- Correct structure -->
<div class="chart-container small">
  <canvas id="categoryChart"></canvas>
</div>
```

Chart options must use:
- `responsive: true`
- `maintainAspectRatio: true` (NOT false!)
- `aspectRatio`: explicit value (1 for doughnut, 1.5 for bar)
- Proper destroy: `chart.destroy(); chart = null;`

Heights:
- `.chart-container`: 200px (default for bar charts)
- `.chart-container.small`: 140px (for doughnut chart)

## Security Measures

### XSS Prevention
- All user inputs are escaped with `escapeHtml()` before rendering
- Category values are validated against whitelist before use as CSS classes
- Input length limits: name (200 chars), unit (50 chars), expiry (20 chars)

### Input Validation
- **Category**: Restricted to 7 allowed values (`food`, `water`, `medicine`, `pet-food`, `daily`, `tool`, `other`)
- **Quantity/Kcal**: Non-negative numbers only via `Math.max(0, ...)`
- **Family members**: Capped at 0-100 per type
- **Days**: Restricted to [3, 7, 14, 30, 180]
- **Alert months**: Restricted to [1, 2, 3, 6]

### Import Security
- File size limit: 10MB
- All imported data is validated and sanitized
- Invalid items are filtered out
- Categories normalized to whitelist
- Numeric values clamped to safe ranges

### LocalStorage Safety
- All data loaded from LocalStorage is validated on startup via:
  - `validateItems()`: Sanitizes and filters item array
  - `validateFamily()`: Clamps family member counts
  - `validateAlertMonths()`: Ensures valid threshold
- Malformed data falls back to safe defaults

### CDN Security
- Chart.js version pinned to `4.4.1`
- `crossorigin="anonymous"` prevents credential leakage
- Consider adding SRI hash for production

### HTTP Headers (meta tags)
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `referrer: strict-origin-when-cross-origin` - Limits referrer leakage

## File Structure

```
rollingstock-planner/
├── index.html          # Single-page app structure
├── script.js           # All application logic
├── style.css           # Dark theme, responsive layout
├── assets/             # Images (favicon, screenshot)
├── README.md           # Project documentation (Japanese)
├── CLAUDE.md           # Development guide (this file)
├── LICENSE             # MIT License
├── .nojekyll           # GitHub Pages config
└── .gitignore          # Standard git ignores
```
