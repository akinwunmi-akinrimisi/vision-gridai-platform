"""
Kinetic Typography Engine - Animation Engine

Easing functions and interpolation utilities for frame-by-frame animation.
All easing functions accept *t* in [0, 1] and return a value in [0, 1]
(some overshoot briefly, e.g. ease_out_back / ease_out_elastic).
"""

from __future__ import annotations

import math
from typing import Callable, Optional


# ---------------------------------------------------------------------------
# Easing functions  (t: float -> float, domain [0,1])
# ---------------------------------------------------------------------------

def linear(t: float) -> float:
    """No easing - constant velocity."""
    return t


def ease_out_cubic(t: float) -> float:
    """Decelerating cubic - fast start, smooth stop."""
    return 1.0 - (1.0 - t) ** 3


def ease_in_out_quad(t: float) -> float:
    """Accelerate then decelerate - quadratic."""
    if t < 0.5:
        return 2.0 * t * t
    return 1.0 - (-2.0 * t + 2.0) ** 2 / 2.0


def ease_out_back(t: float) -> float:
    """Overshoot then settle - springy feel."""
    c1 = 1.70158
    c3 = c1 + 1.0
    return 1.0 + c3 * (t - 1.0) ** 3 + c1 * (t - 1.0) ** 2


def ease_out_elastic(t: float) -> float:
    """Elastic snap - oscillates then settles."""
    if t == 0.0:
        return 0.0
    if t == 1.0:
        return 1.0
    c4 = (2.0 * math.pi) / 3.0
    return 2.0 ** (-10.0 * t) * math.sin((t * 10.0 - 0.75) * c4) + 1.0


# ---------------------------------------------------------------------------
# Easing lookup  (string name -> callable)
# ---------------------------------------------------------------------------

EASING_FUNCTIONS: dict[str, Callable[[float], float]] = {
    "linear": linear,
    "ease_out_cubic": ease_out_cubic,
    "ease_in_out_quad": ease_in_out_quad,
    "ease_out_back": ease_out_back,
    "ease_out_elastic": ease_out_elastic,
}


# ---------------------------------------------------------------------------
# Interpolation helpers
# ---------------------------------------------------------------------------

def interpolate(
    start: float,
    end: float,
    progress: float,
    easing_fn: Optional[Callable[[float], float]] = None,
) -> float:
    """
    Linearly interpolate between *start* and *end* using *progress* (0-1).

    If *easing_fn* is provided the raw progress is passed through the easing
    curve first.

    Parameters
    ----------
    start : float
        Value at progress == 0.
    end : float
        Value at progress == 1.
    progress : float
        Raw animation progress, typically 0.0 - 1.0.
    easing_fn : callable, optional
        An easing function (t -> t) applied to *progress* before interpolation.

    Returns
    -------
    float
        The interpolated value.
    """
    if easing_fn is not None:
        progress = easing_fn(progress)
    return start + (end - start) * progress


def get_animation_progress(
    elapsed_ms: float,
    delay_ms: float = 0.0,
    duration_ms: float = 600.0,
    easing: str = "ease_out_cubic",
) -> float:
    """
    Compute eased animation progress for a given point in time.

    Parameters
    ----------
    elapsed_ms : float
        Milliseconds elapsed since the animation context started (e.g. scene
        start or global timeline position).
    delay_ms : float
        Milliseconds to wait before the animation begins.  The function
        returns 0.0 while ``elapsed_ms < delay_ms``.
    duration_ms : float
        Length of the animation in milliseconds.  Must be > 0.
    easing : str
        Name of the easing function (key in ``EASING_FUNCTIONS``).  Falls back
        to ``ease_out_cubic`` if the name is not recognised.

    Returns
    -------
    float
        Eased progress clamped to [0.0, 1.0].
    """
    if duration_ms <= 0.0:
        return 1.0

    # Not started yet
    if elapsed_ms < delay_ms:
        return 0.0

    # Raw linear progress, clamped
    raw = (elapsed_ms - delay_ms) / duration_ms
    raw = max(0.0, min(1.0, raw))

    # Apply easing
    easing_fn = EASING_FUNCTIONS.get(easing, ease_out_cubic)
    eased = easing_fn(raw)

    # Clamp final result (some easings overshoot before converging)
    return max(0.0, min(1.0, eased))
