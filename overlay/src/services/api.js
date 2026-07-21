/**
 * API Service — communicates with FastAPI backend at localhost:8420
 */

export class ApiService {
    constructor(baseUrl = 'http://localhost:8420') {
        this._baseUrl = baseUrl;
        this._fallback = null; // client-side fallback instance
    }

    setFallback(fb) { this._fallback = fb; }

    async generateCombinations(selections, folds, stakePerCombo = 2.0) {
        return this._post('/generate', {
            selections: selections.map(s => ({
                id: s.id,
                gameId: s.gameId || '',
                team: s.team || s.label || '',
                odds: s.odds,
                market: s.market || '',
                line: s.line || '',
                pick: s.pick || '',
            })),
            folds,
            stake_per_combo: stakePerCombo,
        });
    }

    async getTemplates() {
        return this._get('/templates');
    }

    async runScenario(combinations, wins, totalSelections) {
        return this._post('/scenario', { combinations, wins, total_selections: totalSelections });
    }

    async healthCheck() {
        try {
            const res = await this._get('/health');
            return res;
        } catch {
            return { status: 'unreachable' };
        }
    }

    async _get(path) {
        const res = await fetch(`${this._baseUrl}${path}`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
    }

    async _post(path, body) {
        const res = await fetch(`${this._baseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`API ${res.status}: ${text.slice(0,200)}`);
        }
        return res.json();
    }
}
