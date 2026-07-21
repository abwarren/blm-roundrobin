/**
 * PokerBet Basketball O/U Market Scraper — Phase 1
 *
 * Extracts ALL Over/Under markets from live basketball games on PokerBet.
 *
 * Market hierarchy (varies by game type):
 *
 * Cyber 2K26 simulations:
 *   Match Winner | Points Handicap | Total Points (game + team totals)
 *   ❌ No Halves, No Quarters, No Team Totals per period
 *
 * Real basketball (WNBA, Uruguay, TBT):
 *   Match | Totals | Handicaps | Halves | Quarters | Last Digits
 *   ✅ Game Total Points (multiple lines)
 *   ✅ Team Total Points
 *   ✅ 1st/2nd Half Total Points + Team Totals
 *   ✅ 1st/2nd/3rd/4th Quarter Total Points + Team Totals
 *
 * Strategy:
 *   1. Extract all games from the sidebar (team names, scores, period)
 *   2. Navigate into each game's event view
 *   3. Click through market tabs (Totals → Halves → Quarters)
 *   4. Parse O/U tables from each tab
 *
 * NOTE: This scraper runs inside the pokerbet.co.za page via Tampermonkey.
 * It has full DOM access and no CORS restrictions.
 */

export class Scraper {
    constructor() {
        this._debug = true;
        this._lastGameIds = new Set();
    }

    log(...args) {
        if (this._debug) console.log('[BLM Scraper]', ...args);
    }

    /**
     * Step 1: Scrape the sidebar for all live basketball games.
     * Returns basic info: game ID, teams, scores, period, clock, league.
     */
    scrapeGameList() {
        const games = [];
        const basketSection = this._findBasketballSection();
        if (!basketSection) {
            this.log('Basketball section not found');
            return games;
        }

        // Each league button followed by a region containing game rows
        const leagueButtons = basketSection.querySelectorAll('button');
        for (const btn of leagueButtons) {
            const leagueName = btn.textContent.trim();
            const region = btn.nextElementSibling;
            if (!region || region.getAttribute('role') !== 'region') continue;

            const gameRows = this._findGameRows(region);
            for (const row of gameRows) {
                try {
                    const game = this._parseSidebarGame(row, leagueName);
                    if (game) games.push(game);
                } catch (e) {
                    this.log('Parse error:', e);
                }
            }
        }

        this.log(`Found ${games.length} live basketball games`);
        return games;
    }

    /**
     * Step 2: Navigate into a game's event view and extract O/U markets.
     * This reads the Total Points section plus any Half/Quarter tabs.
     *
     * Called via GM_xmlhttpRequest or by navigating the page.
     */
    scrapeGameMarkets(gameId, eventUrl) {
        this.log(`Scraping markets for game ${gameId}`);

        const markets = {
            gameId,
            totalPoints: [],
            teamTotals: {},
            halfTotals: [],
            quarterTotals: [],
        };

        // ── Game Total Points ──────────────────────────────────
        // Format: "Total Points\nOver\nUnder\n210.5\n1.75\n1.95\n..."
        const tpSection = this._findMarketSection('Total Points');
        if (tpSection) {
            markets.totalPoints = this._parseOuLines(tpSection);
        }

        // ── Team Total Points ───────────────────────────────────
        // Each team has its own O/U section after the game totals
        const teamSections = this._findTeamTotalSections();
        for (const [team, section] of Object.entries(teamSections)) {
            markets.teamTotals[team] = this._parseOuLines(section);
        }

        // ── Half Total Points ───────────────────────────────────
        if (this._switchMarketTab('Halves')) {
            const halfSection = this._findMarketSection('Half Total Points');
            if (halfSection) {
                markets.halfTotals = this._parseOuLines(halfSection);
            }
        }

        // ── Quarter Total Points ────────────────────────────────
        if (this._switchMarketTab('Quarters')) {
            const qSection = this._findMarketSection('Quarter Total Points');
            if (qSection) {
                markets.quarterTotals = this._parseOuLines(qSection);
            }
        }

        return markets;
    }

    // ── DOM Query Helpers ─────────────────────────────────

    _findBasketballSection() {
        // Strategy: find the Basketball button with expanded=true
        const allButtons = document.querySelectorAll('button');
        for (const btn of allButtons) {
            const text = btn.textContent || '';
            if (text.includes('Basketball') && btn.getAttribute('expanded') === 'true') {
                const region = btn.nextElementSibling;
                if (region && region.getAttribute('role') === 'region') {
                    return region;
                }
            }
        }

        // Fallback: look for the basketball section by icon
        const icons = document.querySelectorAll('[class*="bc-i-basketball"], [class*="basketball"]');
        for (const icon of icons) {
            const parent = icon.closest('button');
            if (parent) {
                const region = parent.nextElementSibling;
                if (region) return region;
            }
        }
        return null;
    }

    _findGameRows(region) {
        const rows = [];
        const children = region.children;
        for (let i = 0; i < children.length; i++) {
            const el = children[i];
            // Game rows are generic[clickable] elements that contain score data
            const text = el.textContent || '';
            if (text.includes(':') && (text.includes('Quarter') || text.includes('Half') || el.querySelector('[class*="clickable"]'))) {
                rows.push(el);
            }
        }
        return rows;
    }

    _parseSidebarGame(row, league) {
        const text = row.textContent || '';
        const staticTexts = Array.from(row.querySelectorAll('[class*="StaticText"], span, p'))
            .map(t => t.textContent.trim())
            .filter(t => t.length > 0);

        // Extract score: "49 : 29" or "45 : 56"
        const scoreMatch = text.match(/(\d+)\s*:\s*(\d+)/);
        const score = scoreMatch ? { home: parseInt(scoreMatch[1]), away: parseInt(scoreMatch[2]) } : { home: 0, away: 0 };

        // Extract period: "1st Quarter", "2nd Half", etc.
        const periodMatch = text.match(/(\d+)(?:st|nd|rd|th)\s*(Quarter|Half)/i);
        const period = periodMatch ? periodMatch[0] : '';

        // Extract clock: "02:20", "12:00"
        const clockMatch = text.match(/(\d{1,2}):(\d{2})/);
        const clock = clockMatch ? clockMatch[0] : '';

        // Extract team names from the composite score string
        // Pattern: "TeamName Score TeamName Score"
        const fullScoreStr = Array.from(row.querySelectorAll('[class*="StaticText"]'))
            .map(t => t.textContent.trim()).join(' ');

        // Find the odds buttons (W1/W2 in sidebar)
        const oddsBtns = row.querySelectorAll('[class*="clickable"]');
        let homeOdds = null, awayOdds = null;
        for (const btn of oddsBtns) {
            const btnText = btn.textContent.trim();
            const oddsMatch = btnText.match(/^([Ww]\d)\s*([\d.]+)$/);
            if (oddsMatch) {
                const val = parseFloat(oddsMatch[2]);
                if (oddsMatch[1].toLowerCase() === 'w1') homeOdds = val;
                else if (oddsMatch[1].toLowerCase() === 'w2') awayOdds = val;
            }
        }

        // Try to extract team names (non-numeric, non-odds text)
        const tokens = [];
        for (const t of staticTexts) {
            const num = parseFloat(t);
            if (isNaN(num) && !t.match(/^[Ww]\d/) && t !== ':' && t !== '+' && !t.match(/^\d+$/)) {
                // Check it's not a score string like "45 : 56"
                if (!t.match(/^\d+\s*:\s*\d+/)) {
                    tokens.push(t);
                }
            }
        }

        const homeTeam = tokens[0] || 'Home';
        const awayTeam = tokens[1] || 'Away';

        // Get game ID from the event URL (in onclick attribute)
        const clickableEl = row.querySelector('[onclick]');
        const onclick = clickableEl ? clickableEl.getAttribute('onclick') : '';
        const idMatch = onclick.match(/event-view[^/]*\/(\d+)/);
        const gameId = idMatch ? idMatch[1] : `g-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

        // Construct event URL
        const eventUrl = onclick.match(/\/en\/sports\/[^'"]+/)
            ? onclick.match(/\/en\/sports\/[^'"]+/)[0]
            : null;

        return {
            id: gameId,
            homeTeam,
            awayTeam,
            homeScore: score.home,
            awayScore: score.away,
            period,
            clock,
            league,
            homeOdds,
            awayOdds,
            eventUrl,
        };
    }

    // ── Market Parsing ───────────────────────────────────

    _findMarketSection(name) {
        // Look for the section header containing the market name
        const allEls = document.querySelectorAll('button, div, span');
        for (const el of allEls) {
            if (el.textContent.includes(name)) {
                // The O/U table is typically in the next sibling region
                const parent = el.closest('button');
                if (parent && parent.getAttribute('expanded') === 'true') {
                    return parent.nextElementSibling;
                }
            }
        }
        return null;
    }

    _findTeamTotalSections() {
        // After Total Points, there are per-team total sections
        const sections = {};
        const allText = document.body.innerText;
        const lines = allText.split('\n');

        let currentTeam = null;
        let capturing = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect team total header: "Denver Nuggets Cyber Total Points"
            const teamMatch = line.match(/^(.+?)\s+Total\s*Points$/);
            if (teamMatch) {
                currentTeam = teamMatch[1];
                capturing = true;
                sections[currentTeam] = [];
                continue;
            }

            if (capturing && currentTeam) {
                if (line === '' || line.includes('Total Points')) {
                    // Check if it's the next team section
                    if (line.match(/Total\s*Points$/)) {
                        currentTeam = line.replace(/\s+Total\s*Points$/, '');
                        sections[currentTeam] = [];
                        continue;
                    }
                    if (line === '') {
                        capturing = false;
                        currentTeam = null;
                    }
                    continue;
                }
                sections[currentTeam].push(line);
            }

            // Stop at "Match Winner And Total Points" or other combined markets
            if (line.includes('Match Winner And')) {
                capturing = false;
                break;
            }
        }

        // Parse each team's O/U lines
        const result = {};
        for (const [team, rawLines] of Object.entries(sections)) {
            if (rawLines.length >= 4) {
                result[team] = rawLines;
            }
        }
        return result;
    }

    _parseOuLines(sectionOrLines) {
        // Parse O/U table from either a DOM element or an array of text lines
        let lines;
        if (Array.isArray(sectionOrLines)) {
            lines = sectionOrLines;
        } else if (sectionOrLines && sectionOrLines.textContent) {
            lines = sectionOrLines.textContent.split('\n').map(l => l.trim()).filter(l => l);
        } else {
            return [];
        }

        const entries = [];
        let mode = 'header'; // header → looking for numbers
        let overOdds = null;

        for (const line of lines) {
            const num = parseFloat(line);

            if (line === 'Over' || line === 'Over\n') {
                mode = 'over';
                continue;
            }
            if (line === 'Under' || line === 'Under\n') {
                mode = 'under';
                continue;
            }

            if (mode === 'over' && !isNaN(num)) {
                overOdds = num;
                mode = 'line';
                continue;
            }

            if (mode === 'line' && !isNaN(num) && overOdds !== null) {
                // Collect the line value that precedes this
                // Actually the format is: Line | Over | Under
                // so we need to track the line number
                entries.push({
                    line: entries.length > 0
                        ? this._findLineBetween(entries[entries.length-1].over, num, lines, lines.indexOf(line.toString()))
                        : null,
                    over: overOdds,
                    under: num,
                });
                overOdds = null;
                mode = 'header';
            }
        }

        // Re-parse with correct format: line_number, over_odds, under_odds per row
        return this._reparseOuTable(lines);
    }

    _reparseOuTable(lines) {
        // O/U table format:
        // Line | Over | Under
        // 210.5 | 1.75 | 1.95
        // 211.5 | 1.80 | 1.90
        const entries = [];
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();
            const nums = line.split(/\s+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
            if (nums.length >= 3) {
                entries.push({
                    line: nums[0],
                    over: nums[1],
                    under: nums[2],
                });
            }
            i++;
        }
        return entries;
    }

    _findLineBetween(over, under, lines, startIdx) {
        // Try to find the line number that sits between over/under odds
        for (let i = Math.max(0, startIdx - 3); i < Math.min(lines.length, startIdx + 3); i++) {
            const num = parseFloat(lines[i].trim());
            if (!isNaN(num) && num !== over && num !== under && num > 100) {
                return num;
            }
        }
        return (over + under) / 2; // fallback: estimate
    }

    _switchMarketTab(tabName) {
        // Click a market tab (Halves, Quarters) by its text
        const allEls = document.querySelectorAll('div, span, button');
        for (const el of allEls) {
            const text = el.textContent.trim();
            if (text === tabName) {
                const tab = el.closest('[class*="tab"]') || el;
                tab.click();
                return true;
            }
        }
        return false;
    }

    // ── Navigation Helpers ──────────────────────────────

    navigateToGame(gameId) {
        // Find the game row in the sidebar and click it
        const gameRow = document.querySelector(`[data-game-id="${gameId}"]`);
        if (gameRow) {
            gameRow.click();
            return true;
        }

        // Fallback: find by score text
        const allRows = document.querySelectorAll('[class*="clickable"]');
        for (const row of allRows) {
            if (row.textContent.includes(gameId) || row.getAttribute('onclick')?.includes(gameId)) {
                row.click();
                return true;
            }
        }
        return false;
    }

    getEventUrl(gameId) {
        const allEls = document.querySelectorAll('[onclick]');
        for (const el of allEls) {
            const onclick = el.getAttribute('onclick') || '';
            if (onclick.includes(gameId)) {
                const match = onclick.match(/\/en\/sports\/[^'"]+/);
                if (match) return 'https://www.pokerbet.co.za' + match[0];
            }
        }
        return null;
    }
}
