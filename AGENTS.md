# BLM Round Robin / System Bet Generator

## Architecture

- **Overlay:** Tampermonkey userscript injected into `pokerbet.co.za`. Vanilla JS, no build step.
- **Backend:** FastAPI + PostgreSQL. Runs locally on port 8420.
- **Overlay → Backend:** REST API via `GM_xmlhttpRequest` to `localhost:8420`.

## Directory Structure

```
overlay/                          # Tampermonkey userscript
├── blm-panel.user.js             # Script header with @require paths
├── src/
│   ├── main.js                   # Entry point: inject panel, start scraper
│   ├── scraper.js                # DOM scraping from PokerBet
│   ├── betslip-bridge.js         # Click odds + watch bet slip
│   ├── overlay/                  # Panel components (vanilla JS)
│   │   ├── Panel.js, GameList.js, ParlayLegs.js
│   │   ├── SystemPicker.js, StakeInput.js
│   │   ├── ResultsPanel.js, SummaryBar.js
│   │   ├── PopulateButton.js, ScenarioView.js
│   ├── services/api.js, storage.js
│   ├── utils/odds.js, dom.js
│   └── styles/blm-overlay.css.js
├── constants/system-templates.js
└── tests/

backend/                          # FastAPI + PostgreSQL
├── main.py                       # Uvicorn entry
├── requirements.txt
├── Dockerfile
├── api/                          # Route handlers
├── schemas/                      # Pydantic models
├── engine/                       # Generator, calculator, scenarios, optimiser
├── services/                     # Business logic
├── models/                       # SQLAlchemy (future)
└── db/                           # Session (future)
```

## Overlay Architecture

The overlay is a **vanilla JS** component system (no React). Components are factory functions that return DOM elements. Loaded via Tampermonkey's `@require` during development, bundled to a single `.user.js` for release.

## Backend Architecture

FastAPI app with in-memory engine for Phase 0-1. PostgreSQL + SQLAlchemy + Alembic added in Phase 2.

## Key Constraints

- **No same-game parlays.** Cannot combine O/U from same game across different periods.
- **O/U only.** No moneylines, spreads, handicaps, or winning margins.
- **Live basketball only.** No prematch, no other sports.
- **Auto-populate, NOT auto-place.** Script clicks odds buttons; user clicks "Place Bet".

## Development

```bash
# Backend:
cd backend && pip install -r requirements.txt && python main.py

# Overlay:
# Install Tampermonkey → add overlay/blm-panel.user.js → navigate to pokerbet.co.za

# Docker:
docker compose up -d
```

## Phase Progress

- [x] Phase 0: Project scaffold + userscript skeleton + backend skeleton
- [ ] Phase 1: DOM scraper + selection list
- [ ] Phase 2: Backend engine + API
- [ ] Phase 3: System picker + results display
- [ ] Phase 4: Bet slip bridge
- [ ] Phase 5: BLM scores + optimiser
- [ ] Phase 6: Comparison + polish
