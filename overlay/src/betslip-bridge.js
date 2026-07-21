/**
 * PokerBet Bet Slip Bridge — Phase 4
 *
 * Locates O/U odds buttons in PokerBet's DOM and clicks them to populate
 * PokerBet's native bet slip.
 *
 * Strategy:
 * 1. For each leg in the parlay, find the corresponding O/U button
 * 2. Click it with human-like timing
 * 3. Watch the bet slip via MutationObserver
 * 4. Report progress
 *
 * Button location strategies (tried in order):
 *   A. Current event view → "Total Points" section → O/U buttons by line + odds
 *   B. Sidebar game list → click game → wait for markets → click O/U
 *   C. Fallback: highlight game for manual clicking
 *
 * SAFETY: NEVER submits the bet slip. User must click "Place Bet."
 */

export class BetslipBridge {
    constructor() {
        this._debug = true;
        this._betslipSelector = '[class*="betslip"], [class*="bet-slip"], [class*="BetSlip"], [class*="betSlip"]';
    }

    log(...args) {
        if (this._debug) console.log('[BLM Betslip]', ...args);
    }

    /**
     * Populate PokerBet's bet slip with all legs from the generated combos.
     * For a Yankee (11 bets on 4 selections), this clicks each unique leg once.
     *
     * @param {Array} legs - Unique legs to add [{ gameId, team, odds, market, line, pick }]
     * @param {Function} onProgress - ({current, total, status})
     * @param {Function} onComplete - (success)
     */
    async populateBetslip(legs, onProgress, onComplete) {
        // Deduplicate legs (same gameId+market+line+pick = same bet)
        const unique = [];
        const seen = new Set();
        for (const leg of legs) {
            const key = `${leg.gameId}-${leg.market}-${leg.line}-${leg.pick}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(leg);
            }
        }

        this.log(`Populating bet slip with ${unique.length} unique legs (from ${legs.length} total)`);

        let ok = 0, fail = 0;

        for (let i = 0; i < unique.length; i++) {
            const leg = unique[i];
            try {
                const clicked = await this._clickOuButton(leg);
                if (clicked) {
                    ok++;
                    if (onProgress) onProgress({ current: i + 1, total: unique.length, selection: leg, status: 'ok' });
                } else {
                    fail++;
                    if (onProgress) onProgress({ current: i + 1, total: unique.length, selection: leg, status: 'not_found' });
                }
                await this._sleep(150 + Math.random() * 100);
            } catch (err) {
                fail++;
                this.log('Error clicking leg:', leg, err);
                if (onProgress) onProgress({ current: i + 1, total: unique.length, selection: leg, status: 'error' });
            }
        }

        const allOk = fail === 0;
        if (onComplete) onComplete(allOk);
        return allOk;
    }

    /**
     * Find and click an O/U button for a specific leg.
     * Tries multiple strategies to locate the button.
     */
    async _clickOuButton(leg) {
        const { gameId, team, odds, market, line, pick } = leg;

        this.log(`Looking for: ${pick} ${line} @ ${odds} (${team})`);

        // Strategy A: Find by odds value + pick text in the current page
        let btn = this._findByOddsAndText(odds, pick, line);
        if (btn) { btn.click(); this.log('Clicked A:', btn.textContent.trim()); return true; }

        // Strategy B: Find by closest visible O/U button with matching pick
        btn = this._findByPickAndLine(pick, line, odds);
        if (btn) { btn.click(); this.log('Clicked B:', btn.textContent.trim()); return true; }

        // Strategy C: Find any button with matching odds value
        btn = this._findByOddsValue(odds);
        if (btn) { btn.click(); this.log('Clicked C:', btn.textContent.trim()); return true; }

        this.log(`Button not found for: ${pick} ${line} @ ${odds}`);
        return false;
    }

    /**
     * Strategy A: Find button by exact odds + text containing pick (O/U) + line.
     * O/U buttons in PokerBet look like:
     *   <generic class="clickable">210.5</generic>  ← the line
     *   <generic class="clickable">1.75</generic>   ← the over odds
     *   <generic class="clickable">1.95</generic>   ← the under odds
     */
    _findByOddsAndText(odds, pick, line) {
        if (!odds) return null;

        const oddsStr = odds.toString();
        // Find all clickable elements with odds-like text
        const allClickable = document.querySelectorAll('[class*="clickable"]');
        let bestMatch = null;
        let bestScore = 0;

        for (const el of allClickable) {
            const text = (el.textContent || '').trim();
            const num = parseFloat(text);

            if (isNaN(num)) continue;

            // Match odds within 0.01 tolerance
            if (Math.abs(num - odds) > 0.01) continue;

            // Check proximity to pick text
            const parent = el.closest('[class*="Total Points"], [class*="total"], [class*="market"], [class*="section"], [class*="region"]');
            const context = parent ? parent.textContent : document.body.textContent;

            let score = 0;
            if (pick && context.includes(pick)) score += 2;
            if (line && context.includes(line)) score += 1;
            if (pick === 'Over' && context.includes('Over')) score += 1;
            if (pick === 'Under' && context.includes('Under')) score += 1;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = el;
            }
        }

        return bestMatch;
    }

    /**
     * Strategy B: Find by pick (Over/Under) text and line number.
     * Looks for O/U buttons in the Total Points section.
     */
    _findByPickAndLine(pick, line, odds) {
        if (!pick || !line) return null;

        const allClickable = document.querySelectorAll('[class*="clickable"]');
        for (const el of allClickable) {
            const text = (el.textContent || '').trim();

            // Check if this element is in a row with our line number
            const parentRow = el.closest('[class*="row"], [class*="entry"], [class*="ou"]');
            const context = parentRow ? parentRow.textContent : el.parentElement?.textContent || '';

            if (context.includes(line) && (context.includes(pick) || context.includes(pick === 'Over' ? 'O' : 'U'))) {
                const num = parseFloat(text);
                if (!isNaN(num) && Math.abs(num - odds) < 0.5) {
                    return el;
                }
            }
        }
        return null;
    }

    /**
     * Strategy C: Last resort — find by odds value only.
     * Clicks the best numeric match.
     */
    _findByOddsValue(odds) {
        if (!odds) return null;

        const allClickable = document.querySelectorAll('[class*="clickable"]');
        let closest = null;
        let closestDiff = Infinity;

        for (const el of allClickable) {
            const text = (el.textContent || '').trim();
            const num = parseFloat(text);
            if (isNaN(num)) continue;

            // Only consider reasonable odds (1.01 - 100)
            if (num < 1.01 || num > 100) continue;

            const diff = Math.abs(num - odds);
            if (diff < closestDiff && diff < 0.5) {
                closestDiff = diff;
                closest = el;
            }
        }

        return closest;
    }

    /**
     * Start watching PokerBet's bet slip for changes.
     */
    startWatching(onChange) {
        const betslip = this._findBetslip();
        if (!betslip) {
            this.log('Bet slip container not found, retrying in 2s');
            setTimeout(() => this.startWatching(onChange), 2000);
            return;
        }

        this._observer = new MutationObserver(() => {
            const state = this._readState();
            if (onChange) onChange(state);
        });
        this._observer.observe(betslip, { childList: true, subtree: true, characterData: true });
        this.log('Watching bet slip');
    }

    stopWatching() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    }

    _findBetslip() {
        return document.querySelector(this._betslipSelector);
    }

    _readState() {
        const el = this._findBetslip();
        if (!el) return { selections: 0 };
        return {
            selections: el.querySelectorAll('[class*="selection"], [class*="bet-item"], [class*="slip-item"]').length,
            text: el.textContent.slice(0, 200),
        };
    }

    _sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
}
