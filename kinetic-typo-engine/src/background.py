"""
Kinetic Typography Engine - Background Renderer

Generates the deep-navy cinematic background with radial gradient glow zones,
a faint geometric grid overlay, and an animated particle system.

All functions return PIL Images so they can be composited by the frame renderer.
"""

from __future__ import annotations

import random
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .config import (
    COLORS,
    PARTICLE_ALPHA_RANGE,
    PARTICLE_COLORS,
    PARTICLE_COUNT,
    PARTICLE_SIZE_RANGE,
    PARTICLE_SPEED_RANGE,
    VIDEO_HEIGHT,
    VIDEO_WIDTH,
)


# ---------------------------------------------------------------------------
# Background gradient
# ---------------------------------------------------------------------------

def render_background(
    width: int = VIDEO_WIDTH,
    height: int = VIDEO_HEIGHT,
) -> Image.Image:
    """
    Render the base background - deep navy with two radial gradient glow zones.

    * Purple glow at the top-left quadrant.
    * Teal glow at the bottom-right quadrant.

    Uses numpy for fast per-pixel computation.

    Returns
    -------
    PIL.Image.Image
        RGB image at the requested resolution.
    """
    bg_r, bg_g, bg_b = COLORS["bg_dark"]
    purple = COLORS.get("bg_purple", (45, 27, 78))
    teal = COLORS.get("bg_teal", (13, 59, 59))

    # Build coordinate grids
    ys = np.arange(height, dtype=np.float32)
    xs = np.arange(width, dtype=np.float32)
    yy, xx = np.meshgrid(ys, xs, indexing="ij")

    # Start with flat base colour
    r = np.full((height, width), bg_r, dtype=np.float32)
    g = np.full((height, width), bg_g, dtype=np.float32)
    b = np.full((height, width), bg_b, dtype=np.float32)

    # --- Purple glow: centred at (width*0.2, height*0.2) ---
    cx_p, cy_p = width * 0.2, height * 0.2
    radius_p = max(width, height) * 0.6
    dist_p = np.sqrt((xx - cx_p) ** 2 + (yy - cy_p) ** 2)
    alpha_p = np.clip(1.0 - dist_p / radius_p, 0.0, 1.0) ** 2  # quadratic falloff
    alpha_p *= 0.45  # max intensity

    r += alpha_p * (purple[0] - bg_r)
    g += alpha_p * (purple[1] - bg_g)
    b += alpha_p * (purple[2] - bg_b)

    # --- Teal glow: centred at (width*0.8, height*0.8) ---
    cx_t, cy_t = width * 0.8, height * 0.8
    radius_t = max(width, height) * 0.55
    dist_t = np.sqrt((xx - cx_t) ** 2 + (yy - cy_t) ** 2)
    alpha_t = np.clip(1.0 - dist_t / radius_t, 0.0, 1.0) ** 2
    alpha_t *= 0.35

    r += alpha_t * (teal[0] - bg_r)
    g += alpha_t * (teal[1] - bg_g)
    b += alpha_t * (teal[2] - bg_b)

    # Clamp and assemble
    r = np.clip(r, 0, 255).astype(np.uint8)
    g = np.clip(g, 0, 255).astype(np.uint8)
    b = np.clip(b, 0, 255).astype(np.uint8)

    rgb = np.stack([r, g, b], axis=-1)
    return Image.fromarray(rgb, "RGB")


# ---------------------------------------------------------------------------
# Grid overlay
# ---------------------------------------------------------------------------

def render_grid_overlay(
    width: int = VIDEO_WIDTH,
    height: int = VIDEO_HEIGHT,
    opacity: float = 0.15,
    spacing: int = 60,
) -> Image.Image:
    """
    Render a faint geometric grid on a transparent canvas.

    Parameters
    ----------
    width, height : int
        Canvas dimensions.
    opacity : float
        Base line opacity (0-1).  Lines are drawn in white.
    spacing : int
        Distance in pixels between grid lines.

    Returns
    -------
    PIL.Image.Image
        RGBA image with transparent background and white grid lines.
    """
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    alpha = int(255 * max(0.0, min(1.0, opacity)))
    line_color = (255, 255, 255, alpha)

    # Vertical lines
    for x in range(0, width, spacing):
        draw.line([(x, 0), (x, height)], fill=line_color, width=1)

    # Horizontal lines
    for y in range(0, height, spacing):
        draw.line([(0, y), (width, y)], fill=line_color, width=1)

    return overlay


# ---------------------------------------------------------------------------
# Particle system
# ---------------------------------------------------------------------------

def _random_color() -> Tuple[int, int, int]:
    """Pick a random colour from the configured particle palette."""
    key = random.choice(PARTICLE_COLORS)
    color = COLORS.get(key, (255, 255, 255))
    return (color[0], color[1], color[2])


def generate_particles(
    count: int = PARTICLE_COUNT,
    width: int = VIDEO_WIDTH,
    height: int = VIDEO_HEIGHT,
) -> List[Dict[str, Any]]:
    """
    Create an initial set of particles with random positions, velocities,
    colours, sizes, and alpha values.

    Parameters
    ----------
    count : int
        Number of particles to generate.
    width, height : int
        Canvas bounds for initial placement.

    Returns
    -------
    list[dict]
        Each dict has keys: x, y, vx, vy, color, size, alpha.
    """
    particles: List[Dict[str, Any]] = []
    for _ in range(count):
        speed = random.uniform(*PARTICLE_SPEED_RANGE)
        angle = random.uniform(0, 2 * 3.14159265)
        particles.append(
            {
                "x": random.uniform(0, width),
                "y": random.uniform(0, height),
                "vx": speed * np.cos(angle),
                "vy": speed * np.sin(angle),
                "color": _random_color(),
                "size": random.uniform(*PARTICLE_SIZE_RANGE),
                "alpha": random.uniform(*PARTICLE_ALPHA_RANGE),
            }
        )
    return particles


def update_particles(
    particles: List[Dict[str, Any]],
    width: int = VIDEO_WIDTH,
    height: int = VIDEO_HEIGHT,
    dt: float = 1.0,
) -> None:
    """
    Advance particle positions by *dt* time steps, bouncing off canvas edges.

    Mutates the particle dicts in place.

    Parameters
    ----------
    particles : list[dict]
        Particle list from :func:`generate_particles`.
    width, height : int
        Canvas bounds for bounce detection.
    dt : float
        Time step multiplier (1.0 = one frame at nominal speed).
    """
    for p in particles:
        p["x"] += p["vx"] * dt
        p["y"] += p["vy"] * dt

        # Bounce horizontally
        if p["x"] < 0:
            p["x"] = -p["x"]
            p["vx"] = abs(p["vx"])
        elif p["x"] > width:
            p["x"] = 2 * width - p["x"]
            p["vx"] = -abs(p["vx"])

        # Bounce vertically
        if p["y"] < 0:
            p["y"] = -p["y"]
            p["vy"] = abs(p["vy"])
        elif p["y"] > height:
            p["y"] = 2 * height - p["y"]
            p["vy"] = -abs(p["vy"])


def render_particles(
    base_image: Image.Image,
    particles: List[Dict[str, Any]],
) -> Image.Image:
    """
    Composite small glowing circles for each particle onto *base_image*.

    The base image is **not** mutated; a copy is returned.

    Parameters
    ----------
    base_image : PIL.Image.Image
        Background image (RGB or RGBA) to composite particles onto.
    particles : list[dict]
        Particle list with current positions.

    Returns
    -------
    PIL.Image.Image
        New image with particles composited.  Same mode as input.
    """
    result = base_image.copy()
    if result.mode != "RGBA":
        result = result.convert("RGBA")

    for p in particles:
        cr, cg, cb = p["color"]
        alpha = max(0.0, min(1.0, p["alpha"]))
        size = max(1.0, p["size"])

        # Render a soft glow circle onto a small stamp
        glow_radius = int(size * 4)
        stamp_size = glow_radius * 2 + 1
        if stamp_size < 3:
            continue

        stamp = Image.new("RGBA", (stamp_size, stamp_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(stamp)

        # Core dot
        core_alpha = int(255 * alpha)
        cx = cy = glow_radius
        core_r = max(1, int(size))
        draw.ellipse(
            [cx - core_r, cy - core_r, cx + core_r, cy + core_r],
            fill=(cr, cg, cb, core_alpha),
        )

        # Soft outer glow via blur
        stamp = stamp.filter(ImageFilter.GaussianBlur(radius=max(1, int(size * 1.5))))

        # Paste onto result
        px = int(p["x"]) - glow_radius
        py = int(p["y"]) - glow_radius
        result.alpha_composite(stamp, (px, py))

    if base_image.mode == "RGB":
        return result.convert("RGB")
    return result
