"""
Kinetic Typography Engine - Frame Renderer

Core rendering loop. For each scene, calculates total frames, pre-renders
static layers, then composites per-frame with animated opacity/position.
Outputs numbered JPEG frames ready for FFmpeg assembly.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image

from .config import (
    COLORS,
    FPS,
    JPEG_QUALITY,
    VIDEO_HEIGHT,
    VIDEO_WIDTH,
)
from .animation_engine import get_animation_progress, interpolate
from .background import (
    generate_particles,
    render_background,
    render_grid_overlay,
    render_particles,
    update_particles,
)
from .typography import (
    STYLE_PRESETS,
    composite_with_opacity,
    render_divider_layer,
    render_glow_layer,
    render_text_layer,
)
from .cards import render_card

# ===========================================================================
# Compatibility wrappers — bridge frame_renderer's style-based API to
# typography.py's lower-level font_path/font_size API
# ===========================================================================
from .config import COLORS, STYLE_PRESETS, FONT_TITLE, FONT_BODY, FONT_BOLD

def _resolve_style(style_name):
    """Get font params from style preset name."""
    key = style_name.upper() if style_name else "BODY"
    preset = STYLE_PRESETS.get(key, STYLE_PRESETS.get("BODY", {}))
    font_path = FONT_BOLD if preset.get("bold") else FONT_BODY
    if key in ("HEADLINE", "STAT_VALUE", "CARD_INDEX"):
        font_path = FONT_TITLE
    return {
        "font_path": font_path,
        "font_size": preset.get("font_size", 36),
        "color": preset.get("color", COLORS.get("text_white", (255,255,255))),
        "bold": preset.get("bold", False),
    }

def _styled_text_layer(text, style="body", color=None, **kwargs):
    """Render text using style preset name, with automatic word wrapping."""
    import textwrap
    params = _resolve_style(style)
    if color:
        params["color"] = color
    # Auto-wrap text to fit screen width (75% of canvas)
    fs = params["font_size"]
    chars_per_line = max(10, int(VIDEO_WIDTH * 0.75 / (fs * 0.55)))
    wrapped = "\n".join(textwrap.wrap(text, width=chars_per_line)) if text else text
    return render_text_layer(
        text=wrapped,
        font_path=params["font_path"],
        font_size=params["font_size"],
        color=params["color"],
        canvas_width=VIDEO_WIDTH,
        canvas_height=VIDEO_HEIGHT,
        bold=params["bold"],
    )


def _styled_glow_layer(text, style="headline", color=None, **kwargs):
    """Render glow from text using style preset name."""
    text_layer = _styled_text_layer(text, style=style, color=color)
    glow_color = color or COLORS.get("accent_purple", (155,89,182))
    return render_glow_layer(text_layer, blur_radius=15, glow_color=glow_color)


logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------
Scene = Dict[str, Any]
Particle = Dict[str, Any]
Layer = Dict[str, Any]


# ===================================================================
# Layout helpers  (each returns a list of layer descriptors)
# ===================================================================

def _layout_hook(scene: Scene) -> List[Layer]:
    """Layout for 'hook': label top, headline center with glow, body below."""
    layers: List[Layer] = []

    label = scene.get("label", "")
    headline = scene.get("headline", scene.get("text", ""))
    body = scene.get("body", "")

    if label:
        layers.append({
            "type": "text",
            "content": label,
            "style": "label",
            "position": (VIDEO_WIDTH // 2, int(VIDEO_HEIGHT * 0.22)),
            "anchor": "mm",
            "color": COLORS["text_gray"],
            "animation": scene.get("animation", "fade_in"),
            "delay": 0.0,
        })

    if headline:
        layers.append({
            "type": "glow",
            "content": headline,
            "style": "headline",
            "position": (VIDEO_WIDTH // 2, VIDEO_HEIGHT // 2),
            "anchor": "mm",
            "color": COLORS["accent_purple"],
            "animation": scene.get("animation", "fade_in"),
            "delay": 0.1,
        })
        layers.append({
            "type": "text",
            "content": headline,
            "style": "headline",
            "position": (VIDEO_WIDTH // 2, VIDEO_HEIGHT // 2),
            "anchor": "mm",
            "color": COLORS["text_white"],
            "animation": scene.get("animation", "fade_in"),
            "delay": 0.1,
        })

    if body:
        layers.append({
            "type": "text",
            "content": body,
            "style": "body",
            "position": (VIDEO_WIDTH // 2, int(VIDEO_HEIGHT * 0.68)),
            "anchor": "mm",
            "color": COLORS["text_light"],
            "animation": scene.get("animation", "fade_in"),
            "delay": 0.25,
        })

    return layers


def _layout_comparison(scene: Scene) -> List[Layer]:
    """Layout for 'comparison': left OLD / right NEW with vertical divider."""
    layers: List[Layer] = []
    left = scene.get("left", {})
    right = scene.get("right", {})
    left_label = left.get("label", "OLD")
    right_label = right.get("label", "NEW")
    left_text = left.get("text", "")
    right_text = right.get("text", "")

    mid_x = VIDEO_WIDTH // 2

    # Vertical divider
    layers.append({
        "type": "divider",
        "orientation": "vertical",
        "position": (mid_x, VIDEO_HEIGHT // 2),
        "length": int(VIDEO_HEIGHT * 0.6),
        "color": COLORS["accent_cyan"],
        "animation": "fade_in",
        "delay": 0.0,
    })

    # Left side
    layers.append({
        "type": "text",
        "content": left_label,
        "style": "label",
        "position": (mid_x // 2, int(VIDEO_HEIGHT * 0.28)),
        "anchor": "mm",
        "color": COLORS["accent_orange"],
        "animation": "slide_left",
        "delay": 0.1,
    })
    if left_text:
        layers.append({
            "type": "text",
            "content": left_text,
            "style": "body",
            "position": (mid_x // 2, VIDEO_HEIGHT // 2),
            "anchor": "mm",
            "color": COLORS["text_white"],
            "animation": "slide_left",
            "delay": 0.2,
            "max_width": mid_x - 120,
        })

    # Right side
    layers.append({
        "type": "text",
        "content": right_label,
        "style": "label",
        "position": (mid_x + mid_x // 2, int(VIDEO_HEIGHT * 0.28)),
        "anchor": "mm",
        "color": COLORS["accent_cyan"],
        "animation": "slide_right",
        "delay": 0.1,
    })
    if right_text:
        layers.append({
            "type": "text",
            "content": right_text,
            "style": "body",
            "position": (mid_x + mid_x // 2, VIDEO_HEIGHT // 2),
            "anchor": "mm",
            "color": COLORS["text_white"],
            "animation": "slide_right",
            "delay": 0.2,
            "max_width": mid_x - 120,
        })

    return layers


def _layout_list(scene: Scene) -> List[Layer]:
    """Layout for 'list': sequential card reveals with stagger delays."""
    layers: List[Layer] = []
    items: List[Any] = scene.get("items", [])
    title = scene.get("title", "")

    if title:
        layers.append({
            "type": "text",
            "content": title,
            "style": "subheadline",
            "position": (VIDEO_WIDTH // 2, int(VIDEO_HEIGHT * 0.12)),
            "anchor": "mm",
            "color": COLORS["text_white"],
            "animation": "fade_in",
            "delay": 0.0,
        })

    card_count = len(items)
    if card_count == 0:
        return layers

    # Calculate card layout area
    top_y = int(VIDEO_HEIGHT * 0.22)
    available_height = int(VIDEO_HEIGHT * 0.72)
    card_height = min(available_height // card_count, 140)
    card_spacing = min(
        (available_height - card_height * card_count) // max(card_count - 1, 1),
        20,
    )
    stagger_step = 0.15  # seconds between each card appearance

    for idx, item in enumerate(items):
        card_y = top_y + idx * (card_height + card_spacing) + card_height // 2
        text = item if isinstance(item, str) else item.get("text", str(item))
        layers.append({
            "type": "card",
            "content": text,
            "index": idx,
            "position": (VIDEO_WIDTH // 2, card_y),
            "size": (int(VIDEO_WIDTH * 0.7), card_height),
            "animation": "slide_up",
            "delay": 0.2 + idx * stagger_step,
        })

    return layers


def _layout_statement(scene: Scene) -> List[Layer]:
    """Layout for 'statement': single headline centered with large glow."""
    text = scene.get("text", scene.get("headline", ""))
    layers: List[Layer] = []

    if text:
        layers.append({
            "type": "glow",
            "content": text,
            "style": "headline",
            "position": (VIDEO_WIDTH // 2, VIDEO_HEIGHT // 2),
            "anchor": "mm",
            "color": COLORS["accent_purple"],
            "animation": scene.get("animation", "fade_in"),
            "delay": 0.0,
        })
        layers.append({
            "type": "text",
            "content": text,
            "style": "headline",
            "position": (VIDEO_WIDTH // 2, VIDEO_HEIGHT // 2),
            "anchor": "mm",
            "color": COLORS["text_white"],
            "animation": scene.get("animation", "fade_in"),
            "delay": 0.0,
        })

    return layers


def _layout_stats(scene: Scene) -> List[Layer]:
    """Layout for 'stats': big number with counter animation, label below."""
    stat_value = scene.get("stat_value", scene.get("value", ""))
    stat_label = scene.get("stat_label", scene.get("label", ""))
    layers: List[Layer] = []

    if stat_value:
        layers.append({
            "type": "glow",
            "content": str(stat_value),
            "style": "stat_value",
            "position": (VIDEO_WIDTH // 2, int(VIDEO_HEIGHT * 0.42)),
            "anchor": "mm",
            "color": COLORS["accent_cyan"],
            "animation": scene.get("animation", "counter"),
            "delay": 0.0,
        })
        layers.append({
            "type": "text",
            "content": str(stat_value),
            "style": "stat_value",
            "position": (VIDEO_WIDTH // 2, int(VIDEO_HEIGHT * 0.42)),
            "anchor": "mm",
            "color": COLORS["accent_cyan"],
            "animation": scene.get("animation", "counter"),
            "delay": 0.0,
        })

    if stat_label:
        layers.append({
            "type": "text",
            "content": stat_label,
            "style": "body",
            "position": (VIDEO_WIDTH // 2, int(VIDEO_HEIGHT * 0.60)),
            "anchor": "mm",
            "color": COLORS["text_light"],
            "animation": "fade_in",
            "delay": 0.3,
        })

    return layers


def _layout_quote(scene: Scene) -> List[Layer]:
    """Layout for 'quote': decorative marks, italic text, author bottom-right."""
    quote_text = scene.get("text", scene.get("quote", ""))
    author = scene.get("author", "")
    layers: List[Layer] = []

    # Decorative open-quote mark
    layers.append({
        "type": "text",
        "content": "\u201c",
        "style": "decorative_quote",
        "position": (int(VIDEO_WIDTH * 0.15), int(VIDEO_HEIGHT * 0.28)),
        "anchor": "mm",
        "color": COLORS["accent_purple"],
        "animation": "fade_in",
        "delay": 0.0,
    })

    if quote_text:
        layers.append({
            "type": "text",
            "content": quote_text,
            "style": "quote",
            "position": (VIDEO_WIDTH // 2, VIDEO_HEIGHT // 2),
            "anchor": "mm",
            "color": COLORS["text_white"],
            "animation": scene.get("animation", "fade_in"),
            "delay": 0.15,
            "max_width": int(VIDEO_WIDTH * 0.65),
        })

    if author:
        layers.append({
            "type": "text",
            "content": "-- " + author,
            "style": "author",
            "position": (int(VIDEO_WIDTH * 0.75), int(VIDEO_HEIGHT * 0.74)),
            "anchor": "rm",
            "color": COLORS["text_gray"],
            "animation": "fade_in",
            "delay": 0.35,
        })

    return layers


def _layout_transition(scene: Scene) -> List[Layer]:
    """Layout for 'transition': divider line with brief fade."""
    return [{
        "type": "divider",
        "orientation": "horizontal",
        "position": (VIDEO_WIDTH // 2, VIDEO_HEIGHT // 2),
        "length": int(VIDEO_WIDTH * 0.4),
        "color": COLORS["accent_cyan"],
        "animation": "scale_in",
        "delay": 0.0,
    }]


def _layout_chapter_title(scene: Scene) -> List[Layer]:
    """Layout for 'chapter_title': CHAPTER N label + title with dramatic entrance."""
    chapter_num = scene.get("chapter_number", scene.get("number", ""))
    title = scene.get("title", scene.get("text", ""))
    layers: List[Layer] = []

    if chapter_num:
        layers.append({
            "type": "text",
            "content": "CHAPTER " + str(chapter_num),
            "style": "label",
            "position": (VIDEO_WIDTH // 2, int(VIDEO_HEIGHT * 0.35)),
            "anchor": "mm",
            "color": COLORS["accent_cyan"],
            "animation": "fade_in",
            "delay": 0.0,
        })

    if title:
        layers.append({
            "type": "glow",
            "content": title,
            "style": "subheadline",
            "position": (VIDEO_WIDTH // 2, int(VIDEO_HEIGHT * 0.52)),
            "anchor": "mm",
            "color": COLORS["accent_purple"],
            "animation": "slide_up",
            "delay": 0.2,
        })
        layers.append({
            "type": "text",
            "content": title,
            "style": "subheadline",
            "position": (VIDEO_WIDTH // 2, int(VIDEO_HEIGHT * 0.52)),
            "anchor": "mm",
            "color": COLORS["text_white"],
            "animation": "slide_up",
            "delay": 0.2,
        })

    return layers


def _layout_cta(scene: Scene) -> List[Layer]:
    """Layout for 'cta': action text with accent color."""
    text = scene.get("text", scene.get("cta", ""))
    layers: List[Layer] = []

    if text:
        layers.append({
            "type": "glow",
            "content": text,
            "style": "headline",
            "position": (VIDEO_WIDTH // 2, VIDEO_HEIGHT // 2),
            "anchor": "mm",
            "color": COLORS["accent_orange"],
            "animation": scene.get("animation", "scale_in"),
            "delay": 0.0,
        })
        layers.append({
            "type": "text",
            "content": text,
            "style": "headline",
            "position": (VIDEO_WIDTH // 2, VIDEO_HEIGHT // 2),
            "anchor": "mm",
            "color": COLORS["text_white"],
            "animation": scene.get("animation", "scale_in"),
            "delay": 0.0,
        })

    return layers


# Scene-type to layout-builder dispatch
_LAYOUT_DISPATCH: Dict[str, Any] = {
    "hook": _layout_hook,
    "comparison": _layout_comparison,
    "list": _layout_list,
    "statement": _layout_statement,
    "stats": _layout_stats,
    "stat": _layout_stats,          # alias
    "quote": _layout_quote,
    "transition": _layout_transition,
    "chapter_title": _layout_chapter_title,
    "cta": _layout_cta,
}


# ===================================================================
# Typewriter / word-by-word helpers
# ===================================================================

def _is_typewriter_animation(animation: str) -> bool:
    """Return True if the animation requires per-frame text re-rendering."""
    return animation in ("typewriter", "word_by_word")


def _get_partial_text(content: str, animation: str, progress: float) -> str:
    """
    Return the visible portion of *content* at *progress* (0.0-1.0)
    for character-level or word-level reveal animations.
    """
    if progress >= 1.0:
        return content
    if progress <= 0.0:
        return ""

    if animation == "typewriter":
        char_count = max(1, int(len(content) * progress))
        return content[:char_count]

    if animation == "word_by_word":
        words = content.split()
        word_count = max(1, int(len(words) * progress))
        return " ".join(words[:word_count])

    return content


# ===================================================================
# Layer pre-rendering / dynamic rendering
# ===================================================================

def _pre_render_layer(layer: Layer) -> Optional[Image.Image]:
    """
    Pre-render a static layer into an RGBA image at video resolution.
    Returns None if the layer requires per-frame re-rendering.
    """
    layer_type = layer["type"]
    animation = layer.get("animation", "fade_in")

    # Typewriter-family layers must be rendered every frame
    if layer_type in ("text", "glow") and _is_typewriter_animation(animation):
        return None

    if layer_type == "text":
        return _styled_text_layer(
            text=layer["content"],
            style=layer.get("style", "body"),
            color=layer.get("color"),
        )

    if layer_type == "glow":
        return _styled_glow_layer(
            text=layer["content"],
            style=layer.get("style", "headline"),
            color=layer.get("color"),
        )

    if layer_type == "divider":
        return render_divider_layer(
            width=VIDEO_WIDTH,
            height=4,
            canvas_height=VIDEO_HEIGHT,
        )

    if layer_type == "card":
        return render_card(
            text=layer["content"],
            index=layer.get("index", 0),
            position=layer["position"],
            size=layer.get("size", (int(VIDEO_WIDTH * 0.7), 120)),
            canvas_size=(VIDEO_WIDTH, VIDEO_HEIGHT),
        )

    logger.warning("Unknown layer type: %s", layer_type)
    return None


def _render_dynamic_layer(layer: Layer, progress: float) -> Optional[Image.Image]:
    """
    Render a typewriter/word_by_word layer at the given reveal progress.
    Returns None if nothing is visible yet.
    """
    animation = layer.get("animation", "fade_in")
    partial = _get_partial_text(layer["content"], animation, progress)
    if not partial:
        return None

    if layer["type"] == "glow":
        return render_glow_layer(
            text=partial,
            style=layer.get("style", "headline"),
            position=layer["position"],
            anchor=layer.get("anchor", "mm"),
            color=layer.get("color", COLORS["accent_purple"]),
            canvas_size=(VIDEO_WIDTH, VIDEO_HEIGHT),
        )

    return _styled_text_layer(
        text=partial,
        style=layer.get("style", "body"),
        color=layer.get("color"),
    )


# ===================================================================
# Per-frame animation state  (opacity + offset)
# ===================================================================

_ENTRANCE_DURATION: float = 0.5   # seconds for entrance animations
_EXIT_DURATION: float = 0.3       # seconds for exit fade


def _compute_layer_opacity(
    layer: Layer,
    frame_idx: int,
    total_frames: int,
) -> float:
    """
    Compute the opacity (0.0 - 1.0) for a layer at *frame_idx*, accounting
    for entrance animation, per-layer delay, and scene-end exit fade.
    """
    duration_seconds = total_frames / FPS
    current_time = frame_idx / FPS
    delay = layer.get("delay", 0.0)
    animation = layer.get("animation", "fade_in")

    # Before the layer's entrance delay: invisible
    if current_time < delay:
        return 0.0

    # Entrance phase
    elapsed = current_time - delay
    entrance_progress = get_animation_progress(
        elapsed_ms=elapsed*1000, delay_ms=0, duration_ms=_ENTRANCE_DURATION*1000, easing=animation if isinstance(animation, str) else "ease_out_cubic",
    )
    entrance_opacity = min(max(entrance_progress, 0.0), 1.0)

    # Exit fade in the last _EXIT_DURATION seconds of the scene
    exit_opacity = 1.0
    exit_start = max(0.0, duration_seconds - _EXIT_DURATION)
    if current_time > exit_start and duration_seconds > _EXIT_DURATION + 0.1:
        exit_elapsed = current_time - exit_start
        exit_opacity = max(0.0, 1.0 - exit_elapsed / _EXIT_DURATION)

    return entrance_opacity * exit_opacity


def _compute_layer_offset(
    layer: Layer,
    frame_idx: int,
    total_frames: int,
) -> Tuple[int, int]:
    """
    Compute the (dx, dy) pixel offset for animated position.
    Slide animations start off-screen and ease towards (0, 0).
    """
    current_time = frame_idx / FPS
    delay = layer.get("delay", 0.0)
    animation = layer.get("animation", "fade_in")

    # Slide distances (pixels)
    slide_y = 80
    slide_x = 120

    # Before animation starts: return full initial offset
    if current_time < delay:
        if animation == "slide_up":
            return (0, slide_y)
        if animation == "slide_left":
            return (-slide_x, 0)
        if animation == "slide_right":
            return (slide_x, 0)
        return (0, 0)

    elapsed = current_time - delay
    progress = get_animation_progress(elapsed_ms=elapsed*1000, delay_ms=0, duration_ms=_ENTRANCE_DURATION*1000, easing=animation if isinstance(animation, str) else "ease_out_cubic")
    progress = max(0.0, min(1.0, progress))

    if animation == "slide_up":
        dy = int(interpolate(float(slide_y), 0.0, progress))
        return (0, dy)
    if animation == "slide_left":
        dx = int(interpolate(float(-slide_x), 0.0, progress))
        return (dx, 0)
    if animation == "slide_right":
        dx = int(interpolate(float(slide_x), 0.0, progress))
        return (dx, 0)

    # fade_in, scale_in, counter: no positional shift
    return (0, 0)


# ===================================================================
# Public API
# ===================================================================

def render_scene(
    scene: Scene,
    output_dir: str,
    start_frame: int = 0,
    particles: Optional[List[Particle]] = None,
) -> int:
    """
    Render all frames for a single scene to *output_dir* as numbered JPEGs.

    Parameters
    ----------
    scene : dict
        Scene descriptor.  Expected keys include ``type``
        (hook | comparison | list | statement | stats | quote |
        transition | chapter_title | cta), ``duration_seconds``,
        text/headline/items/etc., ``animation``, and ``color_mood``.
    output_dir : str
        Directory to write ``frame_NNNNNN.jpg`` files into.
    start_frame : int
        Global frame counter offset so filenames are unique across scenes.
    particles : list or None
        Existing particle state to carry across scenes.  If *None*, a
        fresh particle set is generated.

    Returns
    -------
    int
        Number of frames rendered for this scene.
    """
    os.makedirs(output_dir, exist_ok=True)

    duration = float(scene.get("duration_seconds", 4.0))
    total_frames = int(duration * FPS)
    scene_type = scene.get("type", "statement")

    logger.info(
        "Rendering scene type=%s  frames=%d  start=%d",
        scene_type, total_frames, start_frame,
    )

    # ------------------------------------------------------------------
    # 1. Background (static per scene, rendered once)
    # ------------------------------------------------------------------
    # Dynamic background color based on chapter number
    _mood_keys = list(["purple_teal", "cyan_orange", "pink_blue", "green_purple", "gold_navy", "red_teal"])
    _chapter_num = scene.get("chapter_number", 0) if isinstance(scene.get("chapter_number"), int) else 0
    _bg_mood = _mood_keys[_chapter_num % len(_mood_keys)]
    bg_base: Image.Image = render_background(
        width=VIDEO_WIDTH,
        height=VIDEO_HEIGHT,
        color_mood=_bg_mood,
    )
    grid_overlay: Image.Image = render_grid_overlay(
        width=VIDEO_WIDTH,
        height=VIDEO_HEIGHT,
    )

    # ------------------------------------------------------------------
    # 2. Particles
    # ------------------------------------------------------------------
    if particles is None:
        particles = generate_particles(
            count=60,
            width=VIDEO_WIDTH,
            height=VIDEO_HEIGHT,
        )

    # ------------------------------------------------------------------
    # 3. Layout layers for this scene type
    # ------------------------------------------------------------------
    layout_fn = _LAYOUT_DISPATCH.get(scene_type, _layout_statement)
    layers: List[Layer] = layout_fn(scene)

    # ------------------------------------------------------------------
    # 4. Pre-render static layers (one-time cost)
    # ------------------------------------------------------------------
    pre_rendered: List[Optional[Image.Image]] = []
    for layer in layers:
        pre_rendered.append(_pre_render_layer(layer))

    # ------------------------------------------------------------------
    # 5. Per-frame rendering loop
    # ------------------------------------------------------------------
    for frame_idx in range(total_frames):
        # Fresh copy of static background
        frame: Image.Image = bg_base.copy()

        # Grid overlay
        frame = frame.convert("RGBA"); frame = Image.alpha_composite(frame, grid_overlay)

        # Update and composite particles
        update_particles(particles, VIDEO_WIDTH, VIDEO_HEIGHT)
        frame = render_particles(frame, particles)

        # Composite each content layer with animation
        for layer_idx, layer in enumerate(layers):
            opacity = _compute_layer_opacity(layer, frame_idx, total_frames)
            if opacity <= 0.0:
                continue

            dx, dy = _compute_layer_offset(layer, frame_idx, total_frames)
            animation = layer.get("animation", "fade_in")

            # Dynamic vs pre-rendered layer image
            if (
                _is_typewriter_animation(animation)
                and layer["type"] in ("text", "glow")
            ):
                # Typewriter: re-render with partial text each frame
                reveal_progress = _compute_layer_opacity(
                    layer, frame_idx, total_frames,
                )
                layer_img = _render_dynamic_layer(layer, reveal_progress)
            else:
                layer_img = pre_rendered[layer_idx]

            if layer_img is None:
                continue

            # Apply positional offset
            if dx != 0 or dy != 0:
                shifted = Image.new(
                    "RGBA", (VIDEO_WIDTH, VIDEO_HEIGHT), (0, 0, 0, 0),
                )
                shifted.paste(layer_img, (dx, dy))
                layer_img = shifted

            # Composite with animated opacity
            frame = composite_with_opacity(frame, layer_img, position=(0, 0), opacity=opacity)

        # ------------------------------------------------------------------
        # Convert RGBA -> RGB and save JPEG
        # ------------------------------------------------------------------
        rgb_frame = Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT), (0, 0, 0))
        if frame.mode == "RGBA":
            rgb_frame.paste(frame, mask=frame.split()[3])
        else:
            rgb_frame.paste(frame)

        filename = "frame_{:06d}.jpg".format(start_frame + frame_idx)
        filepath = os.path.join(output_dir, filename)
        rgb_frame.save(filepath, "JPEG", quality=JPEG_QUALITY)

    logger.info(
        "Scene complete: %d frames written to %s", total_frames, output_dir,
    )
    return total_frames
