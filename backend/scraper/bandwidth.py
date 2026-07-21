"""
Bandwidth Tracker — measures per-page download metrics.

Tracks every request/response through Playwright's route interception
and aggregates bandwidth usage by resource type.
"""

import time
from dataclasses import dataclass, field


@dataclass
class PageMetrics:
    url: str = ""
    total_bytes: int = 0
    blocked_bytes: int = 0
    total_requests: int = 0
    blocked_count: int = 0
    allowed_count: int = 0
    resource_breakdown: dict = field(default_factory=dict)
    start_time: float = 0.0
    end_time: float = 0.0
    retry_count: int = 0
    success: bool = False

    @property
    def load_duration_ms(self) -> float:
        return (self.end_time - self.start_time) * 1000

    @property
    def kb_total(self) -> float:
        return self.total_bytes / 1024

    @property
    def kb_saved(self) -> float:
        return self.blocked_bytes / 1024

    def summary(self) -> dict:
        return {
            "url": self.url,
            "total_kb": round(self.kb_total, 1),
            "saved_kb": round(self.kb_saved, 1),
            "requests": self.total_requests,
            "blocked": self.blocked_count,
            "allowed": self.allowed_count,
            "duration_ms": round(self.load_duration_ms, 0),
            "retries": self.retry_count,
            "success": self.success,
            "resources": dict(sorted(
                self.resource_breakdown.items(),
                key=lambda x: x[1].get("bytes", 0),
                reverse=True,
            )[:10]),
        }


class BandwidthTracker:
    """Intercepts Playwright requests to measure bandwidth."""

    BLOCKED_TYPES = {
        "image", "font", "media", "other",
    }

    def __init__(self):
        self._metrics = PageMetrics()
        self._reset()

    def _reset(self):
        self._metrics = PageMetrics()
        self._metrics.start_time = time.time()

    def set_url(self, url: str):
        self._metrics.url = url

    async def on_route(self, route):
        """Playwright route handler — track and optionally block."""
        req = route.request
        rtype = req.resource_type
        url = req.url

        self._metrics.total_requests += 1

        # Classify the resource
        rsrc_type = self._classify(url, rtype)

        # Check if blocked
        should_block = self._should_block(rsrc_type, url)

        if should_block:
            self._metrics.blocked_count += 1
            # Abort with minimal response
            await route.abort("blockedbyclient")
            return

        self._metrics.allowed_count += 1

        # Fulfill the request and track size
        try:
            response = await route.fetch()
            body = await response.body()
            size = len(body)

            self._metrics.total_bytes += size
            if rsrc_type not in self._metrics.resource_breakdown:
                self._metrics.resource_breakdown[rsrc_type] = {"count": 0, "bytes": 0}
            self._metrics.resource_breakdown[rsrc_type]["count"] += 1
            self._metrics.resource_breakdown[rsrc_type]["bytes"] += size

            await route.fulfill(
                response=response,
                body=body,
            )
        except Exception:
            await route.continue_()

    def finalize(self, success: bool = True) -> PageMetrics:
        self._metrics.end_time = time.time()
        self._metrics.success = success
        m = self._metrics
        self._reset()
        return m

    @staticmethod
    def _classify(url: str, resource_type: str) -> str:
        ext = url.split("?")[0].rsplit(".", 1)[-1].lower() if "." in url else ""

        ext_map = {
            "png": "image", "jpg": "image", "jpeg": "image", "gif": "image",
            "webp": "image", "avif": "image", "svg": "image", "ico": "image",
            "woff": "font", "woff2": "font", "ttf": "font", "otf": "font", "eot": "font",
            "mp4": "media", "webm": "media", "mov": "media", "mp3": "media", "wav": "media",
            "js": "script", "css": "stylesheet",
        }

        return ext_map.get(ext, resource_type)

    @staticmethod
    def _should_block(rsrc_type: str, url: str) -> bool:
        """Determine if a resource should be blocked."""

        # Always block images, fonts, media
        if rsrc_type in BandwidthTracker.BLOCKED_TYPES:
            return True

        # Known ad/analytics domains
        blocked_domains = [
            "doubleclick.net", "googlesyndication.com", "google-analytics.com",
            "googletagmanager.com", "gtm.", "facebook.com/tr", "connect.facebook.net",
            "hotjar.com", "mixpanel.com", "amplitude.com", "segment.io",
            "segment.com", "crazyegg.com", "mouseflow.com",
            "taboola.com", "outbrain.com", "pubmatic.com", "criteo.com",
            "adsrvr.org", "adnxs.com", "rubiconproject.com",
            "scorecardresearch.com", "quantserve.com",
        ]
        for domain in blocked_domains:
            if domain in url:
                return True

        return False
