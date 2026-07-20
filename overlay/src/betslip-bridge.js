/**
 * PokerBet Bet Slip Bridge
 *
 * Responsibilities:
 * 1. Locate odds buttons on the PokerBet page
 * 2. Programmatically click them to populate PokerBet's native bet slip
 * 3. Monitor bet slip state via MutationObserver
 * 4. Report progress and errors
 *
 * Safety:
 * - NEVER submits the bet slip (user clicks "Place Bet" themselves)
 * - Human-like delays between clicks (100-200ms)
 * - Validates odds haven't changed before clicking
 * - Falls back gracefully if a button can't be found
 */

export class BetslipBridge {
    constructor() {
        this._observer = null;
        this._betslipState = { selections: [], totalStake: 0 };
    }

    /**
     * Populate PokerBet's bet slip with a set of selections.
     * @param {Array<Selection>} selections - The legs to add
     * @param {Function} onProgress - Callback({current, total, selection})
     * @param {Function} onComplete - Callback(success: boolean)
     * @returns {Promise<boolean>} Whether all selections were placed
     */
    async populateBetslip(selections, onProgress, onComplete) {
        if (!selections || selections.length === 0) return false;

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < selections.length; i++) {
            const sel = selections[i];
            try {
                const clicked = await this._clickOddsButton(sel);
                if (clicked) {
                    successCount++;
                    if (onProgress) {
                        onProgress({ current: i + 1, total: selections.length, selection: sel, status: 'ok' });
                    }
                } else {
                    failCount++;
                    if (onProgress) {
                        onProgress({ current: i + 1, total: selections.length, selection: sel, status: 'not_found' });
                    }
                }

                // Human-like delay between clicks
                await this._sleep(100 + Math.random() * 100);
            } catch (err) {
                failCount++;
                console.warn('[BLM] Failed to click selection:', sel.label, err);
                if (onProgress) {
                    onProgress({ current: i + 1, total: selections.length, selection: sel, status: 'error', error: err });
                }
            }
        }

        const allOk = failCount === 0;
        if (onComplete) onComplete(allOk);
        return allOk;
    }

    /**
     * Start observing PokerBet's bet slip for changes.
     * @param {Function} onChange - Callback with current bet slip state
     */
    startWatching(onChange) {
        const betslipEl = this._findBetslipContainer();
        if (!betslipEl) {
            console.warn('[BLM] Bet slip container not found for watching');
            return;
        }

        this._observer = new MutationObserver(() => {
            const state = this._readBetslipState();
            if (onChange) onChange(state);
        });

        this._observer.observe(betslipEl, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }

    stopWatching() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    }

    /**
     * Read current selections from PokerBet's bet slip.
     * @returns {{ selections: Array, totalStake: number }}
     */
    _readBetslipState() {
        return { selections: [], totalStake: 0 };
    }

    /**
     * Find and click the odds button for a specific selection.
     * @param {Selection} sel
     * @returns {Promise<boolean>}
     */
    async _clickOddsButton(sel) {
        // Strategy: find the button by game + market + odds value
        const buttons = document.querySelectorAll('[class*="clickable"]');
        for (const btn of buttons) {
            const text = btn.textContent.trim();
            // Match odds value (e.g., "1.85", "2.10")
            const oddsMatch = text.match(/^(\d+\.\d+)$/);
            if (!oddsMatch) continue;

            const odds = parseFloat(oddsMatch[1]);
            if (Math.abs(odds - sel.odds) > 0.001) continue;

            // Check if this button is in the right game context
            const parentText = btn.closest('[class*="event"], [class*="game"]');
            const contextText = parentText ? parentText.textContent : document.body.textContent;

            if (contextText.includes(sel.homeTeam) || contextText.includes(sel.awayTeam)) {
                btn.click();
                return true;
            }
        }

        return false;
    }

    _findBetslipContainer() {
        return document.querySelector('[class*="betslip"], [class*="bet-slip"], [class*="BetSlip"]');
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * @typedef {Object} Selection
 * @property {string} id
 * @property {string} gameId
 * @property {string} homeTeam
 * @property {string} awayTeam
 * @property {string} market - e.g. "Total Points", "1st Half Total Points"
 * @property {string} line - e.g. "222.5"
 * @property {string} pick - "Over" | "Under"
 * @property {number} odds
 */
