/**
 * Summary Bar — key metrics at the bottom
 */

export class SummaryBar {
    constructor(containerEl) {
        this._el = containerEl;
    }

    render(summary) {
        if (!summary) {
            this._el.innerHTML = '';
            return;
        }

        this._el.innerHTML = `
            <div class="blm-summary-metrics">
                <div class="blm-metric">
                    <span class="blm-metric-label">Stake</span>
                    <span class="blm-metric-value">R${summary.totalStake.toFixed(2)}</span>
                </div>
                <div class="blm-metric">
                    <span class="blm-metric-label">Payout</span>
                    <span class="blm-metric-value">R${summary.maxPayout.toFixed(2)}</span>
                </div>
                <div class="blm-metric">
                    <span class="blm-metric-label">EV</span>
                    <span class="blm-metric-value ${summary.ev >= 0 ? 'positive' : 'negative'}">${(summary.ev || 0) >= 0 ? '+' : ''}${(summary.ev || 0).toFixed(1)}%</span>
                </div>
                <div class="blm-metric">
                    <span class="blm-metric-label">ROI</span>
                    <span class="blm-metric-value ${summary.roi >= 0 ? 'positive' : 'negative'}">${(summary.roi || 0) >= 0 ? '+' : ''}${(summary.roi || 0).toFixed(1)}%</span>
                </div>
            </div>
        `;
    }
}
