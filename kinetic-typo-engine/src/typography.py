"""
Kinetic Typography Engine - Typography Renderer

Text measurement (pycairo), text rendering (Pillow), glow effects,
gradient dividers, and alpha-compositing utilities.

Uses pycairo for sub-pixel-accurate text measurement and Pillow for
rasterisation so we can leverage Pillow's compositing pipeline
everywhere else.
"""

from __future__ import annotations

import textwrap
from typing import Optional, Sequence, Tuple, Union

import cairo
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .config import (
    COLORS,
    FONT_BODY,
    FONT_BOLD,
    FONT_TITLE,
    STYLE_PRESETS,
    VIDEO_HEIGHT,
    VIDEO_WIDTH,
)


# ---------------------------------------------------------------------------
# Colour resolution helper
# ---------------------------------------------------------------------------

def _resolve_color(color: Union[str, Tuple[int, ...], None]) -> Tuple[int, int, int]:
    """
    Accept a COLORS key name or an (R, G, B[, A]) tuple and return (R, G, B).
    Falls back to white.
    """
    if color is None:
        return (255, 255, 255)
    if isinstance(color, str):
        c = COLORS.get(color, (255, 255, 255))
        return (c[0], c[1], c[2])
    return (color[0], color[1], color[2])


# ---------------------------------------------------------------------------
# Font resolution helper
# ---------------------------------------------------------------------------

def _resolve_font_path(bold: bool = False, italic: bool = False) -> str:
    """
    Return the filesystem path for the appropriate font weight/style.
    Falls back gracefully when specific variants are unavailable.
    """
    if bold:
        return FONT_TITLE  # Montserrat ExtraBold
    # No italic font file configured - Inter-Regular is a reasonable fallback
    return FONT_BODY  # Inter Regular


def _load_pil_font(font_path: str, font_size: int) -> ImageFont.FreeTypeFont:
    """Load a Pillow FreeType font, falling back to the default bitmap font."""
    try:
        return ImageFont.truetype(font_path, font_size)
    except (OSError, IOError):
        # Fallback: try the configured bold/body fonts before giving up
        for fallback in (FONT_TITLE, FONT_BOLD, FONT_BODY):
            try:
                return ImageFont.truetype(fallback, font_size)
            except (OSError, IOError):
                continue
        return ImageFont.load_default()


# ---------------------------------------------------------------------------
# Text measurement  (pycairo)
# ---------------------------------------------------------------------------

def measure_text(
    text: str,
    font_path: str,
    font_size: int,
) -> Tuple[int, int]:
    """
    Measure the bounding box of *text* rendered with the given font.

    Uses a pycairo recording surface for sub-pixel accuracy, then returns
    integer pixel dimensions (width, height).

    Parameters
    ----------
    text : str
        The string to measure.
    font_path : str
        Filesystem path to a TrueType / OpenType font file.
    font_size : int
        Point size.

    Returns
    -------
    tuple[int, int]
        (width, height) in pixels.
    """
    surface = cairo.RecordingSurface(cairo.Content.COLOR_ALPHA, None)
    ctx = cairo.Context(surface)
    ctx.select_font_face(
        "",
        cairo.FontSlant.NORMAL,
        cairo.FontWeight.BOLD,
    )
    # Load the actual font via FreeType face
    try:
        face = cairo.ToyFontFace("", cairo.FontSlant.NORMAL, cairo.FontWeight.NORMAL)
        ctx.set_font_face(face)
    except Exception:
        pass

    # For accurate measurement with the target font, use the font metrics
    ctx.set_font_size(font_size)

    # Use FreeType-based measurement via Pillow as a reliable cross-platform path
    try:
        pil_font = ImageFont.truetype(font_path, font_size)
        bbox = pil_font.getbbox(text)
        if bbox:
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            return (int(w), int(h))
    except (OSError, IOError):
        pass

    # Fallback: cairo toy font extents
    extents = ctx.text_extents(text)
    w = int(extents.width + 0.5)
    h = int(extents.height + 0.5)

    surface.finish()
    return (max(1, w), max(1, h))


# ---------------------------------------------------------------------------
# Text rendering (Pillow)
# ---------------------------------------------------------------------------

def render_text_layer(
    text: str,
    font_path: str,
    font_size: int,
    color: Union[str, Tuple[int, ...]] = "text_white",
    canvas_width: int = VIDEO_WIDTH,
    canvas_height: int = VIDEO_HEIGHT,
    align: str = "center",
    bold: bool = False,
) -> Image.Image:
    """
    Render *text* onto a transparent RGBA canvas.

    Parameters
    ----------
    text : str
        Text to render.  Multi-line (``\\n``) supported.
    font_path : str
        Path to the .ttf / .otf font file.
    font_size : int
        Point size.
    color : str or tuple
        A COLORS key or (R,G,B) tuple.
    canvas_width, canvas_height : int
        Dimensions of the output canvas.
    align : str
        ``'center'`` or ``'left'``.
    bold : bool
        If True and *font_path* doesn't already point to a bold font, swap
        to the configured bold font.

    Returns
    -------
    PIL.Image.Image
        RGBA image with text rendered on transparent background.
    """
    rgb = _resolve_color(color)
    fill = (*rgb, 255)

    # Resolve font
    if bold:
        actual_font_path = FONT_TITLE
    else:
        actual_font_path = font_path
    font = _load_pil_font(actual_font_path, font_size)

    canvas = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    lines = text.split("\n")

    # Measure total text block height
    line_heights = []
    line_widths = []
    for line in lines:
        bbox = font.getbbox(line) if line else font.getbbox("Ay")
        lw = (bbox[2] - bbox[0]) if line else 0
        lh = bbox[3] - bbox[1]
        line_widths.append(lw)
        line_heights.append(lh)

    line_spacing = int(font_size * 0.3)
    total_height = sum(line_heights) + line_spacing * max(0, len(lines) - 1)

    # Starting Y to vertically centre the text block
    y = (canvas_height - total_height) // 2

    for i, line in enumerate(lines):
        if not line:
            y += line_heights[i] + line_spacing
            continue

        if align == "center":
            x = (canvas_width - line_widths[i]) // 2
        else:  # left
            x = int(canvas_width * 0.05)  # 5% left margin

        draw.text((x, y), line, font=font, fill=fill)
        y += line_heights[i] + line_spacing

    return canvas


# ---------------------------------------------------------------------------
# Glow layer
# ---------------------------------------------------------------------------

def render_glow_layer(
    text_layer: Image.Image,
    blur_radius: int = 15,
    glow_color: Union[str, Tuple[int, ...]] = (155, 89, 182),
) -> Image.Image:
    """
    Create a coloured glow from an existing text layer.

    Applies a single Gaussian blur pass to the text layer's alpha channel,
    tinted with *glow_color*.

    Parameters
    ----------
    text_layer : PIL.Image.Image
        RGBA image (typically output of :func:`render_text_layer`).
    blur_radius : int
        Gaussian blur kernel radius.
    glow_color : str or tuple
        Tint colour for the glow.

    Returns
    -------
    PIL.Image.Image
        RGBA image containing only the glow (no original text).
    """
    rgb = _resolve_color(glow_color)
    w, h = text_layer.size

    # Extract alpha channel as intensity mask
    if text_layer.mode != "RGBA":
        text_layer = text_layer.convert("RGBA")
    alpha = text_layer.split()[3]

    # Blur the alpha to create the glow spread
    blurred_alpha = alpha.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    # Build tinted glow: solid colour canvas masked by blurred alpha
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    color_layer = Image.new("RGBA", (w, h), (*rgb, 255))
    glow = Image.composite(color_layer, glow, blurred_alpha)

    return glow


# ---------------------------------------------------------------------------
# Gradient divider
# ---------------------------------------------------------------------------

def render_divider_layer(
    width: int = VIDEO_WIDTH,
    height: int = 4,
    colors: Optional[Sequence[Tuple[int, int, int]]] = None,
    canvas_height: Optional[int] = None,
) -> Image.Image:
    """
    Render a horizontal gradient line (purple -> cyan -> white).

    Parameters
    ----------
    width : int
        Line width in pixels.
    height : int
        Line thickness in pixels.
    colors : sequence of (R,G,B), optional
        Gradient stops.  Defaults to purple -> cyan -> white.
    canvas_height : int, optional
        If provided, the divider is centred vertically on a canvas of this
        height.  Otherwise the returned image is exactly *height* px tall.

    Returns
    -------
    PIL.Image.Image
        RGBA image.
    """
    if colors is None:
        colors = [
            _resolve_color("accent_purple"),
            _resolve_color("accent_cyan"),
            (255, 255, 255),
        ]

    # Build gradient array
    arr = np.zeros((height, width, 4), dtype=np.uint8)
    n_stops = len(colors)

    for x in range(width):
        t = x / max(1, width - 1)
        seg = t * (n_stops - 1)
        idx = min(int(seg), n_stops - 2)
        local_t = seg - idx

        c0 = colors[idx]
        c1 = colors[idx + 1]
        r = int(c0[0] + (c1[0] - c0[0]) * local_t)
        g = int(c0[1] + (c1[1] - c0[1]) * local_t)
        b = int(c0[2] + (c1[2] - c0[2]) * local_t)

        arr[:, x] = [r, g, b, 255]

    line_img = Image.fromarray(arr, "RGBA")

    if canvas_height is not None and canvas_height > height:
        canvas = Image.new("RGBA", (width, canvas_height), (0, 0, 0, 0))
        y_offset = (canvas_height - height) // 2
        canvas.paste(line_img, (0, y_offset))
        return canvas

    return line_img


# ---------------------------------------------------------------------------
# Fast alpha compositing  (numpy)
# ---------------------------------------------------------------------------

def composite_with_opacity(
    base: Image.Image,
    layer: Image.Image,
    position: Tuple[int, int] = (0, 0),
    opacity: float = 1.0,
) -> Image.Image:
    """
    Composite *layer* onto *base* at *position* with an overall *opacity*.

    Uses numpy for fast per-pixel alpha blending.  Neither input is mutated.

    Parameters
    ----------
    base : PIL.Image.Image
        Bottom image (RGB or RGBA).
    layer : PIL.Image.Image
        Top image (must be RGBA).
    position : tuple[int, int]
        (x, y) offset on *base* where the top-left of *layer* is placed.
    opacity : float
        Overall opacity multiplier for *layer* (0.0 - 1.0).

    Returns
    -------
    PIL.Image.Image
        Composited result.  Mode matches *base*.
    """
    original_mode = base.mode
    base_rgba = base.convert("RGBA") if base.mode != "RGBA" else base.copy()
    layer_rgba = layer.convert("RGBA") if layer.mode != "RGBA" else layer

    bw, bh = base_rgba.size
    lw, lh = layer_rgba.size
    ox, oy = position

    # Compute the overlapping rectangle
    x0 = max(0, ox)
    y0 = max(0, oy)
    x1 = min(bw, ox + lw)
    y1 = min(bh, oy + lh)

    if x0 >= x1 or y0 >= y1:
        return base.copy()  # no overlap

    # Crop the region of interest from both images
    base_arr = np.array(base_rgba, dtype=np.float32)
    layer_arr = np.array(layer_rgba, dtype=np.float32)

    # Layer crop offsets (in layer-space)
    lx0 = x0 - ox
    ly0 = y0 - oy
    lx1 = lx0 + (x1 - x0)
    ly1 = ly0 + (y1 - y0)

    b_region = base_arr[y0:y1, x0:x1]
    l_region = layer_arr[ly0:ly1, lx0:lx1]

    # Effective alpha
    a = (l_region[:, :, 3:4] / 255.0) * opacity

    # Porter-Duff "over" for the RGB channels
    b_region[:, :, :3] = l_region[:, :, :3] * a + b_region[:, :, :3] * (1.0 - a)
    # Alpha channel
    b_region[:, :, 3:4] = np.clip(
        l_region[:, :, 3:4] * opacity + b_region[:, :, 3:4] * (1.0 - a),
        0,
        255,
    )

    base_arr[y0:y1, x0:x1] = b_region
    result = Image.fromarray(np.clip(base_arr, 0, 255).astype(np.uint8), "RGBA")

    if original_mode == "RGB":
        return result.convert("RGB")
    return result


# ---------------------------------------------------------------------------
# Re-export STYLE_PRESETS for convenience
# ---------------------------------------------------------------------------
# Consumers can do: ``from typography import STYLE_PRESETS``
__all__ = [
    "measure_text",
    "render_text_layer",
    "render_glow_layer",
    "render_divider_layer",
    "composite_with_opacity",
    "STYLE_PRESETS",
]
