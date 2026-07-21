/**
 * BLM Overlay Styles — injected as a <style> tag
 * Dark theme, compact, floats on the right side of PokerBet
 */

export const BLM_STYLES = `
/* ── Container ──────────────────────────────────── */
#blm-overlay-container {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 999999;
    height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    color: #e0e0e0;
    transition: width 0.2s ease;
}
#blm-overlay-container.collapsed { width: 0; }
#blm-overlay-container:not(.collapsed) { width: 340px; }

/* ── Panel ──────────────────────────────────────── */
.blm-panel {
    width: 340px;
    height: 100vh;
    background: #1a1a2e;
    border-left: 1px solid #2d2d4a;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: -4px 0 20px rgba(0,0,0,0.4);
}

/* ── Header ─────────────────────────────────────── */
.blm-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #16213e;
    border-bottom: 1px solid #2d2d4a;
    flex-shrink: 0;
}
.blm-logo {
    font-weight: 800;
    color: #00d4aa;
    font-size: 14px;
    margin-right: 8px;
}
.blm-title {
    flex: 1;
    font-weight: 600;
    font-size: 13px;
}
.blm-collapse-btn {
    background: none;
    border: 1px solid #3a3a5c;
    color: #888;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 16px;
}
.blm-collapse-btn:hover { color: #fff; border-color: #5a5a7c; }

/* ── Body (scrollable) ──────────────────────────── */
.blm-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
}
.blm-body::-webkit-scrollbar { width: 4px; }
.blm-body::-webkit-scrollbar-thumb { background: #2d2d4a; border-radius: 2px; }

/* ── Section ────────────────────────────────────── */
.blm-section { padding: 4px 12px 8px; }
.blm-section-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
}

/* ── Game Row ───────────────────────────────────── */
.blm-game-row {
    display: flex;
    flex-direction: column;
    padding: 6px 8px;
    margin-bottom: 4px;
    background: #16213e;
    border-radius: 6px;
    border: 1px solid #2d2d4a;
    cursor: pointer;
    transition: border-color 0.15s;
}
.blm-game-row:hover { border-color: #3a3a5c; }
.blm-game-row.active { border-color: #00d4aa; }

.blm-game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}
.blm-game-teams { display: flex; align-items: center; gap: 4px; }
.blm-team-home, .blm-team-away {
    font-weight: 600;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 85px;
}
.blm-score { color: #aaa; font-size: 11px; font-weight: 600; }
.blm-game-meta { display: flex; gap: 4px; align-items: center; }
.blm-period { color: #666; font-size: 10px; }
.blm-clock { color: #888; font-size: 10px; }
.blm-league { color: #555; font-size: 9px; margin-left: 4px; }

/* ── O/U Buttons ────────────────────────────────── */
.blm-game-ou { margin-top: 4px; }
.blm-ou-group {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-bottom: 3px;
    flex-wrap: wrap;
}
.blm-ou-label {
    font-size: 9px;
    color: #666;
    font-weight: 600;
    min-width: 40px;
    text-transform: uppercase;
}
.blm-ou-entries {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
}
.blm-ou-btn {
    padding: 2px 6px;
    border: 1px solid #3a3a5c;
    border-radius: 4px;
    background: #1a1a2e;
    color: #aaa;
    font-size: 10px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.12s;
}
.blm-ou-btn:hover { border-color: #00d4aa; color: #00d4aa; }
.blm-ou-btn.selected {
    background: #00d4aa22;
    border-color: #00d4aa;
    color: #00d4aa;
    font-weight: 700;
}
.blm-ou-btn .blm-ou-odds { color: #888; margin-left: 2px; }
.blm-ou-btn.selected .blm-ou-odds { color: #5ae0c0; }
.blm-ou-hint {
    font-size: 10px;
    color: #555;
    display: block;
    padding: 4px 0;
}


/* ── Parlay Legs ────────────────────────────────── */
.blm-leg-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px 2px 8px;
    margin: 2px;
    background: #16213e;
    border: 1px solid #00d4aa44;
    border-radius: 12px;
    font-size: 11px;
}
.blm-leg-team { max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.blm-leg-odds { color: #00d4aa; font-weight: 600; }
.blm-leg-remove {
    background: none;
    border: none;
    color: #ff4444;
    cursor: pointer;
    font-size: 14px;
    padding: 0 2px;
    line-height: 1;
}

/* ── System Picker ──────────────────────────────── */
.blm-system-templates, .blm-system-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
}
.blm-system-btn, .blm-preset-btn {
    padding: 3px 10px;
    border: 1px solid #3a3a5c;
    border-radius: 4px;
    background: #1a1a2e;
    color: #aaa;
    font-size: 11px;
    cursor: pointer;
}
.blm-system-btn.active, .blm-preset-btn:hover {
    border-color: #00d4aa;
    color: #00d4aa;
}
.blm-system-btn:hover { border-color: #00d4aa; }
.blm-round-robin { margin-top: 4px; }
.blm-round-robin input {
    width: 40px;
    background: #16213e;
    border: 1px solid #3a3a5c;
    color: #e0e0e0;
    padding: 2px 4px;
    border-radius: 3px;
}

/* ── Stake Input ────────────────────────────────── */
.blm-stake-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}
.blm-stake-row input {
    width: 80px;
    background: #16213e;
    border: 1px solid #3a3a5c;
    color: #e0e0e0;
    padding: 4px 6px;
    border-radius: 4px;
}
.blm-stake-mode label {
    font-size: 11px;
    color: #888;
    margin-right: 8px;
    cursor: pointer;
}

/* ── Results ────────────────────────────────────── */
.blm-combo-count { font-size: 12px; font-weight: 600; margin-bottom: 6px; color: #00d4aa; }
.blm-combo-group { margin-bottom: 8px; }
.blm-combo-group-title {
    font-size: 11px;
    font-weight: 600;
    color: #888;
    margin-bottom: 3px;
}
.blm-combo-row {
    display: flex;
    align-items: center;
    padding: 3px 6px;
    margin: 2px 0;
    background: #16213e;
    border-radius: 3px;
    font-size: 11px;
}
.blm-combo-legs {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.blm-combo-odds { color: #00d4aa; font-weight: 600; margin: 0 8px; }
.blm-combo-payout { color: #ffd700; font-weight: 600; }

/* ── Summary ────────────────────────────────────── */
.blm-summary-metrics {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    background: #16213e;
    border-top: 1px solid #2d2d4a;
}
.blm-metric { flex: 1; text-align: center; }
.blm-metric-label {
    font-size: 9px;
    text-transform: uppercase;
    color: #666;
    display: block;
}
.blm-metric-value {
    font-size: 13px;
    font-weight: 700;
    display: block;
}
.blm-metric-value.positive { color: #00d4aa; }
.blm-metric-value.negative { color: #ff4444; }

/* ── Populate Button ────────────────────────────── */
.blm-populate-area {
    flex-shrink: 0;
    border-top: 1px solid #2d2d4a;
}
.blm-populate-betslip {
    width: 100%;
    padding: 10px;
    background: #00d4aa;
    color: #1a1a2e;
    border: none;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
}
.blm-populate-betslip:hover:not(:disabled) { background: #00e6b5; }
.blm-populate-betslip:disabled { opacity: 0.4; cursor: not-allowed; }
.blm-populate-progress {
    text-align: center;
    padding: 4px;
    font-size: 11px;
    color: #aaa;
    background: #16213e;
}

/* ── Empty State ───────────────────────────────── */
.blm-empty {
    text-align: center;
    color: #555;
    font-size: 11px;
    padding: 12px 0;
}

/* ── Error ──────────────────────────────────────── */
.blm-error-bar {
    background: #442222;
    color: #ff6666;
    padding: 6px 12px;
    font-size: 11px;
    border-top: 1px solid #662222;
}

/* ── Scenario ───────────────────────────────────── */
.blm-scenario-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
}
.blm-scenario-controls input {
    width: 40px;
    background: #16213e;
    border: 1px solid #3a3a5c;
    color: #e0e0e0;
    padding: 3px 4px;
    border-radius: 3px;
    text-align: center;
}
.blm-scenario-run {
    padding: 3px 10px;
    background: #2d2d4a;
    border: 1px solid #3a3a5c;
    border-radius: 4px;
    color: #ccc;
    cursor: pointer;
    font-size: 11px;
}
.blm-scenario-result {
    font-size: 12px;
    padding: 6px;
    background: #16213e;
    border-radius: 4px;
}
`;
