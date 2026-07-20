/**
 * Populate Button — triggers bet slip population
 */

export class PopulateButton {
    constructor(containerEl, onPopulate) {
        this._el = containerEl;
        this._onPopulate = onPopulate;
        this.render();
    }

    render() {
        this._el.innerHTML = `
            <button class="blm-populate-betslip" disabled>
                Populate Bet Slip
            </button>
            <div class="blm-populate-progress" style="display:none"></div>
        `;
        this._el.querySelector('.blm-populate-betslip').onclick = () => this._onPopulate();
    }

    setEnabled(enabled) {
        this._el.querySelector('.blm-populate-betslip').disabled = !enabled;
    }

    setLoading(isLoading, success) {
        const btn = this._el.querySelector('.blm-populate-betslip');
        const progress = this._el.querySelector('.blm-populate-progress');

        if (isLoading) {
            btn.disabled = true;
            btn.textContent = 'Populating...';
            progress.style.display = 'block';
        } else {
            btn.disabled = false;
            btn.textContent = 'Populate Bet Slip';
            progress.style.display = 'none';
            if (success !== undefined) {
                progress.textContent = success ? '✓ Bet slip populated!' : '✗ Some bets could not be added';
                progress.style.display = 'block';
                setTimeout(() => { progress.style.display = 'none'; }, 3000);
            }
        }
    }

    setProgress({ current, total }) {
        const progress = this._el.querySelector('.blm-populate-progress');
        progress.textContent = `Adding to bet slip... (${current}/${total})`;
    }
}
