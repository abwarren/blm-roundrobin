/**
 * BLM Parlay Builder — Main Entry Point
 *
 * Responsibilities:
 * 1. Inject overlay container into PokerBet page
 * 2. Mount the panel component
 * 3. Scrape game list from sidebar + O/U markets from event view
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
        gameListIntervalMs: 20000,  // Refresh game list every 20s
        marketScrapeDelayMs: 1000,  // Wait 1s after nav before scraping markets
        backendUrl: 'http://localhost:8420',
        maxSelections: 30,
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

        // ── Scrape loop: game list from sidebar ──────────────
        function scrapeGameList() {
            try {
                const games = scraper.scrapeGameList();
                panel.updateGameList(games);
            } catch (err) {
                log('Game list scrape error:', err);
            }
        }

        // ── Scrape: O/U markets from current event view ──────
        function scrapeEventMarkets() {
            try {
                const markets = scraper.scrapeGameMarkets();
                if (markets && Object.keys(markets).length > 0) {
                    panel.updateMarkets(markets);
                }
            } catch (err) {
                log('Market scrape error:', err);
            }
        }

        // Initial scrapes
        scrapeGameList();
        scrapeEventMarkets();

        // Refresh game list periodically
        setInterval(scrapeGameList, CONFIG.gameListIntervalMs);

        // Watch for URL changes (SPA navigation) to re-scrape markets
        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                log('URL changed, re-scraping markets');
                setTimeout(scrapeEventMarkets, CONFIG.marketScrapeDelayMs);
            }
        }).observe(document, { subtree: true, childList: true });

        log('BLM Parlay Builder initialized');
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
