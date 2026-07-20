/**
 * Stake Input — per-combination or total stake
 */

export class StakeInput {
    constructor(containerEl, onChange) {
        this._el = containerEl;
        this._onChange = onChange;
    }

    render() {
        this._el.innerHTML = `
            <div class="blm-stake-row">
                <label>Total Stake (R):</label>
                <input type="number" class="blm-stake-input" value="10" min="1" step="1">
            </div>
            <div class="blm-stake-mode">
                <label><input type="radio" name="stake-mode" value="total" checked> Total</label>
                <label><input type="radio" name="stake-mode" value="per-combo"> Per combo</label>
            </div>
        `;

        const input = this._el.querySelector('.blm-stake-input');
        input.oninput = () => this._onChange(parseFloat(input.value) || 10);
    }
}
