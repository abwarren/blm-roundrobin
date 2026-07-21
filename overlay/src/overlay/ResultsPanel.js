/**
 * Results Panel — display generated combinations
 */

export class ResultsPanel {
    constructor(containerEl) {
        this._el = containerEl;
    }

    showLoading() {
        this._el.innerHTML = '<div class="blm-loading">Generating combos...</div>';
    }

    render(response) {
        if (!response || !response.combinations) {
            this._el.innerHTML = '<div class="blm-empty">Select 2+ games and a system to generate</div>';
            return;
        }

        const { combinations, summary } = response;

        let html = `<div class="blm-combo-count">${combinations.length} combos · R${summary.totalStake} stake</div>`;
        html += '<div class="blm-combo-list">';

        // Group by fold size (leg_count)
        const grouped = {};
        for (const combo of combinations) {
            const key = `${combo.leg_count}-Fold`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(combo);
        }

        for (const [label, combos] of Object.entries(grouped)) {
            html += `<div class="blm-combo-group">
                <div class="blm-combo-group-title">${label} (${combos.length})</div>`;
            for (const combo of combos) {
                // Simple heuristic BLM score based on odds: lower odds = higher confidence = higher BLM
                const blmEstimate = Math.round(Math.min(95, Math.max(20, (1 / combo.odds) * 100)));
                const confidence = Math.round(Math.min(90, (1 / combo.odds) * 85));

                html += `<div class="blm-combo-row">
                    <span class="blm-combo-legs">${combo.legs.join(', ')}</span>
                    <span class="blm-combo-odds">@${combo.odds.toFixed(2)}</span>
                    <span class="blm-combo-blm" title="BLM score">${blmEstimate}</span>
                    <span class="blm-combo-payout">R${combo.payout.toFixed(2)}</span>
                </div>`;
            }
            html += '</div>';
        }

        html += '</div>';

        // BLM summary
        if (summary) {
            const avgBlm = Math.round(combinations.reduce((s, c) => s + (1 / c.odds) * 100, 0) / combinations.length);
            html += `<div class="blm-blm-summary">
                <span>Avg BLM: ${avgBlm}</span>
                <span>Breakeven: ${summary.breakevenPct || summary.breakeven_pct || 0}%</span>
            </div>`;
        }

        this._el.innerHTML = html;
    }
}
