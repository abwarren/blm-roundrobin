"""
Bandwidth Tracker — measures per-page download metrics.

Tracks every request/response through Playwright's route interception
and aggregates bandwidth usage by resource type.

Supports:
- Image/font/media blocking
- Ad/analytics domain blocking
- Conditional CSS blocking
- Estimated blocked bytes
- Top-largest-request tracking for continuous optimization
"""

import time
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("blm.bandwidth")


@dataclass
class PageMetrics:
    url: str = ""
    proxy: str = ""
    total_bytes: int = 0
    blocked_estimate: int = 0
    total_requests: int = 0
    blocked_count: int = 0
    allowed_count: int = 0
    resource_breakdown: dict = field(default_factory=dict)
    largest_requests: list = field(default_factory=list)
    start_time: float = 0.0
    end_time: float = 0.0
    retry_count: int = 0
    success: bool = False
    extraction_method: str = "dom"
    page_load_ms: float = 0.0

    @property
    def load_duration_ms(self) -> float:
        return (self.end_time - self.start_time) * 1000

    @property
    def kb_total(self) -> float:
        return self.total_bytes / 1024

    @property
    def kb_saved(self) -> float:
        return self.blocked_estimate / 1024

    @property
    def pages_per_gb(self) -> float:
        if self.total_bytes == 0:
            return 0
        return 1073741824 / self.total_bytes  # 1 GB / avg bytes per page

    def summary(self) -> dict:
        return {
            "url": self.url,
            "proxy": self.proxy,
            "total_kb": round(self.kb_total, 1),
            "saved_kb": round(self.kb_saved, 1),
            "requests": self.total_requests,
            "blocked": self.blocked_count,
            "allowed": self.allowed_count,
            "duration_ms": round(self.load_duration_ms, 0),
            "page_load_ms": round(self.page_load_ms, 0),
            "retries": self.retry_count,
            "success": self.success,
            "extraction": self.extraction_method,
            "pages_per_gb": round(self.pages_per_gb, 0),
            "resources": dict(sorted(
                self.resource_breakdown.items(),
                key=lambda x: x[1].get("bytes", 0),
                reverse=True,
            )[:10]),
            "largest_requests": sorted(
                self.largest_requests, key=lambda x: x["bytes"], reverse=True
            )[:5],
        }


# Estimated sizes for blocked resources (used when we abort before fetching)
BLOCKED_ESTIMATES = {
    "image": 150 * 1024,     # avg 150KB per image
    "font": 50 * 1024,       # avg 50KB per font
    "media": 500 * 1024,     # avg 500KB per media file
    "stylesheet": 30 * 1024, # avg 30KB per CSS
    "script": 80 * 1024,     # avg 80KB per script (3rd party)
    "other": 20 * 1024,      # avg 20KB for other
}


class BandwidthTracker:
    """Intercepts Playwright requests to measure and block bandwidth."""

    ALWAYS_BLOCK_TYPES = {"image", "font", "media", "other"}

    ALWAYS_BLOCK_DOMAINS = [
        "doubleclick.net", "googlesyndication.com", "google-analytics.com",
        "googletagmanager.com", "gtm.", "facebook.com/tr", "connect.facebook.net",
        "hotjar.com", "mixpanel.com", "amplitude.com", "segment.io",
        "segment.com", "crazyegg.com", "mouseflow.com",
        "taboola.com", "outbrain.com", "pubmatic.com", "criteo.com",
        "adsrvr.org", "adnxs.com", "rubiconproject.com",
        "scorecardresearch.com", "quantserve.com",
    ]

    def __init__(self, block_css: bool = True):
        self._block_css = block_css
        self._metrics = PageMetrics()
        self._reset()
        # Accumulated optimization suggestions
        self._domain_hits: dict[str, dict] = {}

    def _reset(self):
        self._metrics = PageMetrics()
        self._metrics.start_time = time.time()

    def set_url(self, url: str):
        self._metrics.url = url

    def set_proxy(self, proxy: str):
        self._metrics.proxy = proxy

    async def on_route(self, route):
        """Playwright route handler — track and optionally block."""
        req = route.request
        rtype = req.resource_type
        url = req.url

        self._metrics.total_requests += 1
        rsrc_type = self._classify(url, rtype)

        if self._should_block(rsrc_type, url):
            self._metrics.blocked_count += 1
            est = BLOCKED_ESTIMATES.get(rsrc_type, 10 * 1024)
            self._metrics.blocked_estimate += est
            await route.abort("blockedbyclient")
            return

        self._metrics.allowed_count += 1

        try:
            response = await route.fetch()
            body = await response.body()
            size = len(body)

            self._metrics.total_bytes += size
            self._metrics.resource_breakdown.setdefault(
                rsrc_type, {"count": 0, "bytes": 0}
            )
            self._metrics.resource_breakdown[rsrc_type]["count"] += 1
            self._metrics.resource_breakdown[rsrc_type]["bytes"] += size

            # Track largest for optimization recommendations
            if size > 100 * 1024:  # > 100KB
                self._metrics.largest_requests.append({
                    "url": url[:200],
                    "type": rsrc_type,
                    "bytes": size,
                })
                # Trim to keep memory bounded
                if len(self._metrics.largest_requests) > 50:
                    self._metrics.largest_requests.sort(
                        key=lambda x: x["bytes"], reverse=True
                    )
                    self._metrics.largest_requests = (
                        self._metrics.largest_requests[:25]
                    )

            self._track_domain(url, size)
            await route.fulfill(response=response, body=body)

        except Exception:
            await route.continue_()

    def finalize(self, success: bool = True) -> PageMetrics:
        self._metrics.end_time = time.time()
        self._metrics.success = success
        self._metrics.page_load_ms = (
            self._metrics.load_duration_ms
        )
        m = self._metrics
        self._reset()
        return m

    def get_optimization_suggestions(self) -> list[dict]:
        """Return recommendations for new blocking rules based on observed traffic."""
        if not self._domain_hits:
            return []
        sorted_domains = sorted(
            self._domain_hits.items(), key=lambda x: x[1]["bytes"], reverse=True
        )
        suggestions = []
        for domain, info in sorted_domains[:10]:
            if domain not in [d.split("/")[0] for d in self.ALWAYS_BLOCK_DOMAINS]:
                # Check if domain is known tracking/ad
                if any(
                    kw in domain
                    for kw in ["analytics", "track", "pixel", "ad", "cdn."]
                ):
                    suggestions.append({
                        "domain": domain,
                        "bytes": info["bytes"],
                        "requests": info["count"],
                        "suggested_action": "block",
                        "confidence": "medium",
                    })
        return suggestions

    def _track_domain(self, url: str, size: int):
        """Track per-domain bandwidth for optimization."""
        from urllib.parse import urlparse
        try:
            domain = urlparse(url).netloc
            if domain:
                self._domain_hits.setdefault(domain, {"bytes": 0, "count": 0})
                self._domain_hits[domain]["bytes"] += size
                self._domain_hits[domain]["count"] += 1
        except Exception:
            pass

    @staticmethod
    def _classify(url: str, resource_type: str) -> str:
        ext = url.split("?")[0].rsplit(".", 1)[-1].lower() if "." in url else ""
        ext_map = {
            "png": "image", "jpg": "image", "jpeg": "image", "gif": "image",
            "webp": "image", "avif": "image", "svg": "image", "ico": "image",
            "woff": "font", "woff2": "font", "ttf": "font", "otf": "font",
            "eot": "font",
            "mp4": "media", "webm": "media", "mov": "media",
            "mp3": "media", "wav": "media",
            "js": "script", "css": "stylesheet",
        }
        return ext_map.get(ext, resource_type)

    def _should_block(self, rsrc_type: str, url: str) -> bool:
        if rsrc_type in self.ALWAYS_BLOCK_TYPES:
            return True

        # Conditionally block CSS
        if rsrc_type == "stylesheet" and self._block_css:
            return True

        for domain in self.ALWAYS_BLOCK_DOMAINS:
            if domain in url:
                return True

        return False
