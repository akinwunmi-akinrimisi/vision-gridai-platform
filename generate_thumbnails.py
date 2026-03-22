#!/usr/bin/env python3
"""
Generate YouTube thumbnails with keyword emphasis.

Standard thumbnail spec:
  - 1280x720 canvas, diagonal split, AI image on right
  - Title text verbatim on left, broken into lines
  - KEYWORD EMPHASIS: key words rendered in a contrasting color
    to create visual pop and draw the eye
  - Text fills 75% of canvas height
"""

import json, os, time, re
import requests
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ─── Config ──────────────────────────────────────────────
FAL_API_KEY = os.environ.get("FAL_API_KEY", "REDACTED_FAL_API_KEY")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "REDACTED_ANTHROPIC_API_KEY")

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "thumbnails_output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── Title + emphasis keywords ───────────────────────────
# Lines: verbatim title broken into natural 2-4 word lines
# Emphasis: the core subject/reveal words that should POP
TITLE_LINES = ["HOW THE", "INTERCHANGE", "FEE BECAME", "AMERICA'S", "HIDDEN TAX"]
EMPHASIS_WORDS = {"INTERCHANGE", "FEE", "HIDDEN", "TAX"}

CONCEPTS = [
    {
        "lines": TITLE_LINES,
        "emphasis_words": EMPHASIS_WORDS,
        "emotion": "shocked",
        "palette": {
            "bg": (10, 10, 20),
            "text": (255, 230, 0),         # Yellow for normal words
            "emphasis": (0, 0, 0),          # Black for keywords
            "emphasis_outline": (255, 255, 255),  # White outline on black keywords
            "outline": (0, 0, 0),           # Black outline on yellow words
            "glow": (255, 230, 0),
        },
        "image_prompt": (
            "Cinematic photorealistic close-up portrait of a middle-aged woman small business owner "
            "in a diner, wearing an apron. She is staring at a credit card processing statement with "
            "an expression of pure shock and outrage — eyes wide open, mouth agape, eyebrows raised high. "
            "She holds a crumpled receipt in one hand. Dramatic single-source spotlight from above-left "
            "casting harsh shadows on her face. Dark moody background with volumetric fog and warm amber "
            "particle dust. High contrast, cinematic color grading. No text, no watermarks. "
            "Editorial portrait photography, 640x720 vertical crop, shallow depth of field."
        ),
    },
    {
        "lines": TITLE_LINES,
        "emphasis_words": EMPHASIS_WORDS,
        "emotion": "suspicious",
        "palette": {
            "bg": (20, 5, 0),
            "text": (255, 255, 255),        # White for normal words
            "emphasis": (255, 60, 40),       # Red for keywords
            "emphasis_outline": (0, 0, 0),   # Black outline on red keywords
            "outline": (0, 0, 0),            # Black outline on white words
            "glow": (255, 60, 40),
        },
        "image_prompt": (
            "Cinematic photorealistic portrait of a stern man in an expensive dark suit, looking directly "
            "at the camera with a cold, calculating expression — narrowed eyes, slight smirk, one eyebrow "
            "slightly raised. He holds a credit card between two fingers like a weapon. Behind him, faint "
            "ghostly outlines of dollar signs and transaction symbols float in volumetric red-tinted fog. "
            "Dramatic single-source lighting from above-left with deep shadows. Dark atmospheric background. "
            "High contrast, moody, thriller aesthetic. No text, no watermarks. "
            "Editorial portrait photography, 640x720 vertical crop, shallow depth of field."
        ),
    },
]


# ─── Image generation ────────────────────────────────────
def generate_image(prompt, index):
    print(f"  Generating image {index+1}...", end="", flush=True)
    resp = requests.post(
        "https://fal.run/fal-ai/bytedance/seedream/v4/text-to-image",
        headers={
            "Authorization": f"Key {FAL_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "prompt": prompt,
            "image_size": {"width": 640, "height": 720},
            "num_images": 1,
        },
        timeout=120,
    )
    resp.raise_for_status()
    url = resp.json()["images"][0]["url"]
    print(" done!")
    img_resp = requests.get(url, timeout=30)
    img_resp.raise_for_status()
    img = Image.open(BytesIO(img_resp.content)).convert("RGBA")
    img = img.resize((640, 720), Image.LANCZOS)
    raw_path = os.path.join(OUTPUT_DIR, f"thumb_{index+1}_raw.png")
    img.save(raw_path)
    print(f"  Saved raw image: {raw_path}")
    return img


def load_existing_image(index):
    """Load previously generated raw image if available."""
    raw_path = os.path.join(OUTPUT_DIR, f"thumb_{index+1}_raw.png")
    if os.path.exists(raw_path):
        return Image.open(raw_path).convert("RGBA")
    return None


# ─── Word-level text rendering with emphasis ─────────────
def draw_word_with_outline(draw, xy, word, font, fill, outline_color, outline_w=5):
    """Draw a single word with thick outline for readability."""
    x, y = xy
    for dx in range(-outline_w, outline_w + 1):
        for dy in range(-outline_w, outline_w + 1):
            if dx * dx + dy * dy <= outline_w * outline_w:
                draw.text((x + dx, y + dy), word, font=font, fill=outline_color)
    draw.text(xy, word, font=font, fill=fill)


def measure_word(draw, word, font):
    """Return (width, height) of a word."""
    bb = draw.textbbox((0, 0), word, font=font)
    return bb[2] - bb[0], bb[3] - bb[1]


def draw_line_with_emphasis(draw, x, y, line, font, pal, emphasis_words, outline_w=5):
    """
    Render a line word-by-word. Words in emphasis_words get the emphasis color;
    others get the normal text color. Each word has its own outline.
    """
    words = line.split()
    space_w = measure_word(draw, " ", font)[0]

    cursor_x = x
    for i, word in enumerate(words):
        # Strip punctuation for matching, but render with it
        clean = word.strip("'\".,!?()").upper()
        is_emphasis = clean in emphasis_words

        if is_emphasis:
            fill = pal["emphasis"]
            outline = pal["emphasis_outline"]
        else:
            fill = pal["text"]
            outline = pal["outline"]

        draw_word_with_outline(draw, (cursor_x, y), word, font, fill, outline, outline_w)

        w, _ = measure_word(draw, word, font)
        cursor_x += w + space_w


# ─── Thumbnail compositing ──────────────────────────────
def composite_thumbnail(ai_image, concept, font_path):
    W, H = 1280, 720
    pal = concept["palette"]
    lines = concept["lines"]
    emphasis_words = concept["emphasis_words"]

    # ── Canvas
    canvas = Image.new("RGB", (W, H), pal["bg"])

    # ── AI image on right with diagonal mask
    ai_wide = Image.new("RGB", (W, H), pal["bg"])
    ai_wide.paste(ai_image.convert("RGB"), (640, 0))
    mask = Image.new("L", (W, H), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.polygon([(600, 0), (W, 0), (W, H), (660, H)], fill=255)
    canvas.paste(ai_wide, mask=mask)

    # ── Diagonal glow line
    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    glow_rgba = pal["glow"] + (255,)
    for offset in range(-3, 4):
        glow_draw.line([(600 + offset, 0), (660 + offset, H)], fill=glow_rgba, width=2)
    glow_blurred = glow_layer.filter(ImageFilter.GaussianBlur(radius=4))
    canvas.paste(Image.alpha_composite(
        Image.new("RGBA", (W, H), (0, 0, 0, 0)),
        glow_blurred,
    ).convert("RGB"), mask=glow_blurred.split()[3])
    draw = ImageDraw.Draw(canvas)
    draw.line([(600, 0), (660, H)], fill=pal["glow"], width=4)

    # ── Find optimal font size (75% height, max 560px wide)
    LEFT_ZONE_W = 560
    TARGET_H = int(H * 0.75)
    X_PAD = 50

    lo, hi = 40, 180
    best_size = 40
    while lo <= hi:
        mid = (lo + hi) // 2
        font = ImageFont.truetype(font_path, mid)
        spacing = int(mid * 0.12)
        heights = []
        max_w = 0
        for line in lines:
            bb = draw.textbbox((0, 0), line, font=font)
            heights.append(bb[3] - bb[1])
            max_w = max(max_w, bb[2] - bb[0])
        total_h = sum(heights) + spacing * (len(lines) - 1)
        if total_h <= TARGET_H and max_w <= LEFT_ZONE_W:
            best_size = mid
            lo = mid + 1
        else:
            hi = mid - 1

    font = ImageFont.truetype(font_path, best_size)
    spacing = int(best_size * 0.12)
    print(f"  Font size: {best_size}px")

    # ── Measure lines and center vertically
    line_sizes = []
    for line in lines:
        bb = draw.textbbox((0, 0), line, font=font)
        line_sizes.append((bb[2] - bb[0], bb[3] - bb[1]))

    total_h = sum(s[1] for s in line_sizes) + spacing * (len(lines) - 1)
    y = (H - total_h) // 2

    # ── Render each line word-by-word with emphasis
    for i, line in enumerate(lines):
        _, h = line_sizes[i]
        draw_line_with_emphasis(draw, X_PAD, y, line, font, pal, emphasis_words, outline_w=5)
        y += h + spacing

    return canvas


# ─── Main ────────────────────────────────────────────────
def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--reuse-images", action="store_true",
                        help="Reuse existing raw AI images instead of generating new ones")
    args = parser.parse_args()

    font_path = "C:/Windows/Fonts/impact.ttf"
    if not os.path.exists(font_path):
        font_path = "C:/Windows/Fonts/arialbd.ttf"
    print(f"Font: {font_path}")

    images = []
    if args.reuse_images:
        print("[1/2] Reusing existing AI images...")
        for i in range(len(CONCEPTS)):
            img = load_existing_image(i)
            if img is None:
                print(f"  No existing image for {i+1}, generating...")
                img = generate_image(CONCEPTS[i]["image_prompt"], i)
            else:
                print(f"  Loaded existing thumb_{i+1}_raw.png")
            images.append(img)
    else:
        print("[1/2] Generating AI images via Fal.ai Seedream 4.0...")
        for i, c in enumerate(CONCEPTS):
            img = generate_image(c["image_prompt"], i)
            images.append(img)

    print("[2/2] Compositing thumbnails with keyword emphasis...")
    for i, c in enumerate(CONCEPTS):
        thumb = composite_thumbnail(images[i], c, font_path)
        out_path = os.path.join(OUTPUT_DIR, f"thumbnail_{i+1}.png")
        thumb.save(out_path, quality=95)
        print(f"  Thumbnail {i+1} saved: {out_path}")

    print(f"\nDone! Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
