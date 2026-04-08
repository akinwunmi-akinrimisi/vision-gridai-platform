#!/usr/bin/env python3
"""Generate YouTube channel banner + profile picture for Unsworn Testimony"""

import os
import math
import struct
import zlib
from PIL import Image, ImageDraw, ImageFont
import requests

OUTPUT_DIR = "/tmp/channel_art"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Download Montserrat ExtraBold
FONT_PATH = "/tmp/Montserrat-ExtraBold.ttf"
FONT_REGULAR_PATH = "/tmp/Montserrat-Medium.ttf"
if not os.path.exists(FONT_PATH):
    print("Downloading Montserrat ExtraBold...")
    r = requests.get("https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-ExtraBold.ttf")
    with open(FONT_PATH, "wb") as f:
        f.write(r.content)
if not os.path.exists(FONT_REGULAR_PATH):
    print("Downloading Montserrat Medium...")
    r = requests.get("https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Medium.ttf")
    with open(FONT_REGULAR_PATH, "wb") as f:
        f.write(r.content)

# Brand colors
DARK_BG = (8, 8, 18)          # Near-black navy
DARK_SECONDARY = (14, 14, 30)  # Slightly lighter
GOLD = (212, 175, 55)          # Classic gold
GOLD_BRIGHT = (255, 215, 0)    # Bright gold for accents
GOLD_DIM = (140, 115, 35)      # Muted gold
WHITE = (245, 245, 250)        # Warm white
GRAY = (120, 120, 135)         # Muted text
RED_ACCENT = (180, 30, 30)     # Deep red accent


def draw_radial_gradient(img, center, radius, color_center, color_edge, opacity=0.3):
    """Draw a soft radial gradient glow"""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for r in range(radius, 0, -2):
        t = r / radius
        alpha = int((1 - t) * opacity * 255)
        c = tuple(int(color_center[i] * (1 - t) + color_edge[i] * t) for i in range(3))
        draw.ellipse(
            [center[0] - r, center[1] - r, center[0] + r, center[1] + r],
            fill=(*c, alpha)
        )
    return Image.alpha_composite(img.convert("RGBA"), overlay)


def draw_horizontal_line(draw, y, x_start, x_end, color, width=1):
    draw.line([(x_start, y), (x_end, y)], fill=color, width=width)


def draw_vertical_bars(draw, x, y_start, y_end, color, count=5, spacing=4, width=2):
    """Draw a set of vertical bars (like audio equalizer)"""
    for i in range(count):
        h = max(4, int((y_end - y_start) * abs(0.4 + 0.6 * math.sin(i * 1.2))))
        bar_y = y_end - h
        if bar_y < y_end:
            draw.rectangle(
                [x + i * spacing, bar_y, x + i * spacing + width, y_end],
                fill=color
            )


def create_banner():
    """Create 2560x1440 YouTube banner"""
    print("Creating banner (2560x1440)...")
    W, H = 2560, 1440

    # Safe area: center 1546x423 (TV safe: 2560x1440, desktop: 2560x423, mobile: 1546x423)
    safe_left = (W - 1546) // 2  # 507
    safe_right = safe_left + 1546  # 2053
    safe_top = (H - 423) // 2  # 508
    safe_bottom = safe_top + 423  # 931

    # Base gradient background
    img = Image.new("RGB", (W, H), DARK_BG)
    draw = ImageDraw.Draw(img)

    # Subtle vertical gradient (darker at edges)
    for y in range(H):
        t = abs(y - H // 2) / (H // 2)
        r = int(DARK_BG[0] * (1 - t * 0.3))
        g = int(DARK_BG[1] * (1 - t * 0.3))
        b = int(DARK_BG[2] * (1 - t * 0.3))
        draw.line([(0, y), (W, y)], fill=(max(r, 0), max(g, 0), max(b, 0)))

    # Add subtle radial glows
    img = draw_radial_gradient(img, (W // 2 - 400, H // 2), 600, GOLD_DIM, DARK_BG, opacity=0.08)
    img = draw_radial_gradient(img, (W // 2 + 400, H // 2), 500, RED_ACCENT, DARK_BG, opacity=0.05)
    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)

    # Horizontal accent lines (evidence file aesthetic)
    line_color_dim = (40, 40, 55)
    line_color_gold = (*GOLD_DIM, )

    # Top decorative lines
    draw_horizontal_line(draw, safe_top - 60, safe_left, safe_right, line_color_dim, 1)
    draw_horizontal_line(draw, safe_top - 55, safe_left, safe_left + 200, line_color_gold, 2)

    # Bottom decorative lines
    draw_horizontal_line(draw, safe_bottom + 55, safe_left, safe_right, line_color_dim, 1)
    draw_horizontal_line(draw, safe_bottom + 60, safe_right - 200, safe_right, line_color_gold, 2)

    # Small decorative corner elements
    corner_size = 20
    corner_color = GOLD_DIM
    # Top-left corner
    draw.line([(safe_left - 30, safe_top - 30), (safe_left - 30 + corner_size, safe_top - 30)], fill=corner_color, width=2)
    draw.line([(safe_left - 30, safe_top - 30), (safe_left - 30, safe_top - 30 + corner_size)], fill=corner_color, width=2)
    # Top-right corner
    draw.line([(safe_right + 30 - corner_size, safe_top - 30), (safe_right + 30, safe_top - 30)], fill=corner_color, width=2)
    draw.line([(safe_right + 30, safe_top - 30), (safe_right + 30, safe_top - 30 + corner_size)], fill=corner_color, width=2)
    # Bottom-left corner
    draw.line([(safe_left - 30, safe_bottom + 30), (safe_left - 30 + corner_size, safe_bottom + 30)], fill=corner_color, width=2)
    draw.line([(safe_left - 30, safe_bottom + 30 - corner_size), (safe_left - 30, safe_bottom + 30)], fill=corner_color, width=2)
    # Bottom-right corner
    draw.line([(safe_right + 30 - corner_size, safe_bottom + 30), (safe_right + 30, safe_bottom + 30)], fill=corner_color, width=2)
    draw.line([(safe_right + 30, safe_bottom + 30 - corner_size), (safe_right + 30, safe_bottom + 30)], fill=corner_color, width=2)

    # === MAIN TEXT (centered in safe area) ===
    font_title = ImageFont.truetype(FONT_PATH, 110)
    font_tagline = ImageFont.truetype(FONT_REGULAR_PATH, 32)
    font_sub = ImageFont.truetype(FONT_REGULAR_PATH, 24)

    title = "UNSWORN TESTIMONY"
    tagline = "BETRAYAL  |  JUSTICE  |  TRUTH"
    subtitle = "LONG-FORM DOCUMENTARY"

    # Title
    title_bbox = draw.textbbox((0, 0), title, font=font_title)
    title_w = title_bbox[2] - title_bbox[0]
    title_x = (W - title_w) // 2
    title_y = H // 2 - 70

    # Gold shadow/glow effect behind text
    for offset in range(6, 0, -1):
        alpha_color = tuple(max(0, c - 180 + offset * 10) for c in GOLD_DIM)
        draw.text((title_x - offset, title_y + offset), title, font=font_title, fill=alpha_color)

    draw.text((title_x, title_y), title, font=font_title, fill=WHITE)

    # Gold underline beneath title
    line_y = title_y + 120
    line_w = 400
    draw.line([(W // 2 - line_w, line_y), (W // 2 + line_w, line_y)], fill=GOLD, width=3)
    # Small diamond at center of line
    d = 6
    cx, cy = W // 2, line_y
    draw.polygon([(cx, cy - d), (cx + d, cy), (cx, cy + d), (cx - d, cy)], fill=GOLD)

    # Tagline
    tagline_bbox = draw.textbbox((0, 0), tagline, font=font_tagline)
    tagline_w = tagline_bbox[2] - tagline_bbox[0]
    tagline_x = (W - tagline_w) // 2
    tagline_y = line_y + 20
    draw.text((tagline_x, tagline_y), tagline, font=font_tagline, fill=GOLD)

    # Subtitle (smaller, above title)
    sub_bbox = draw.textbbox((0, 0), subtitle, font=font_sub)
    sub_w = sub_bbox[2] - sub_bbox[0]
    sub_x = (W - sub_w) // 2
    sub_y = title_y - 45

    # Letter-spaced subtitle
    draw.text((sub_x, sub_y), subtitle, font=font_sub, fill=GRAY)

    # Small vertical bars as decorative element (left side)
    draw_vertical_bars(draw, safe_left + 20, H // 2 - 40, H // 2 + 40, GOLD_DIM, count=7, spacing=5, width=2)
    # Right side
    draw_vertical_bars(draw, safe_right - 60, H // 2 - 40, H // 2 + 40, GOLD_DIM, count=7, spacing=5, width=2)

    # Save
    banner_path = os.path.join(OUTPUT_DIR, "banner_2560x1440.png")
    img.save(banner_path, "PNG", quality=95)
    print(f"Banner saved: {banner_path} ({os.path.getsize(banner_path) // 1024}KB)")
    return banner_path


def create_profile_picture():
    """Create 800x800 profile picture with UT monogram"""
    print("Creating profile picture (800x800)...")
    S = 800

    img = Image.new("RGB", (S, S), DARK_BG)
    draw = ImageDraw.Draw(img)

    # Circular dark gradient background
    img = draw_radial_gradient(img, (S // 2, S // 2), 380, DARK_SECONDARY, DARK_BG, opacity=0.5)
    img = img.convert("RGB")
    draw = ImageDraw.Draw(img)

    # Outer ring (gold, thin)
    ring_r = 340
    ring_w = 3
    for angle_deg in range(360):
        angle = math.radians(angle_deg)
        x = S // 2 + ring_r * math.cos(angle)
        y = S // 2 + ring_r * math.sin(angle)
        draw.ellipse([x - ring_w, y - ring_w, x + ring_w, y + ring_w], fill=GOLD_DIM)

    # Inner ring (slightly brighter, thinner)
    ring_r2 = 310
    for angle_deg in range(360):
        angle = math.radians(angle_deg)
        x = S // 2 + ring_r2 * math.cos(angle)
        y = S // 2 + ring_r2 * math.sin(angle)
        draw.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(60, 60, 75))

    # "UT" monogram
    font_mono = ImageFont.truetype(FONT_PATH, 280)
    mono = "UT"
    mono_bbox = draw.textbbox((0, 0), mono, font=font_mono)
    mono_w = mono_bbox[2] - mono_bbox[0]
    mono_h = mono_bbox[3] - mono_bbox[1]
    mono_x = (S - mono_w) // 2
    mono_y = (S - mono_h) // 2 - 30

    # Subtle gold glow behind text
    for offset in range(8, 0, -1):
        glow_alpha = tuple(max(0, c - 200 + offset * 8) for c in GOLD_DIM)
        draw.text((mono_x, mono_y + offset), mono, font=font_mono, fill=glow_alpha)

    # Main text in white
    draw.text((mono_x, mono_y), mono, font=font_mono, fill=WHITE)

    # Small gold accent line under monogram
    line_y = mono_y + mono_h + 10
    line_w = 100
    draw.line([(S // 2 - line_w, line_y), (S // 2 + line_w, line_y)], fill=GOLD, width=3)

    # Channel name below line (small)
    font_small = ImageFont.truetype(FONT_REGULAR_PATH, 36)
    name = "UNSWORN"
    name_bbox = draw.textbbox((0, 0), name, font=font_small)
    name_w = name_bbox[2] - name_bbox[0]
    draw.text(((S - name_w) // 2, line_y + 12), name, font=font_small, fill=GOLD_DIM)

    name2 = "TESTIMONY"
    name2_bbox = draw.textbbox((0, 0), name2, font=font_small)
    name2_w = name2_bbox[2] - name2_bbox[0]
    draw.text(((S - name2_w) // 2, line_y + 52), name2, font=font_small, fill=GOLD_DIM)

    # Save
    pp_path = os.path.join(OUTPUT_DIR, "profile_800x800.png")
    img.save(pp_path, "PNG", quality=95)
    print(f"Profile picture saved: {pp_path} ({os.path.getsize(pp_path) // 1024}KB)")
    return pp_path


if __name__ == "__main__":
    print("=" * 50)
    print("  Unsworn Testimony — Channel Art Generator")
    print("=" * 50)
    banner = create_banner()
    profile = create_profile_picture()
    print("\nDone! Files at:")
    print(f"  Banner:  {banner}")
    print(f"  Profile: {profile}")
