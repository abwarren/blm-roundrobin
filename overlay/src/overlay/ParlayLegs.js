/**
 * Parlay Legs — shows currently selected legs
 */

export class ParlayLegs {
    constructor(containerEl, onRemove) {
        this._el = containerEl;
        this._onRemove = onRemove;
    }

    render(legs) {
        this._el.innerHTML = '';

        if (!legs || legs.length === 0) {
            this._el.innerHTML = '<div class="blm-empty">Click O/U on a game to add</div>';
            return;
        }

        for (const leg of legs) {
            const chip = document.createElement('div');
            chip.className = 'blm-leg-chip';
            chip.innerHTML = `
                <span class="blm-leg-team">${leg.team}</span>
                <span class="blm-leg-odds">@${leg.odds}</span>
                <button class="blm-leg-remove" data-leg-id="${leg.id}">×</button>
            `;
            chip.querySelector('.blm-leg-remove').onclick = () => this._onRemove(leg.id);
            this._el.appendChild(chip);
        }
    }
}
