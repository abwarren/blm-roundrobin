/**
 * Results Panel — display generated combinations
 */

export class ResultsPanel {
    constructor(containerEl) {
        this._el = containerEl;
    }

    render(response) {
        if (!response || !response.combinations) {
            this._el.innerHTML = '<div class="blm-empty">Generate combinations to see results</div>';
            return;
        }

        const { combinations, summary } = response;

        let html = `<div class="blm-combo-count">${combinations.length} combinations</div>`;
        html += '<div class="blm-combo-list">';

        // Group by fold size
        const grouped = {};
        for (const combo of combinations) {
            const key = `${combo.legCount}-Fold`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(combo);
        }

        for (const [label, combos] of Object.entries(grouped)) {
            html += `<div class="blm-combo-group">
                <div class="blm-combo-group-title">${label} (${combos.length})</div>`;
            for (const combo of combos) {
                html += `<div class="blm-combo-row">
                    <span class="blm-combo-legs">${combo.legs.join(' + ')}</span>
                    <span class="blm-combo-odds">@${combo.odds.toFixed(2)}</span>
                    <span class="blm-combo-payout">R${combo.payout.toFixed(2)}</span>
                </div>`;
            }
            html += '</div>';
        }

        html += '</div>';

        this._el.innerHTML = html;
    }
}
