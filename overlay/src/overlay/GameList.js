/**
 * Game List — displays scraped games with Over/Under selection
 */

export class GameList {
    constructor(containerEl, onToggle) {
        this._el = containerEl;
        this._onToggle = onToggle;
    }

    render(games, selectedLegs) {
        this._el.innerHTML = '';

        if (!games || games.length === 0) {
            this._el.innerHTML = '<div class="blm-empty">No live games found</div>';
            return;
        }

        for (const game of games) {
            const row = document.createElement('div');
            row.className = 'blm-game-row';
            row.setAttribute('data-game-id', game.id);

            const selectedIds = selectedLegs.map(l => l.gameId);
            const isSelected = selectedIds.includes(game.id);

            row.innerHTML = `
                <div class="blm-game-info">
                    <span class="blm-team-home">${game.homeTeam}</span>
                    <span class="blm-score">${game.homeScore} : ${game.awayScore}</span>
                    <span class="blm-team-away">${game.awayTeam}</span>
                    <span class="blm-period">${game.period || ''} ${game.clock || ''}</span>
                </div>
                <div class="blm-game-odds">
                    <button class="blm-odds-btn over ${isSelected ? 'selected' : ''}" 
                            data-team="${game.homeTeam}" data-odds="${game.homeOdds || 1.0}">
                        O ${game.homeOdds || '—'}
                    </button>
                    <button class="blm-odds-btn under ${isSelected ? 'selected' : ''}" 
                            data-team="${game.awayTeam}" data-odds="${game.awayOdds || 1.0}">
                        U ${game.awayOdds || '—'}
                    </button>
                </div>
            `;

            // Wire clicks
            const overBtn = row.querySelector('.over');
            const underBtn = row.querySelector('.under');

            overBtn.onclick = () => this._onToggle(game.id, game.homeTeam, parseFloat(game.homeOdds || 1.0));
            underBtn.onclick = () => this._onToggle(game.id, game.awayTeam, parseFloat(game.awayOdds || 1.0));

            this._el.appendChild(row);
        }
    }
}
