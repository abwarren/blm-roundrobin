/**
 * Game List — displays scraped live basketball games with O/U selection
 *
 * Each game shows:
 *   [TeamA] score : score [TeamB]  [3rd Q 8:00]
 *   [O 210.5 @ 1.75]  [U 210.5 @ 1.95]
 *
 * Clicking O or U adds that leg to the parlay.
 * Same-game restriction: only one leg per game.
 * If game is in event view, show full O/U lines.
 */

export class GameList {
    constructor(containerEl, onToggle) {
        this._el = containerEl;
        this._onToggle = onToggle;
        this._currentGameId = null; // game currently in event view
    }

    render(games, selectedLegs, currentMarkets = null) {
        this._el.innerHTML = '';

        if (!games || games.length === 0) {
            this._el.innerHTML = '<div class="blm-empty">No live basketball games</div>';
            return;
        }

        // Detect which game we're currently viewing (from URL)
        this._detectCurrentGame(games);

        for (const game of games) {
            const isCurrentGame = game.id === this._currentGameId;
            const row = document.createElement('div');
            row.className = `blm-game-row ${isCurrentGame ? 'active' : ''}`;
            row.dataset.gameId = game.id;

            row.innerHTML = `
                <div class="blm-game-header">
                    <span class="blm-game-teams">
                        <span class="blm-team-home">${game.homeTeam}</span>
                        <span class="blm-score">${game.homeScore} : ${game.awayScore}</span>
                        <span class="blm-team-away">${game.awayTeam}</span>
                    </span>
                    <span class="blm-game-meta">
                        <span class="blm-period">${game.period || ''}</span>
                        <span class="blm-clock">${game.clock || ''}</span>
                        <span class="blm-league">${game.league || ''}</span>
                    </span>
                </div>
                <div class="blm-game-ou"></div>
            `;

            // If we have market data for this game, show O/U lines
            const ouContainer = row.querySelector('.blm-game-ou');
            if (isCurrentGame && currentMarkets) {
                this._renderOuLines(ouContainer, game, currentMarkets, selectedLegs);
            } else {
                // Show placeholder/clickable prompt
                ouContainer.innerHTML = `<span class="blm-ou-hint">Click game to load O/U markets</span>`;
            }

            // Click on row header navigates to game
            row.querySelector('.blm-game-header').onclick = () => {
                if (game.eventUrl) {
                    window.location.href = 'https://www.pokerbet.co.za' + game.eventUrl;
                }
            };

            this._el.appendChild(row);
        }
    }

    _renderOuLines(container, game, markets, selectedLegs) {
        let html = '';

        // Game Total Points
        if (markets.totalPoints && markets.totalPoints.length > 0) {
            html += `<div class="blm-ou-group">
                <span class="blm-ou-label">Game</span>
                <div class="blm-ou-entries">`;
            for (const entry of markets.totalPoints.slice(0, 3)) { // show top 3 lines
                html += this._ouButtonHtml(game, 'Game Total', entry.line, 'Over', entry.over, selectedLegs);
                html += this._ouButtonHtml(game, 'Game Total', entry.line, 'Under', entry.under, selectedLegs);
            }
            html += `</div></div>`;
        }

        // Team Totals
        if (markets.teamTotals) {
            for (const [team, lines] of Object.entries(markets.teamTotals)) {
                if (lines.length > 0) {
                    html += `<div class="blm-ou-group">
                        <span class="blm-ou-label">${team}</span>
                        <div class="blm-ou-entries">`;
                    for (const entry of lines.slice(0, 1)) { // show top line
                        html += this._ouButtonHtml(game, `${team} Total`, entry.line, 'Over', entry.over, selectedLegs);
                        html += this._ouButtonHtml(game, `${team} Total`, entry.line, 'Under', entry.under, selectedLegs);
                    }
                    html += `</div></div>`;
                }
            }
        }

        // Half Totals
        if (markets.halfTotals && markets.halfTotals.length > 0) {
            html += `<div class="blm-ou-group">
                <span class="blm-ou-label">1st Half</span>
                <div class="blm-ou-entries">`;
            for (const entry of markets.halfTotals.slice(0, 2)) {
                html += this._ouButtonHtml(game, '1st Half', entry.line, 'Over', entry.over, selectedLegs);
                html += this._ouButtonHtml(game, '1st Half', entry.line, 'Under', entry.under, selectedLegs);
            }
            html += `</div></div>`;
        }

        // Quarter Totals
        if (markets.quarterTotals && markets.quarterTotals.length > 0) {
            html += `<div class="blm-ou-group">
                <span class="blm-ou-label">Quarter</span>
                <div class="blm-ou-entries">`;
            for (const entry of markets.quarterTotals.slice(0, 2)) {
                html += this._ouButtonHtml(game, 'Quarter', entry.line, 'Over', entry.over, selectedLegs);
                html += this._ouButtonHtml(game, 'Quarter', entry.line, 'Under', entry.under, selectedLegs);
            }
            html += `</div></div>`;
        }

        container.innerHTML = html || '<span class="blm-empty">No O/U markets</span>';

        // Wire button clicks
        container.querySelectorAll('.blm-ou-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const { gameId, market, line, pick, odds, legId } = btn.dataset;
                this._onToggle({
                    id: legId,
                    gameId,
                    team: `${market} ${pick} ${line}`,
                    odds: parseFloat(odds),
                    market,
                    line,
                    pick,
                });
            };
        });
    }

    _ouButtonHtml(game, market, line, pick, odds, selectedLegs) {
        const legId = `${game.id}-${market}-${pick}-${line}`;
        const isSelected = selectedLegs.some(l => l.id === legId);
        return `<button class="blm-ou-btn ${pick.toLowerCase()} ${isSelected ? 'selected' : ''}"
            data-game-id="${game.id}"
            data-market="${market}"
            data-line="${line}"
            data-pick="${pick}"
            data-odds="${odds}"
            data-leg-id="${legId}">
            ${pick === 'Over' ? 'O' : 'U'} ${line} <span class="blm-ou-odds">${odds}</span>
        </button>`;
    }

    _detectCurrentGame(games) {
        const url = window.location.href;
        // Match game IDs in the URL
        for (const game of games) {
            if (url.includes(game.id)) {
                this._currentGameId = game.id;
                return;
            }
        }
        // Try matching team names
        for (const game of games) {
            if (url.includes(encodeURIComponent(game.homeTeam.replace(/\s+/g, '-'))) ||
                url.includes(encodeURIComponent(game.awayTeam.replace(/\s+/g, '-')))) {
                this._currentGameId = game.id;
                return;
            }
        }
        this._currentGameId = null;
    }
}
