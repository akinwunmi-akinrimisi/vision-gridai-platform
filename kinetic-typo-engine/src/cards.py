"""
Kinetic Typography Engine - Card Renderer

Renders styled info cards with a rounded semi-transparent background, accent
index number, title, and word-wrapped body text.  Used for list scenes,
comparison layouts, and bullet-point breakdowns.
"""

from __future__ import annotations

import textwrap
from typing import Optional, Tuple, Union

from PIL import Image, ImageDraw, ImageFilter

from .config import CARD_COLORS, COLORS, FONT_BODY, FONT_BOLD, FONT_TITLE
from .typography import _load_pil_font, _resolve_color, composite_with_opacity


# ---------------------------------------------------------------------------
# Card renderer
# ---------------------------------------------------------------------------

def render_card(
    index: int,
    title: str,
    body: str,
    width: int = 500,
    height: int = 300,
    accent_color: Optional[Union[str, Tuple[int, ...]]] = None,
) -> Image.Image:
    """
    Render a single info card with index number, title, and body text.

    Card features:
    * Rounded rectangle background (#141428 at ~78 % opacity).
    * 1 px border glow in the accent colour at 40 % opacity.
    * Large coloured index number (top-left).
    * Bold white title below the index.
    * Light-gray word-wrapped body text.

    The accent colour cycles through ``CARD_COLORS`` when *accent_color*
    is not explicitly provided.

    Parameters
    ----------
    index : int
        Card index (displayed as a large decorative number).
    title : str
        Card title (rendered bold, white).
    body : str
        Body paragraph.  Automatically word-wrapped to fit the card width.
    width, height : int
        Card dimensions in pixels.
    accent_color : str or tuple, optional
        Override colour for the index number and border glow.  Accepts a
        COLORS key name or an (R, G, B) tuple.  Defaults to cycling
        through ``CARD_COLORS`` based on *index*.

    Returns
    -------
    PIL.Image.Image
        RGBA image of the rendered card.
    """
    # Resolve accent colour
    if accent_color is not None:
        accent_rgb = _resolve_color(accent_color)
    else:
        accent_rgb = CARD_COLORS[index % len(CARD_COLORS)]
        # Ensure 3-tuple
        accent_rgb = (accent_rgb[0], accent_rgb[1], accent_rgb[2])

    card = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)

    # -- Background rounded rectangle -----------------------------------
    corner_radius = 16
    bg_color = COLORS.get("card_bg", (20, 20, 40, 200))
    # Ensure 4-tuple RGBA
    if len(bg_color) == 3:
        bg_color = (*bg_color, 200)

    _draw_rounded_rect(draw, (0, 0, width, height), corner_radius, bg_color)

    # -- Border glow (1 px, accent at 40 % opacity) --------------------
    border_alpha = int(255 * 0.40)
    border_color = (*accent_rgb, border_alpha)
    _draw_rounded_rect_outline(
        draw, (0, 0, width - 1, height - 1), corner_radius, border_color, width=1
    )

    # -- Layout constants -----------------------------------------------
    pad_x = 28
    pad_y = 24

    # -- Index number (large, coloured, top-left) -----------------------
    idx_font_size = 72
    idx_font = _load_pil_font(FONT_TITLE, idx_font_size)
    idx_text = str(index)
    idx_color = (*accent_rgb, 255)
    draw.text((pad_x, pad_y), idx_text, font=idx_font, fill=idx_color)

    # Measure index to offset the title
    idx_bbox = idx_font.getbbox(idx_text)
    idx_bottom = pad_y + (idx_bbox[3] - idx_bbox[1])

    # -- Title (bold, white) --------------------------------------------
    title_font_size = 36
    title_font = _load_pil_font(FONT_TITLE, title_font_size)
    title_y = idx_bottom + 12
    title_color = (*_resolve_color("text_white"), 255)
    draw.text((pad_x, title_y), title, font=title_font, fill=title_color)

    title_bbox = title_font.getbbox(title)
    title_bottom = title_y + (title_bbox[3] - title_bbox[1])

    # -- Body text (regular, light gray, word-wrapped) ------------------
    body_font_size = 28
    body_font = _load_pil_font(FONT_BODY, body_font_size)
    body_color = (*_resolve_color("text_light"), 255)

    # Estimate chars per line based on available width
    avail_width = width - 2 * pad_x
    avg_char_width = body_font_size * 0.55  # rough heuristic
    chars_per_line = max(10, int(avail_width / avg_char_width))
    wrapped = textwrap.fill(body, width=chars_per_line)

    body_y = title_bottom + 14
    draw.multiline_text(
        (pad_x, body_y),
        wrapped,
        font=body_font,
        fill=body_color,
        spacing=int(body_font_size * 0.25),
    )

    return card


# ---------------------------------------------------------------------------
# Drawing helpers
# ---------------------------------------------------------------------------

def _draw_rounded_rect(
    draw: ImageDraw.ImageDraw,
    bbox: Tuple[int, int, int, int],
    radius: int,
    fill: Tuple[int, ...],
) -> None:
    """Draw a filled rounded rectangle using Pillow's ``rounded_rectangle``."""
    try:
        draw.rounded_rectangle(bbox, radius=radius, fill=fill)
    except AttributeError:
        # Pillow < 8.2 fallback: draw a plain rectangle
        draw.rectangle(bbox, fill=fill)


def _draw_rounded_rect_outline(
    draw: ImageDraw.ImageDraw,
    bbox: Tuple[int, int, int, int],
    radius: int,
    outline: Tuple[int, ...],
    width: int = 1,
) -> None:
    """Draw a rounded rectangle outline (border only)."""
    try:
        draw.rounded_rectangle(bbox, radius=radius, outline=outline, width=width)
    except AttributeError:
        draw.rectangle(bbox, outline=outline, width=width)
