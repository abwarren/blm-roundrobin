/**
 * API Service — communicates with FastAPI backend
 */

export class ApiService {
    constructor(baseUrl) {
        this._baseUrl = baseUrl;
    }

    async generateCombinations({ selections, folds, stakePerCombo }) {
        return this._post('/api/v1/combinations/generate', {
            selections: selections.map(s => ({
                id: s.id,
                gameId: s.gameId,
                team: s.team,
                odds: s.odds,
            })),
            folds,
            stakePerCombo,
        });
    }

    async runScenario(projectId, config) {
        return this._post(`/api/v1/projects/${projectId}/combinations/scenario`, config);
    }

    async optimise(projectId, target) {
        return this._post(`/api/v1/projects/${projectId}/combinations/optimise`, { target });
    }

    async healthCheck() {
        try {
            return await this._get('/api/v1/health');
        } catch {
            return { status: 'unreachable' };
        }
    }

    async _get(path) {
        const res = await fetch(`${this._baseUrl}${path}`);
        if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
        return res.json();
    }

    async _post(path, body) {
        const res = await fetch(`${this._baseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
        return res.json();
    }
}
