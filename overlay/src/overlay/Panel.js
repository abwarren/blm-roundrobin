/**
 * BLM Overlay Panel — Root Component
 *
 * The floating panel injected into PokerBet. Manages the full lifecycle:
 * - Collapse/expand
 * - Mounting components
 * - Routing between views (selections, generator, results)
 */

import { GameList } from './GameList.js';
import { ParlayLegs } from './ParlayLegs.js';
import { SystemPicker } from './SystemPicker.js';
import { StakeInput } from './StakeInput.js';
import { ResultsPanel } from './ResultsPanel.js';
import { SummaryBar } from './SummaryBar.js';
import { PopulateButton } from './PopulateButton.js';
import { ScenarioView } from './ScenarioView.js';

export class Panel {
    constructor({ container, api, storage, scraper, betslipBridge, config }) {
        this._container = container;
        this._api = api;
        this._storage = storage;
        this._scraper = scraper;
        this._betslipBridge = betslipBridge;
        this._config = config;

        // State
        this._games = [];
        this._selectedLegs = [];
        this._systemConfig = { folds: [2], stake: 10 };
        this._combinations = null;
        this._currentMarkets = null;
        this._el = null;
    }

    mount() {
        this._el = document.createElement('div');
        this._el.className = 'blm-panel';
        this._el.innerHTML = `
            <div class="blm-header">
                <span class="blm-logo">BLM</span>
                <span class="blm-title">Parlay Builder</span>
                <button class="blm-collapse-btn" title="Toggle panel">‹</button>
            </div>
            <div class="blm-body">
                <div class="blm-section blm-games-section">
                    <div class="blm-section-title">Live Games</div>
                    <div class="blm-games-list"></div>
                </div>
                <div class="blm-section blm-parlay-section">
                    <div class="blm-section-title">My Parlay (<span class="blm-leg-count">0</span>)</div>
                    <div class="blm-parlay-legs"></div>
                </div>
                <div class="blm-section blm-system-section">
                    <div class="blm-section-title">System</div>
                    <div class="blm-system-picker"></div>
                    <div class="blm-stake-input"></div>
                </div>
                <div class="blm-section blm-results-section" style="display:none">
                    <div class="blm-section-title">Combinations</div>
                    <div class="blm-results-panel"></div>
                </div>
                <div class="blm-section blm-scenario-section" style="display:none">
                    <div class="blm-section-title">Scenario</div>
                    <div class="blm-scenario-view"></div>
                </div>
                <div class="blm-populate-area">
                    <div class="blm-summary-bar"></div>
                    <div class="blm-populate-btn"></div>
                </div>
                <div class="blm-error-bar" style="display:none"></div>
            </div>
        `;

        this._container.appendChild(this._el);

        // Mount sub-components
        const gameListEl = this._el.querySelector('.blm-games-list');
        const parlayLegsEl = this._el.querySelector('.blm-parlay-legs');
        const systemPickerEl = this._el.querySelector('.blm-system-picker');
        const stakeInputEl = this._el.querySelector('.blm-stake-input');
        const resultsPanelEl = this._el.querySelector('.blm-results-panel');
        const summaryBarEl = this._el.querySelector('.blm-summary-bar');
        const populateBtnEl = this._el.querySelector('.blm-populate-btn');
        const scenarioViewEl = this._el.querySelector('.blm-scenario-view');

        this._gameList = new GameList(gameListEl, this._onGameToggle.bind(this));
        this._parlayLegs = new ParlayLegs(parlayLegsEl, this._onRemoveLeg.bind(this));
        this._systemPicker = new SystemPicker(systemPickerEl, this._onSystemChange.bind(this));
        this._stakeInput = new StakeInput(stakeInputEl, this._onStakeChange.bind(this));
        this._resultsPanel = new ResultsPanel(resultsPanelEl);
        this._summaryBar = new SummaryBar(summaryBarEl);
        this._populateButton = new PopulateButton(populateBtnEl, this._onPopulate.bind(this));
        this._scenarioView = new ScenarioView(scenarioViewEl);

        // Wire collapse
        this._el.querySelector('.blm-collapse-btn').onclick = () => this.toggleCollapse();

        // Restore session
        this._restoreSession();
    }

    updateGameList(games) {
        this._games = games;
        this._gameList.render(games, this._selectedLegs, this._currentMarkets);
        this._systemPicker.updateN(games.length);
    }

    updateMarkets(markets) {
        this._currentMarkets = markets;
        // Re-render game list with markets for the current game
        this._gameList.render(this._games, this._selectedLegs, markets);
    }

    toggleCollapse() {
        this._container.classList.toggle('collapsed');
        const btn = this._el.querySelector('.blm-collapse-btn');
        btn.textContent = this._container.classList.contains('collapsed') ? '›' : '‹';
    }

    showError(msg) {
        const bar = this._el.querySelector('.blm-error-bar');
        bar.textContent = msg;
        bar.style.display = 'block';
        setTimeout(() => { bar.style.display = 'none'; }, 5000);
    }

    // ── State Management ─────────────────────────────────────

    _onGameToggle(leg) {
        // leg = { id, gameId, team, odds, market, line, pick }
        if (!leg || !leg.gameId) return;

        const existingGameIds = this._selectedLegs.map(l => l.gameId);
        if (existingGameIds.includes(leg.gameId)) {
            const existing = this._selectedLegs.find(l => l.gameId === leg.gameId);
            if (existing && existing.id === leg.id) {
                // Same leg clicked again → remove
                this._selectedLegs = this._selectedLegs.filter(l => l.id !== leg.id);
                this._updateUI();
                this._saveSession();
                return;
            }
            // Different leg for same game → replace
            this._selectedLegs = this._selectedLegs.filter(l => l.gameId !== leg.gameId);
        }

        this._selectedLegs.push(leg);
        this._updateUI();
        this._saveSession();
    }

    _onRemoveLeg(legId) {
        this._selectedLegs = this._selectedLegs.filter(l => l.id !== legId);
        this._updateUI();
        this._saveSession();
    }

    _onSystemChange(config) {
        this._systemConfig = { ...this._systemConfig, ...config };
        this._generateCombinations();
    }

    _onStakeChange(stake) {
        this._systemConfig.stake = stake;
        this._generateCombinations();
    }

    async _generateCombinations() {
        if (this._selectedLegs.length < 2) {
            this._el.querySelector('.blm-results-section').style.display = 'none';
            this._el.querySelector('.blm-scenario-section').style.display = 'none';
            return;
        }

        try {
            const response = await this._api.generateCombinations({
                selections: this._selectedLegs,
                folds: this._systemConfig.folds,
                stakePerCombo: this._systemConfig.stake / this._countCombinations(),
            });

            this._combinations = response;
            this._resultsPanel.render(response);
            this._summaryBar.render(response.summary);
            this._scenarioView.render(response, this._selectedLegs);
            this._el.querySelector('.blm-results-section').style.display = 'block';
            this._el.querySelector('.blm-scenario-section').style.display = 'block';
        } catch (err) {
            // Client-side fallback for small N
            this._clientSideGenerate();
        }
    }

    _clientSideGenerate() {
        // Basic client-side combo generation (limited)
        // TODO: Implement simple combinatorics inline
        this.showError('Backend unreachable — client-side gen limited');
    }

    async _onPopulate() {
        if (!this._combinations || !this._combinations.combinations) return;

        this._populateButton.setLoading(true);

        const allLegs = this._combinations.combinations.map(c => ({
            gameId: c.gameId,
            homeTeam: c.homeTeam,
            awayTeam: c.awayTeam,
            market: c.market,
            line: c.line,
            pick: c.pick,
            odds: c.odds,
        }));

        const success = await this._betslipBridge.populateBetslip(
            allLegs,
            (progress) => this._populateButton.setProgress(progress),
            (allOk) => this._populateButton.setLoading(false, allOk),
        );
    }

    _updateUI() {
        // Update leg count
        this._el.querySelector('.blm-leg-count').textContent = this._selectedLegs.length;

        // Re-render game list with selection state + current markets
        this._gameList.render(this._games, this._selectedLegs, this._currentMarkets);

        // Re-render parlay legs
        this._parlayLegs.render(this._selectedLegs);

        // Re-generate
        this._generateCombinations();
    }

    _saveSession() {
        this._storage.set('selectedLegs', this._selectedLegs);
        this._storage.set('systemConfig', this._systemConfig);
    }

    _restoreSession() {
        const legs = this._storage.get('selectedLegs', []);
        const config = this._storage.get('systemConfig', { folds: [2], stake: 10 });
        if (legs.length > 0) {
            this._selectedLegs = legs;
            this._systemConfig = config;
            this._updateUI();
        }
    }
}
