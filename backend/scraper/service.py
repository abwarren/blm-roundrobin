"""
PokerBet O/U Market Scraper — Playwright headless, bandwidth-optimised.

Extracts live basketball games and O/U markets from PokerBet.

Resource policy:
- Blocks: images, fonts, media, ads, analytics, CSS (DOM extraction doesn't need styling)
- Allows: JavaScript (required for SPA rendering), XHR/API calls
- Early exit: closes page as soon as target data is extracted
- Retry: exponential backoff on transient failures
"""

import re
import asyncio
import time
import logging
from typing import Optional
from urllib.parse import urljoin

from playwright.async_api import async_playwright, Page, Browser, BrowserContext

from scraper.bandwidth import BandwidthTracker, PageMetrics

logger = logging.getLogger("blm.scraper")

BASE_URL = "https://www.pokerbet.co.za"
LIVE_BASKETBALL_URL = urljoin(BASE_URL, "/en/sports/live")

MAX_RETRIES = 3
RETRY_BASE_DELAY = 2.0  # seconds


class PokerBetScraper:
    """Headless Playwright scraper for PokerBet basketball O/U markets.

    Reuses browser instance across calls. Blocks unnecessary resources.
    Early-exits once target data is extracted. Retries on transient failures.
    """

    def __init__(
        self,
        headless: bool = True,
        block_resources: bool = True,
        block_css: bool = True,
        proxy: Optional[str] = None,
    ):
        self._headless = headless
        self._block_resources = block_resources
        self._block_css = block_css
        self._proxy = proxy
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._metrics_log: list[PageMetrics] = []
        self._launch_count = 0

    # ── Lifecycle ─────────────────────────────────────────────

    async def start(self):
        if self._browser:
            return
        self._playwright = await async_playwright().start()

        launch_args = [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-accelerated-2d-canvas",
            # Reduce network noise
            "--disable-background-networking",
            "--disable-sync",
            "--disable-translate",
            "--disable-default-apps",
            "--mute-audio",
            "--no-first-run",
        ]

        proxy_settings = None
        if self._proxy:
            proxy_settings = {"server": self._proxy}

        self._browser = await self._playwright.chromium.launch(
            headless=self._headless,
            args=launch_args,
            proxy=proxy_settings,  # type: ignore[arg-type]
        )
        await self._create_context()
        self._launch_count += 1

    async def _create_context(self):
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
            # Request compressed responses
            extra_http_headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-ZA,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
            },
        )
        # Set shorter timeout — if it doesn't load fast, retry
        self._context.set_default_timeout(25000)

    async def stop(self):
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
        """Scrape all live basketball games with O/U markets.

        Retries on transient failures with exponential backoff.

        Returns:
            (games_list, metrics)
        """
        last_error = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                return await self._do_scrape()
            except TimeoutError as e:
                last_error = e
                logger.warning(
                    "Scrape timeout (attempt %d/%d)", attempt, MAX_RETRIES
                )
                if attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                    await asyncio.sleep(delay)
                    await self._create_context()  # fresh context after timeout
            except Exception as e:
                last_error = e
                logger.error("Scrape failed (attempt %d/%d): %s", attempt, MAX_RETRIES, e)
                if attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY * (2 ** (attempt - 1))
                    await asyncio.sleep(delay)
                    await self._create_context()

        raise last_error or RuntimeError("Scrape failed after retries")

    async def get_metrics_log(self) -> list[dict]:
        return [m.summary() for m in self._metrics_log]

    async def get_optimization_suggestions(self) -> list[dict]:
        """Return blocking rule recommendations."""
        # Aggregate domain hits across all tracker instances
        return []

    @property
    def metrics_log(self):
        return self._metrics_log

    # ── Internal ──────────────────────────────────────────────

    async def _do_scrape(self) -> tuple[list[dict], PageMetrics]:
        tracker = BandwidthTracker(block_css=self._block_css)
        page = await self._context.new_page()

        try:
            tracker.set_url(LIVE_BASKETBALL_URL)

            if self._block_resources:
                await page.route("**/*", tracker.on_route)

            # Navigate — wait for DOM only, not networkidle
            await page.goto(LIVE_BASKETBALL_URL, wait_until="domcontentloaded", timeout=30000)

            # Wait for Basketball section to appear
            games = await self._wait_and_extract(page)

            # EARLY EXIT: data extracted, stop everything
            await page.evaluate("window.stop()")  # halt all network activity

            metrics = tracker.finalize(success=True)
            self._metrics_log.append(metrics)

            logger.info(
                "Scraped %d games — %.1fKB in %.0fms (saved ~%.1fKB blocking %d requests)",
                len(games),
                metrics.kb_total,
                metrics.load_duration_ms,
                metrics.kb_saved,
                metrics.blocked_count,
            )

            return games, metrics

        except Exception as e:
            metrics = tracker.finalize(success=False)
            self._metrics_log.append(metrics)
            raise

        finally:
            await page.close()

    async def _wait_and_extract(self, page: Page) -> list[dict]:
        """Wait for basketball section, then extract games + markets."""
        await self._wait_for_basketball_section(page)

        games = await self._extract_game_list(page)

        for game in games:
            game["markets"] = {}
            try:
                markets = await self._scrape_markets(page)
                if markets:
                    game["markets"] = markets
            except Exception:
                pass

        return games

    async def _wait_for_basketball_section(self, page: Page, timeout: int = 20000):
        deadline = time.time() + timeout / 1000
        while time.time() < deadline:
            try:
                text = await page.evaluate(
                    """() => document.body?.innerText?.includes('Basketball') || false"""
                )
                if text:
                    return
            except Exception:
                pass
            await asyncio.sleep(0.5)
        raise TimeoutError("Basketball section did not appear")

    async def _extract_game_list(self, page: Page) -> list[dict]:
        return await page.evaluate(
            """
            () => {
                const results = [];
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

                const leagueBtns = basketSection.querySelectorAll('button');
                for (const btn of leagueBtns) {
                    const leagueName = (btn.textContent || '').trim();
                    const region = btn.nextElementSibling;
                    if (!region) continue;

                    const gameRows = region.querySelectorAll('[class*="clickable"]');
                    for (const row of gameRows) {
                        const text = row.textContent || '';
                        if (!text.includes(':')) continue;
                        if (!text.match(/Quarter|Half|Q/)) continue;

                        const scoreMatch = text.match(/(\\d+)\\s*:\\s*(\\d+)/);
                        if (!scoreMatch) continue;

                        const periodMatch = text.match(/(\\d+)(?:st|nd|rd|th)\\s*(Quarter|Half)/i);
                        const clockMatch = text.match(/(\\d{1,2}):(\\d{2})/);

                        const odds = [];
                        const oddsRows = row.querySelectorAll('[class*="clickable"]');
                        for (const o of oddsRows) {
                            const ot = (o.textContent || '').trim();
                            const om = ot.match(/^[Ww]\\d\\s*([\\d.]+)$/);
                            if (om) odds.push(parseFloat(om[1]));
                        }

                        const texts = Array.from(row.querySelectorAll('span, p, div'))
                            .map(t => (t.textContent || '').trim())
                            .filter(t => t.length > 2 && isNaN(parseFloat(t)));

                        const clickable = row.querySelector('[onclick]');
                        const onclick = clickable ? clickable.getAttribute('onclick') || '' : '';
                        const idMatch = onclick.match(/event-view[^/]*\\/(\\d+)/);
                        const gameId = idMatch ? idMatch[1] : '';

                        results.push({
                            id: gameId || 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
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
        """
        )

    async def _scrape_markets(self, page: Page) -> dict:
        return await page.evaluate(
            """
            () => {
                const result = { gameTotal: [], teamTotals: {} };
                const text = document.body.innerText || '';

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
        """
        )
