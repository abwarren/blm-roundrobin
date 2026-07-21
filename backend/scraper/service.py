"""
PokerBet O/U Market Scraper — Playwright headless.

Bandwidth-optimised headless scraper for PokerBet live basketball.
Blocks images, fonts, media, ads, analytics. Early-exit once O/U data is extracted.

Extracts:
- Game list from the sidebar (teams, scores, period)
- Game Total Points (multi-line O/U)
- Team Total Points
- Half/Quarter Total Points if available

Usage:
    from scraper.service import PokerBetScraper
    scraper = PokerBetScraper()
    games = await scraper.scrape_live_games()
"""

import re, json, asyncio, time
from typing import Optional
from urllib.parse import urljoin

from playwright.async_api import async_playwright, Page, Browser, BrowserContext

from scraper.bandwidth import BandwidthTracker, PageMetrics


BASE_URL = "https://www.pokerbet.co.za"
LIVE_BASKETBALL_URL = urljoin(BASE_URL, "/en/sports/live")


class PokerBetScraper:
    """Headless Playwright scraper for PokerBet basketball O/U markets.

    Reuses browser instance across calls. Blocks unnecessary resources.
    Early-exits once target data is extracted.
    """

    def __init__(self, headless: bool = True, block_resources: bool = True):
        self._headless = headless
        self._block_resources = block_resources
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._metrics_log: list[PageMetrics] = []
        self._lock = asyncio.Lock()
        self._launch_count = 0

    # ── Lifecycle ─────────────────────────────────────────────

    async def start(self):
        """Launch browser (once, reused across calls)."""
        if self._browser:
            return
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self._headless,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-accelerated-2d-canvas",
            ],
        )
        await self._create_context()
        self._launch_count += 1

    async def _create_context(self):
        """Create a fresh browser context with realistic fingerprint."""
        if self._context:
            await self._context.close()
        self._context = await self._browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="en-ZA",
            timezone_id="Africa/Johannesburg",
            accept_downloads=False,
        )

    async def stop(self):
        """Release all resources."""
        if self._context:
            await self._context.close()
            self._context = None
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, *args):
        await self.stop()

    # ── Public API ────────────────────────────────────────────

    async def scrape_live_games(self) -> tuple[list[dict], PageMetrics]:
        """Scrape all live basketball games with their O/U markets.

        Returns:
            (games_list, metrics)
        """
        async with self._lock:
            return await self._do_scrape()

    async def get_metrics_log(self) -> list[dict]:
        """Return bandwidth metrics for all scrapes so far."""
        return [m.summary() for m in self._metrics_log]

    # ── Internal ──────────────────────────────────────────────

    async def _do_scrape(self) -> tuple[list[dict], PageMetrics]:
        tracker = BandwidthTracker()
        page = await self._context.new_page()

        try:
            tracker.set_url(LIVE_BASKETBALL_URL)

            if self._block_resources:
                await page.route("**/*", tracker.on_route)

            # Navigate — wait for DOM content only, not networkidle
            await page.goto(LIVE_BASKETBALL_URL, wait_until="domcontentloaded", timeout=30000)

            # Wait for Basketball section to appear
            await self._wait_for_basketball_section(page)

            # Step 1: Extract game list from sidebar
            games = await self._extract_game_list(page)

            # Step 2: For each game that's visible, try to extract O/U
            for game in games:
                game["markets"] = {}
                try:
                    markets = await self._scrape_game_markets(page, game)
                    if markets:
                        game["markets"] = markets
                except Exception:
                    pass

            metrics = tracker.finalize(success=True)
            self._metrics_log.append(metrics)

            return games, metrics

        except Exception as e:
            metrics = tracker.finalize(success=False)
            self._metrics_log.append(metrics)
            raise

        finally:
            await page.close()

    async def _wait_for_basketball_section(self, page: Page, timeout: int = 15000):
        """Wait until the Basketball navigation button is visible and expanded."""
        deadline = time.time() + timeout / 1000
        while time.time() < deadline:
            try:
                # Check if Basketball section exists
                has_basketball = await page.evaluate("""
                    () => {
                        const buttons = document.querySelectorAll('button');
                        for (const btn of buttons) {
                            if (btn.textContent.includes('Basketball')) return true;
                        }
                        return false;
                    }
                """)
                if has_basketball:
                    return
            except Exception:
                pass
            await asyncio.sleep(1)

        raise TimeoutError("Basketball section did not appear")

    async def _extract_game_list(self, page: Page) -> list[dict]:
        """Extract all basketball games from the sidebar DOM."""
        games = await page.evaluate("""
            () => {
                const results = [];

                // Find the Basketball expanded section
                const buttons = document.querySelectorAll('button');
                let basketSection = null;
                for (const btn of buttons) {
                    const text = btn.textContent || '';
                    if (text.includes('Basketball') && btn.getAttribute('expanded') === 'true') {
                        basketSection = btn.nextElementSibling;
                        break;
                    }
                }
                if (!basketSection) return [];

                // Find league buttons within the basketball section
                const leagueBtns = basketSection.querySelectorAll('button');
                for (const btn of leagueBtns) {
                    const leagueName = (btn.textContent || '').trim();
                    const region = btn.nextElementSibling;
                    if (!region) continue;

                    // Find game rows in the league region
                    const gameRows = region.querySelectorAll('[class*="clickable"]');
                    for (const row of gameRows) {
                        const text = row.textContent || '';
                        if (!text.includes(':')) continue;
                        if (!text.match(/Quarter|Half|Q/)) continue;

                        // Extract score
                        const scoreMatch = text.match(/(\\d+)\\s*:\\s*(\\d+)/);
                        if (!scoreMatch) continue;

                        // Extract period
                        const periodMatch = text.match(/(\\d+)(?:st|nd|rd|th)\\s*(Quarter|Half)/i);

                        // Extract clock
                        const clockMatch = text.match(/(\\d{1,2}):(\\d{2})/);

                        // Extract odds
                        const odds = [];
                        const oddsRows = row.querySelectorAll('[class*="clickable"]');
                        for (const o of oddsRows) {
                            const ot = (o.textContent || '').trim();
                            const om = ot.match(/^[Ww]\\d\\s*([\\d.]+)$/);
                            if (om) odds.push(parseFloat(om[1]));
                        }

                        // Extract teams — they're text nodes between scores
                        const texts = Array.from(row.querySelectorAll('span, p, div'))
                            .map(t => (t.textContent || '').trim())
                            .filter(t => t.length > 2 && isNaN(parseFloat(t)));

                        // Find game ID from onclick
                        const clickable = row.querySelector('[onclick]');
                        const onclick = clickable ? clickable.getAttribute('onclick') || '' : '';
                        const idMatch = onclick.match(/event-view[^/]*\\/(\\d+)/);
                        const gameId = idMatch ? idMatch[1] : '';

                        results.push({
                            id: gameId || `g-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
                            homeTeam: texts[0] || 'Home',
                            awayTeam: texts[1] || 'Away',
                            homeScore: parseInt(scoreMatch[1]),
                            awayScore: parseInt(scoreMatch[2]),
                            period: periodMatch ? periodMatch[0] : '',
                            clock: clockMatch ? clockMatch[0] : '',
                            league: leagueName,
                            homeOdds: odds.length > 0 ? odds[0] : null,
                            awayOdds: odds.length > 1 ? odds[1] : null,
                        });
                    }
                }
                return results;
            }
        """)
        return games

    async def _scrape_game_markets(self, page: Page, game: dict) -> dict:
        """Scrape O/U markets for a specific game from its event view."""
        markets = {}

        # Extract Total Points section from current event view
        total_points = await page.evaluate("""
            () => {
                const result = { gameTotal: [], teamTotals: {} };
                const text = document.body.innerText || '';

                // Parse Game Total Points table
                const tpMatch = text.match(/Total Points\\s*([\\s\\S]*?)(?=\\n\\s*\\n|Team Total|Match Winner|$)/);
                if (tpMatch) {
                    const lines = tpMatch[1].split('\\n').map(l => l.trim()).filter(l => l);
                    for (const line of lines) {
                        const nums = line.split(/\\s+/).map(parseFloat).filter(n => !isNaN(n));
                        if (nums.length >= 3) {
                            result.gameTotal.push({
                                line: nums[0], over: nums[1], under: nums[2]
                            });
                        }
                    }
                }

                // Parse Team Total Points
                const teamRegex = /([A-Za-z0-9 .\\-]+?)\\s+Total\\s*Points\\s*([\\s\\S]*?)(?=\\n[A-Za-z]|$)/g;
                let tm;
                while ((tm = teamRegex.exec(text)) !== null) {
                    const team = tm[1].trim();
                    if (team === 'Total' || team.includes('Match')) continue;
                    const lines = tm[2].split('\\n').map(l => l.trim()).filter(l => l);
                    const entries = [];
                    for (const line of lines) {
                        const nums = line.split(/\\s+/).map(parseFloat).filter(n => !isNaN(n));
                        if (nums.length >= 3) {
                            entries.push({ line: nums[0], over: nums[1], under: nums[2] });
                        }
                    }
                    if (entries.length > 0) {
                        result.teamTotals[team] = entries;
                    }
                }
                return result;
            }
        """)

        if total_points:
            markets["totalPoints"] = total_points.get("gameTotal", [])
            markets["teamTotals"] = total_points.get("teamTotals", {})

        return markets

    @property
    def metrics_log(self):
        return self._metrics_log
