/**
 * PokerBet DOM Scraper
 *
 * Extracts live basketball games and their O/U markets from the PokerBet page.
 *
 * Scraping strategy:
 * 1. Find the Basketball section in the left sidebar
 * 2. Iterate through game rows in the expanded view
 * 3. For each game, extract team names, scores, period, clock
 * 4. Navigate into game detail to extract O/U markets if needed
 *
 * Market navigation:
 * - Game Total Points (Totals tab)
 * - Team Total Points
 * - Half Totals (Halves tab)
 * - Quarter Totals (Quarters tab)
 *
 * This runs inside pokerbet.co.za and reads the React-rendered DOM.
 */

export class Scraper {
    constructor() {
        this._lastScrapeHash = null;
    }

    /**
     * Scrape all live basketball games from the current DOM.
     * @returns {Array<GameData>}
     */
    scrapeBasketballGames() {
        const games = [];

        // Find all basketball game rows in the sidebar
        const gameRows = this._findGameRows();
        if (!gameRows || gameRows.length === 0) return [];

        for (const row of gameRows) {
            try {
                const game = this._parseGameRow(row);
                if (game) games.push(game);
            } catch (err) {
                console.warn('[BLM] Failed to parse game row:', err);
            }
        }

        return games;
    }

    /**
     * Navigate into a specific game to extract O/U market details.
     * Returns available O/U lines for all periods.
     * @param {string} gameId
     * @returns {Promise<Object>}
     */
    async scrapeGameMarkets(gameId) {
        // TODO: Navigate to game event view, click through
        // Totals / Halves / Quarters tabs, extract O/U lines.
        // For v1, we scrape the visible sidebar data only.
        return {};
    }

    // ── Internal ─────────────────────────────────────────────

    _findGameRows() {
        // Strategy 1: Find Basketball section with expanded league
        const basketSection = this._findBasketballSection();
        if (!basketSection) return [];

        // Find game rows within the Cyber Basketball league region
        const cyberLeague = basketSection.querySelector('[class*="Cyber Basketball"], [class*="2K26"]');
        if (cyberLeague) {
            return this._findGameRowsInRegion(cyberLeague);
        }

        // Fallback: find any game rows in the basketball region
        return this._findGameRowsInRegion(basketSection);
    }

    _findBasketballSection() {
        // Look for the Basketball button that's expanded
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent.includes('Basketball')) {
                const region = btn.nextElementSibling;
                if (region && region.getAttribute('role') === 'region') {
                    return region;
                }
            }
        }
        return null;
    }

    _findGameRowsInRegion(region) {
        // Game rows are generic[clickable] elements with team names and odds.
        // They're siblings within the league region.
        const rows = [];
        const children = region.children;
        for (const child of children) {
            if (this._isGameRow(child)) {
                rows.push(child);
            }
        }
        return rows;
    }

    _isGameRow(el) {
        const text = el.textContent || '';
        // A game row has: team names, scores, period, odds buttons
        return (
            text.includes('W1') &&
            (text.includes('Quarter') || text.includes('Q'))
        );
    }

    _parseGameRow(row) {
        const text = row.textContent || '';

        // Extract teams and scores from the full text
        // Pattern: "TeamName Score TeamName Score Period"
        const parts = this._extractStructuredData(row, text);
        if (!parts) return null;

        return {
            id: parts.id || this._generateGameId(parts),
            homeTeam: parts.homeTeam,
            awayTeam: parts.awayTeam,
            homeScore: parts.homeScore,
            awayScore: parts.awayScore,
            period: parts.period,
            clock: parts.clock,
            league: parts.league,
            eventUrl: parts.eventUrl,
            // For the sidebar view, we may only have W1/W2
            // Full O/U markets require navigating into the event
        };
    }

    _extractStructuredData(row, fullText) {
        // Extract from the clickable odds buttons within the row
        const oddsButtons = row.querySelectorAll('[class*="clickable"]');
        const odds = [];

        for (const btn of oddsButtons) {
            const text = btn.textContent.trim();
            const match = text.match(/^([Ww]\d)\s*([\d.]+)$/);
            if (match) {
                odds.push({ label: match[1], value: parseFloat(match[2]) });
            }
        }

        // Find team names — they're the text nodes before scores
        const staticTexts = row.querySelectorAll('[class*="StaticText"]');
        const texts = Array.from(staticTexts).map(t => t.textContent.trim());

        // Find period info
        const periodMatch = fullText.match(/(\d+)(?:st|nd|rd|th)\s*(Quarter|Q|Half|H)/i);
        const scoreMatch = fullText.match(/([\d]+)\s*:\s*([\d]+)/);
        const clockMatch = fullText.match(/(\d{1,2}):(\d{2})/);

        // Teams are typically the non-numeric strings in order
        const tokens = texts.filter(t => isNaN(parseFloat(t)) && t.length > 2);
        const homeTeam = tokens[0] || 'Home';
        const awayTeam = tokens[1] || 'Away';

        // Extract game ID from the onclick or href
        const clickable = row.querySelector('[onclick]');
        const onclickAttr = clickable ? clickable.getAttribute('onclick') : '';
        const idMatch = onclickAttr ? onclickAttr.match(/event-view[^/]+\/(\d+)/) : null;
        const gameId = idMatch ? idMatch[1] : `game-${Date.now()}`;

        return {
            id: gameId,
            homeTeam,
            awayTeam,
            homeScore: parseInt(tokens[1], 10) || 0,
            awayScore: parseInt(tokens[3], 10) || 0,
            period: periodMatch ? periodMatch[0] : '',
            clock: clockMatch ? clockMatch[0] : '',
            odds,
        };
    }

    _generateGameId(parts) {
        return `game-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    }
}

/**
 * @typedef {Object} GameData
 * @property {string} id
 * @property {string} homeTeam
 * @property {string} awayTeam
 * @property {number} homeScore
 * @property {number} awayScore
 * @property {string} period
 * @property {string} clock
 * @property {string} league
 * @property {Array<{label:string,value:number}>} odds
 */
