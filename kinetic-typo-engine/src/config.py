"""
Kinetic Typography Engine - Configuration Module

Centralizes all constants, paths, API clients, and tunable parameters
for the kinetic typography video generation pipeline.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Environment loading
# ---------------------------------------------------------------------------
# Look for .env in CWD first, then one level up (project root).
_cwd_env = Path.cwd() / ".env"
_parent_env = Path.cwd().parent / ".env"
if _cwd_env.exists():
    load_dotenv(_cwd_env)
elif _parent_env.exists():
    load_dotenv(_parent_env)
else:
    load_dotenv()  # fall back to python-dotenv's default search

# ---------------------------------------------------------------------------
# Color Palette  (R, G, B) or (R, G, B, A)
# ---------------------------------------------------------------------------
COLORS: Dict[str, Tuple[int, ...]] = {
    "bg_dark":       (10, 10, 26),
    "bg_purple":     (45, 27, 78),
    "bg_teal":       (13, 59, 59),
    "text_white":    (255, 255, 255),
    "text_gray":     (136, 136, 136),
    "text_light":    (170, 170, 170),
    "accent_purple": (155, 89, 182),
    "accent_cyan":   (0, 188, 212),
    "accent_orange": (255, 152, 0),
    "card_bg":       (20, 20, 40, 200),
    "card_border":   (100, 100, 140, 100),
}

# Rotating accent colours for multi-card layouts
CARD_COLORS: List[Tuple[int, ...]] = [
    COLORS["accent_purple"],
    COLORS["accent_cyan"],
    COLORS["accent_orange"],
    (219, 112, 147),          # muted pink
    COLORS["accent_cyan"],
]

# ---------------------------------------------------------------------------
# Video Output
# ---------------------------------------------------------------------------
VIDEO_WIDTH: int = 1920
VIDEO_HEIGHT: int = 1080
FPS: int = 30
JPEG_QUALITY: int = 95

# ---------------------------------------------------------------------------
# TTS (Google Cloud Text-to-Speech)
# ---------------------------------------------------------------------------
TTS_VOICE_NAME: str = "en-US-Journey-D"
TTS_SPEAKING_RATE: float = 1.0
TTS_MAX_RATE: float = 1.5
TTS_SAMPLE_RATE: int = 48000

# ---------------------------------------------------------------------------
# Audio Ducking
# ---------------------------------------------------------------------------
DUCK_DB: float = -7.0        # dB reduction when voice is active
DUCK_FADE_MS: int = 50       # crossfade in/out duration for ducking
DUCK_RMS_WINDOW_MS: int = 20 # RMS analysis window size

# ---------------------------------------------------------------------------
# Scene Type Durations (seconds) - default hold times per scene type
# ---------------------------------------------------------------------------
SCENE_DURATIONS: Dict[str, float] = {
    "title":       4.0,
    "intro":       5.0,
    "bullet":      3.5,
    "stat":        4.0,
    "quote":       5.0,
    "comparison":  5.0,
    "list":        4.5,
    "callout":     3.5,
    "transition":  2.0,
    "outro":       4.0,
    "chapter":     3.0,
    "default":     4.0,
}

# ---------------------------------------------------------------------------
# Acronyms - words that TTS should spell out letter-by-letter
# ---------------------------------------------------------------------------
ACRONYMS: Set[str] = {
    "AI", "API", "AWS", "CEO", "CFO", "CTO", "CPU", "CSS",
    "DB", "DNS", "FAQ", "GPU", "HTML", "HTTP", "HTTPS",
    "IoT", "IP", "JSON", "KPI", "LLM", "ML", "MVP", "NLP",
    "OKR", "PDF", "REST", "ROI", "SaaS", "SDK", "SEO",
    "SQL", "SSH", "SSL", "TLS", "TTS", "UI", "URL", "USB",
    "UX", "VPS", "XML", "YAML",
}

# ---------------------------------------------------------------------------
# Particle System
# ---------------------------------------------------------------------------
PARTICLE_COUNT: int = 50
PARTICLE_COLORS: List[str] = ["text_white", "accent_purple", "accent_cyan"]
PARTICLE_SIZE_RANGE: Tuple[float, float] = (1.5, 4.0)
PARTICLE_ALPHA_RANGE: Tuple[float, float] = (0.2, 0.6)
PARTICLE_SPEED_RANGE: Tuple[float, float] = (0.3, 1.2)

# ---------------------------------------------------------------------------
# Grid Overlay
# ---------------------------------------------------------------------------
GRID_SPACING: int = 60
GRID_OPACITY: float = 0.15

# ---------------------------------------------------------------------------
# Typography Style Presets
# ---------------------------------------------------------------------------
STYLE_PRESETS: Dict[str, Dict] = {
    "LABEL": {
        "font_size": 24,
        "color": "text_gray",
        "bold": False,
    },
    "HEADLINE": {
        "font_size": 140,
        "color": "text_white",
        "bold": True,
    },
    "ACCENT": {
        "font_size": 48,
        "color": "accent_purple",
        "bold": True,
    },
    "BODY": {
        "font_size": 36,
        "color": "text_light",
        "bold": False,
    },
    "STAT_VALUE": {
        "font_size": 200,
        "color": "text_white",
        "bold": True,
    },
    "STAT_LABEL": {
        "font_size": 28,
        "color": "text_gray",
        "bold": False,
    },
    "CARD_INDEX": {
        "font_size": 72,
        "color": "text_white",
        "bold": True,
    },
    "CARD_TITLE": {
        "font_size": 36,
        "color": "text_white",
        "bold": True,
    },
    "CARD_BODY": {
        "font_size": 28,
        "color": "text_light",
        "bold": False,
    },
    "QUOTE_TEXT": {
        "font_size": 42,
        "color": "text_white",
        "bold": False,
        "italic": True,
    },
    "QUOTE_AUTHOR": {
        "font_size": 24,
        "color": "text_gray",
        "bold": False,
    },
    "DIVIDER": {},
}

# ---------------------------------------------------------------------------
# Font Paths (override via env vars for different hosts)
# ---------------------------------------------------------------------------
_ENGINE_ROOT: Path = Path(__file__).resolve().parent.parent
_DEFAULT_FONTS_DIR: str = str(_ENGINE_ROOT / "fonts")

FONTS_DIR: str = os.getenv("KINETIC_FONTS_DIR", _DEFAULT_FONTS_DIR)

# Individual font files - set via env or fallback to sensible names inside FONTS_DIR
FONT_TITLE: str = os.getenv(
    "KINETIC_FONT_TITLE",
    os.path.join(FONTS_DIR, "Montserrat-ExtraBold.ttf"),
)
FONT_BODY: str = os.getenv(
    "KINETIC_FONT_BODY",
    os.path.join(FONTS_DIR, "Inter-Regular.ttf"),
)
FONT_BOLD: str = os.getenv(
    "KINETIC_FONT_BOLD",
    os.path.join(FONTS_DIR, "Inter-Bold.ttf"),
)
FONT_MONO: str = os.getenv(
    "KINETIC_FONT_MONO",
    os.path.join(FONTS_DIR, "JetBrainsMono-Regular.ttf"),
)

# ---------------------------------------------------------------------------
# Output / Temp Directories
# ---------------------------------------------------------------------------
OUTPUT_DIR: str = os.getenv(
    "KINETIC_OUTPUT_DIR",
    str(_ENGINE_ROOT / "output"),
)
TEMP_DIR: str = os.getenv(
    "KINETIC_TEMP_DIR",
    str(_ENGINE_ROOT / "tmp"),
)

# Ensure directories exist at import time
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
Path(TEMP_DIR).mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# API Keys
# ---------------------------------------------------------------------------
ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = os.getenv(
    "GOOGLE_APPLICATION_CREDENTIALS"
)

# ---------------------------------------------------------------------------
# Supabase Client
# ---------------------------------------------------------------------------
SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

_supabase_client = None


def get_supabase_client(url: Optional[str] = None, key: Optional[str] = None):
    """
    Return a cached Supabase client.  Accepts optional overrides (e.g. per-job
    credentials passed via the /generate request body).  Falls back to env vars.

    Raises ValueError if neither parameter nor env var supplies a value.
    """
    global _supabase_client

    resolved_url = url or SUPABASE_URL
    resolved_key = key or SUPABASE_SERVICE_ROLE_KEY

    if not resolved_url or not resolved_key:
        raise ValueError(
            "Supabase credentials missing.  Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in .env or pass them in the request."
        )

    # Re-create the client when overrides differ from the cached version
    if _supabase_client is not None:
        cached_url = getattr(_supabase_client, "_supabase_url", None)
        if cached_url == resolved_url:
            return _supabase_client

    from supabase import create_client, Client

    _supabase_client = create_client(resolved_url, resolved_key)
    # Stash the URL so we can detect re-init needs
    _supabase_client._supabase_url = resolved_url  # type: ignore[attr-defined]
    return _supabase_client
