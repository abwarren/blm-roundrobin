/**
 * Scenario View — simulate outcomes
 */

export class ScenarioView {
    constructor(containerEl) {
        this._el = containerEl;
    }

    render(response, selections) {
        if (!response || !response.combinations) {
            this._el.innerHTML = '';
            return;
        }

        this._el.innerHTML = `
            <div class="blm-scenario-controls">
                <label>If <input type="number" class="blm-scenario-wins" value="${selections.length}" min="0" max="${selections.length}"> of ${selections.length} win:</label>
                <button class="blm-scenario-run">Calculate</button>
            </div>
            <div class="blm-scenario-result"></div>
        `;

        const winsInput = this._el.querySelector('.blm-scenario-wins');
        const runBtn = this._el.querySelector('.blm-scenario-run');
        const resultEl = this._el.querySelector('.blm-scenario-result');

        runBtn.onclick = () => {
            const wins = parseInt(winsInput.value, 10);
            // TODO: run scenario via API
            resultEl.textContent = `Scenario: ${wins}/${selections.length} wins`;
        };
    }
}
