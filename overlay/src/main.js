/**
 * BLM Parlay Builder — Main Entry Point
 *
 * Responsibilities:
 * 1. Inject overlay container into PokerBet page
 * 2. Mount the panel component
 * 3. Start DOM scraper on interval
 * 4. Wire up bet slip bridge
 */

import { Panel } from './overlay/Panel.js';
import { Scraper } from './scraper.js';
import { BetslipBridge } from './betslip-bridge.js';
import { ApiService } from './services/api.js';
import { StorageService } from './services/storage.js';
import { BLM_STYLES } from './styles/blm-overlay.css.js';

(function () {
    'use strict';

    const CONFIG = {
        scrapeIntervalMs: 15000,    // Re-scan DOM every 15s
        backendUrl: 'http://localhost:8420',
        maxSelections: 30,           // Hard limit for performance
        debug: true,
    };

    // ── Bootstrap ────────────────────────────────────────────

    function init() {
        log('BLM Parlay Builder initializing...');

        // Inject styles
        const style = document.createElement('style');
        style.textContent = BLM_STYLES;
        document.head.appendChild(style);

        // Create overlay container
        const container = document.createElement('div');
        container.id = 'blm-overlay-container';
        container.className = 'blm-overlay collapsed';
        document.body.appendChild(container);

        // Init services
        const api = new ApiService(CONFIG.backendUrl);
        const storage = new StorageService();
        const scraper = new Scraper();
        const betslipBridge = new BetslipBridge();

        // Mount panel
        const panel = new Panel({
            container,
            api,
            storage,
            scraper,
            betslipBridge,
            config: CONFIG,
        });

        panel.mount();

        // Start scraper loop
        startScraperLoop(scraper, panel, CONFIG.scrapeIntervalMs);

        log('BLM Parlay Builder initialized');
    }

    function startScraperLoop(scraper, panel, intervalMs) {
        async function scrape() {
            try {
                const games = scraper.scrapeBasketballGames();
                if (games && games.length > 0) {
                    panel.updateGames(games);
                }
            } catch (err) {
                log('Scraper error:', err);
            }
        }

        // Initial scrape immediately
        scrape();

        // Then interval
        setInterval(scrape, intervalMs);
    }

    function log(...args) {
        if (CONFIG.debug) {
            console.log('[BLM]', ...args);
        }
    }

    // ── Wait for DOM ─────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
