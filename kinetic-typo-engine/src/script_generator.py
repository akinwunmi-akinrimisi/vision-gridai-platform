"""
Kinetic Typography Engine -- Script Generator

Generates scene-by-scene kinetic typography scripts via Claude API.
Short-form (<=900s): single API call.
Long-form (>900s):   chunked -- chapter outline, per-chapter scenes, stitch.

Each scene contains typed elements with animation metadata that downstream
modules (frame renderer, voice generator) consume directly.
"""

from __future__ import annotations

import json
import logging
import math
import re
from typing import Any, Dict, List, Optional

import anthropic

from .config import (
    ANTHROPIC_API_KEY,
    TEMP_DIR,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_MODEL: str = "claude-sonnet-4-20250514"
_MAX_TOKENS: int = 16000
_MAX_RETRIES: int = 3
_DURATION_TOLERANCE_S: float = 30.0
_CHUNK_THRESHOLD_S: int = 900  # 15 minutes


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_SHORT_FORM_PROMPT = """\
You are a kinetic typography scriptwriter. Generate a complete scene-by-scene script.

TOPIC: {keyword}
NICHE: {niche}
TOTAL DURATION: EXACTLY {duration_seconds} seconds

OUTPUT FORMAT (JSON):
{{"title": "Video Title", "scenes": [{{"id": 1, "type": "hook", "duration_seconds": 15, "elements": [{{"text": "...", "style": "label", "animation": "fade_in", "delay_ms": 0, "duration_ms": 600}}]}}]}}

RULES:
- Sum of ALL scene duration_seconds MUST equal EXACTLY {duration_seconds}
- Use 18-22 scenes per 5-minute segment
- Scene types: hook, comparison, list, statement, stats, quote, transition, cta
- Keep text SHORT and PUNCHY -- max 6 words per headline, 12 words per body line
- Styles: label | headline | accent | body | stat_value | stat_label | card_index | card_title | card_body | quote_text | quote_author | divider
- Animations: fade_in | slide_up | typewriter | word_by_word | pop | slide_in_left | counter | line_draw
- Start with a hook scene, end with a cta scene
- Verify duration sum before responding"""


_CHAPTER_OUTLINE_PROMPT = """\
You are a kinetic typography scriptwriter planning a long-form video.

TOPIC: {keyword}
NICHE: {niche}
TOTAL DURATION: EXACTLY {duration_seconds} seconds

Generate a chapter outline for this video. Each chapter should have:
- A title
- A brief description (1-2 sentences)
- A target duration in seconds

RULES:
- The sum of all chapter durations MUST equal EXACTLY {duration_seconds}
- Each chapter should be 120-300 seconds (2-5 minutes)
- Start with a hook/intro chapter
- End with a CTA/outro chapter
- Use 18-22 scenes per 5-minute segment when planning durations

OUTPUT FORMAT (JSON only, no markdown fences):
{{"title": "Video Title", "chapters": [{{"chapter_number": 1, "title": "Chapter Title", "description": "Brief description", "duration_seconds": 180}}]}}

Verify the duration sum equals EXACTLY {duration_seconds} before responding."""


_PER_CHAPTER_PROMPT = """\
You are a kinetic typography scriptwriter. Generate scenes for ONE chapter of a longer video.

TOPIC: {keyword}
NICHE: {niche}
VIDEO TITLE: {video_title}

CHAPTER {chapter_number} of {total_chapters}: "{chapter_title}"
CHAPTER DESCRIPTION: {chapter_description}
CHAPTER DURATION: EXACTLY {chapter_duration} seconds

{previous_context}

OUTPUT FORMAT (JSON only, no markdown fences):
{{"scenes": [{{"id": {id_offset}, "type": "hook", "duration_seconds": 15, "elements": [{{"text": "...", "style": "label", "animation": "fade_in", "delay_ms": 0, "duration_ms": 600}}]}}]}}

RULES:
- Sum of ALL scene duration_seconds MUST equal EXACTLY {chapter_duration}
- Use 18-22 scenes per 5-minute segment
- Scene types: hook, comparison, list, statement, stats, quote, transition, chapter_title, cta
- Keep text SHORT and PUNCHY -- max 6 words per headline, 12 words per body line
- Styles: label | headline | accent | body | stat_value | stat_label | card_index | card_title | card_body | quote_text | quote_author | divider
- Animations: fade_in | slide_up | typewriter | word_by_word | pop | slide_in_left | counter | line_draw
- Scene IDs start at {id_offset}
- Verify duration sum before responding"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` wrappers that Claude sometimes adds."""
    text = text.strip()
    # Remove opening fence
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    # Remove closing fence
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def _parse_json_response(text: str) -> Dict[str, Any]:
    """Extract and parse JSON from a Claude response."""
    cleaned = _strip_markdown_fences(text)
    return json.loads(cleaned)


def _total_duration(scenes: List[Dict[str, Any]]) -> float:
    """Sum all scene durations."""
    return sum(s.get("duration_seconds", 0) for s in scenes)


def _duration_is_valid(scenes: List[Dict[str, Any]], target: int) -> bool:
    """Check whether the total scene duration is within tolerance of the target."""
    actual = _total_duration(scenes)
    return abs(actual - target) <= _DURATION_TOLERANCE_S


def _call_claude(
    client: anthropic.Anthropic,
    prompt: str,
) -> str:
    """Send a single prompt to Claude and return the text response."""
    response = client.messages.create(
        model=_MODEL,
        max_tokens=_MAX_TOKENS,
        messages=[{"role": "user", "content": prompt}],
    )
    # Extract text from the first content block
    for block in response.content:
        if block.type == "text":
            return block.text
    raise ValueError("Claude returned no text content")


def _renumber_scenes(scenes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Assign sequential IDs starting at 1."""
    for idx, scene in enumerate(scenes, start=1):
        scene["id"] = idx
    return scenes


# ---------------------------------------------------------------------------
# Short-form generation (single call, <= 900s)
# ---------------------------------------------------------------------------

def _generate_short_form(
    client: anthropic.Anthropic,
    keyword: str,
    niche: str,
    duration_seconds: int,
) -> Dict[str, Any]:
    """Generate a script in a single Claude call for durations <= 900s.

    Retries up to ``_MAX_RETRIES`` times if the total duration is outside
    the tolerance window.

    Returns
    -------
    dict
        ``{"title": str, "scenes": [...]}``.
    """
    prompt = _SHORT_FORM_PROMPT.format(
        keyword=keyword,
        niche=niche,
        duration_seconds=duration_seconds,
    )

    for attempt in range(1, _MAX_RETRIES + 1):
        logger.info(
            "Short-form generation attempt %d/%d  (target=%ds)",
            attempt, _MAX_RETRIES, duration_seconds,
        )
        raw = _call_claude(client, prompt)
        parsed = _parse_json_response(raw)

        scenes = parsed.get("scenes", [])
        if _duration_is_valid(scenes, duration_seconds):
            logger.info(
                "Duration valid: %.1fs (target=%ds)",
                _total_duration(scenes), duration_seconds,
            )
            return parsed

        actual = _total_duration(scenes)
        logger.warning(
            "Duration mismatch: %.1fs vs %ds (attempt %d/%d)",
            actual, duration_seconds, attempt, _MAX_RETRIES,
        )
        # Augment prompt with correction hint for the next attempt
        prompt = (
            _SHORT_FORM_PROMPT.format(
                keyword=keyword,
                niche=niche,
                duration_seconds=duration_seconds,
            )
            + f"\n\nIMPORTANT: Your previous attempt totalled {actual:.0f}s "
            f"but the target is {duration_seconds}s. Adjust scene durations "
            f"so the sum is EXACTLY {duration_seconds}."
        )

    raise ValueError(
        f"Failed to generate valid script after {_MAX_RETRIES} attempts. "
        f"Last total: {_total_duration(scenes):.1f}s, target: {duration_seconds}s"
    )


# ---------------------------------------------------------------------------
# Long-form generation (chunked, > 900s)
# ---------------------------------------------------------------------------

def _generate_chapter_outline(
    client: anthropic.Anthropic,
    keyword: str,
    niche: str,
    duration_seconds: int,
) -> Dict[str, Any]:
    """Step 1: Generate a chapter outline for a long-form video.

    Retries up to ``_MAX_RETRIES`` times if chapter durations do not sum
    to the target.

    Returns
    -------
    dict
        ``{"title": str, "chapters": [...]}``.
    """
    prompt = _CHAPTER_OUTLINE_PROMPT.format(
        keyword=keyword,
        niche=niche,
        duration_seconds=duration_seconds,
    )

    for attempt in range(1, _MAX_RETRIES + 1):
        logger.info(
            "Chapter outline attempt %d/%d  (target=%ds)",
            attempt, _MAX_RETRIES, duration_seconds,
        )
        raw = _call_claude(client, prompt)
        parsed = _parse_json_response(raw)

        chapters = parsed.get("chapters", [])
        total = sum(ch.get("duration_seconds", 0) for ch in chapters)

        if abs(total - duration_seconds) <= _DURATION_TOLERANCE_S:
            logger.info(
                "Outline valid: %d chapters, %.0fs total (target=%ds)",
                len(chapters), total, duration_seconds,
            )
            return parsed

        logger.warning(
            "Outline duration mismatch: %.0fs vs %ds (attempt %d/%d)",
            total, duration_seconds, attempt, _MAX_RETRIES,
        )
        prompt = (
            _CHAPTER_OUTLINE_PROMPT.format(
                keyword=keyword,
                niche=niche,
                duration_seconds=duration_seconds,
            )
            + f"\n\nIMPORTANT: Your previous outline totalled {total:.0f}s "
            f"but the target is {duration_seconds}s. Fix chapter durations."
        )

    raise ValueError(
        f"Failed to generate valid chapter outline after {_MAX_RETRIES} attempts."
    )


def _generate_chapter_scenes(
    client: anthropic.Anthropic,
    keyword: str,
    niche: str,
    video_title: str,
    chapter: Dict[str, Any],
    chapter_number: int,
    total_chapters: int,
    id_offset: int,
    previous_last_scene: Optional[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Step 2: Generate scenes for a single chapter.

    Retries up to ``_MAX_RETRIES`` times if scene durations do not match
    the chapter's target.

    Parameters
    ----------
    previous_last_scene
        The final scene of the preceding chapter, used to give Claude
        narrative continuity context.  ``None`` for the first chapter.

    Returns
    -------
    list[dict]
        Scene dicts for this chapter.
    """
    chapter_duration = chapter["duration_seconds"]

    if previous_last_scene is not None:
        prev_text_parts = [
            el.get("text", "") for el in previous_last_scene.get("elements", [])
        ]
        prev_summary = " ".join(prev_text_parts).strip()
        previous_context = (
            f"PREVIOUS CHAPTER'S LAST SCENE (for narrative continuity):\n"
            f"  Type: {previous_last_scene.get('type', 'unknown')}\n"
            f"  Text: \"{prev_summary[:200]}\""
        )
    else:
        previous_context = "This is the FIRST chapter -- start with a strong hook."

    prompt = _PER_CHAPTER_PROMPT.format(
        keyword=keyword,
        niche=niche,
        video_title=video_title,
        chapter_number=chapter_number,
        total_chapters=total_chapters,
        chapter_title=chapter.get("title", f"Chapter {chapter_number}"),
        chapter_description=chapter.get("description", ""),
        chapter_duration=chapter_duration,
        id_offset=id_offset,
        previous_context=previous_context,
    )

    for attempt in range(1, _MAX_RETRIES + 1):
        logger.info(
            "Chapter %d scenes attempt %d/%d  (target=%ds)",
            chapter_number, attempt, _MAX_RETRIES, chapter_duration,
        )
        raw = _call_claude(client, prompt)
        parsed = _parse_json_response(raw)

        scenes = parsed.get("scenes", [])
        if _duration_is_valid(scenes, chapter_duration):
            logger.info(
                "Chapter %d: %d scenes, %.1fs (target=%ds)",
                chapter_number, len(scenes),
                _total_duration(scenes), chapter_duration,
            )
            return scenes

        actual = _total_duration(scenes)
        logger.warning(
            "Chapter %d duration mismatch: %.1fs vs %ds (attempt %d/%d)",
            chapter_number, actual, chapter_duration,
            attempt, _MAX_RETRIES,
        )
        prompt = (
            _PER_CHAPTER_PROMPT.format(
                keyword=keyword,
                niche=niche,
                video_title=video_title,
                chapter_number=chapter_number,
                total_chapters=total_chapters,
                chapter_title=chapter.get("title", f"Chapter {chapter_number}"),
                chapter_description=chapter.get("description", ""),
                chapter_duration=chapter_duration,
                id_offset=id_offset,
                previous_context=previous_context,
            )
            + f"\n\nIMPORTANT: Your previous attempt totalled {actual:.0f}s "
            f"but the target is {chapter_duration}s. Fix scene durations."
        )

    raise ValueError(
        f"Failed to generate valid scenes for chapter {chapter_number} "
        f"after {_MAX_RETRIES} attempts."
    )


def _generate_long_form(
    client: anthropic.Anthropic,
    keyword: str,
    niche: str,
    duration_seconds: int,
) -> Dict[str, Any]:
    """Generate a long-form script using the chunked 3-step approach.

    1. Chapter outline.
    2. Per-chapter scene generation (with continuity context).
    3. Stitch all chapter scenes into a single flat scene list.

    Returns
    -------
    dict
        ``{"title": str, "scenes": [...]}``.
    """
    # Step 1 -- chapter outline
    outline = _generate_chapter_outline(client, keyword, niche, duration_seconds)
    video_title = outline.get("title", keyword)
    chapters = outline.get("chapters", [])

    # Step 2 -- per-chapter scene generation
    all_scenes: List[Dict[str, Any]] = []
    id_offset = 1
    previous_last_scene: Optional[Dict[str, Any]] = None

    for idx, chapter in enumerate(chapters, start=1):
        scenes = _generate_chapter_scenes(
            client=client,
            keyword=keyword,
            niche=niche,
            video_title=video_title,
            chapter=chapter,
            chapter_number=idx,
            total_chapters=len(chapters),
            id_offset=id_offset,
            previous_last_scene=previous_last_scene,
        )
        all_scenes.extend(scenes)
        id_offset += len(scenes)
        if scenes:
            previous_last_scene = scenes[-1]

    # Step 3 -- stitch: renumber IDs sequentially
    all_scenes = _renumber_scenes(all_scenes)

    # Final duration validation across the stitched result
    actual = _total_duration(all_scenes)
    if abs(actual - duration_seconds) > _DURATION_TOLERANCE_S:
        logger.warning(
            "Stitched script duration drift: %.1fs vs %ds (tolerance=%.1fs). "
            "Adjusting last scene.",
            actual, duration_seconds, _DURATION_TOLERANCE_S,
        )
        # Compensate by adjusting the last scene's duration
        diff = duration_seconds - actual
        if all_scenes:
            last = all_scenes[-1]
            adjusted = last["duration_seconds"] + diff
            if adjusted > 0:
                last["duration_seconds"] = round(adjusted, 1)
            else:
                logger.error(
                    "Cannot compensate duration drift of %.1fs -- "
                    "last scene would go negative.", diff,
                )

    return {"title": video_title, "scenes": all_scenes}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_script(
    keyword: str,
    niche: str,
    duration_seconds: int,
    anthropic_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Generate a complete kinetic typography script.

    Parameters
    ----------
    keyword
        The video topic (e.g. "AI replacing jobs").
    niche
        The content niche (e.g. "technology").
    duration_seconds
        Target total video duration in seconds.
    anthropic_key
        Optional API key override.  Falls back to the ``ANTHROPIC_API_KEY``
        environment variable via ``config.py``.

    Returns
    -------
    dict
        A script dictionary with structure::

            {
                "title": "Video Title",
                "scenes": [
                    {
                        "id": 1,
                        "type": "hook",
                        "duration_seconds": 15,
                        "elements": [
                            {
                                "text": "...",
                                "style": "headline",
                                "animation": "fade_in",
                                "delay_ms": 0,
                                "duration_ms": 600
                            }
                        ]
                    },
                    ...
                ]
            }

    Raises
    ------
    ValueError
        If the generated script fails duration validation after all retries.
    anthropic.APIError
        If the Claude API returns an error.
    """
    key = anthropic_key or ANTHROPIC_API_KEY
    if not key:
        raise ValueError(
            "No Anthropic API key provided. Pass anthropic_key or set "
            "ANTHROPIC_API_KEY in your environment."
        )

    client = anthropic.Anthropic(api_key=key)

    if duration_seconds <= _CHUNK_THRESHOLD_S:
        logger.info(
            "Short-form path: keyword=%r, niche=%r, duration=%ds",
            keyword, niche, duration_seconds,
        )
        return _generate_short_form(client, keyword, niche, duration_seconds)
    else:
        logger.info(
            "Long-form (chunked) path: keyword=%r, niche=%r, duration=%ds",
            keyword, niche, duration_seconds,
        )
        return _generate_long_form(client, keyword, niche, duration_seconds)
