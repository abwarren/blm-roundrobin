/**
 * System Picker — choose bet types (doubles, trebles, Yankee, etc.)
 */

import { SYSTEM_TEMPLATES } from '../../constants/system-templates.js';

export class SystemPicker {
    constructor(containerEl, onChange) {
        this._el = containerEl;
        this._onChange = onChange;
        this._currentFolds = [2];
    }

    render() {
        this._el.innerHTML = `
            <div class="blm-system-templates">
                <button class="blm-system-btn active" data-folds="2">Doubles</button>
                <button class="blm-system-btn" data-folds="3">Trebles</button>
                <button class="blm-system-btn" data-folds="4">4-Folds</button>
                <button class="blm-system-btn" data-folds="5">5-Folds</button>
            </div>
            <div class="blm-system-presets">
                <button class="blm-preset-btn" data-template="yankee">Yankee</button>
                <button class="blm-preset-btn" data-template="canadian">Canadian</button>
                <button class="blm-preset-btn" data-template="heinz">Heinz</button>
                <button class="blm-preset-btn" data-template="lucky15">Lucky 15</button>
                <button class="blm-preset-btn" data-template="lucky31">Lucky 31</button>
                <button class="blm-preset-btn" data-template="goliath">Goliath</button>
            </div>
            <div class="blm-round-robin">
                <label>Round Robin: <input type="number" class="blm-rr-x" value="2" min="2" max="10"> of <span class="blm-rr-n">N</span></label>
            </div>
        `;

        // Wire fold buttons
        this._el.querySelectorAll('.blm-system-btn').forEach(btn => {
            btn.onclick = () => {
                const folds = parseInt(btn.dataset.folds, 10);
                this._el.querySelectorAll('.blm-system-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._currentFolds = [folds];
                this._onChange({ folds: this._currentFolds });
            };
        });

        // Wire preset buttons
        this._el.querySelectorAll('.blm-preset-btn').forEach(btn => {
            btn.onclick = () => {
                const template = SYSTEM_TEMPLATES[btn.dataset.template];
                if (template) {
                    this._currentFolds = template.folds;
                    this._onChange({ folds: template.folds });
                }
            };
        });

        // Wire RR input
        const rrInput = this._el.querySelector('.blm-rr-x');
        rrInput.onchange = () => {
            const x = parseInt(rrInput.value, 10);
            if (x >= 2) {
                this._currentFolds = [x];
                this._onChange({ folds: [x] });
            }
        };
    }

    updateN(count) {
        this._el.querySelector('.blm-rr-n').textContent = count;
    }
}
