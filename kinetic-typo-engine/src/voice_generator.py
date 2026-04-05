"""
Kinetic Typography Engine -- Voice Generator

Converts script elements to spoken audio via Google Cloud TTS (Journey-D).
Handles per-element timing, silence padding, speaking-rate adaptation,
and text preprocessing (symbol expansion, caps normalisation).
"""

from __future__ import annotations

import io
import logging
import math
import os
import re
import struct
import wave
from pathlib import Path
from typing import Any, Dict, List, Optional

from google.cloud import texttospeech

from config import (
    ACRONYMS,
    TEMP_DIR,
    TTS_MAX_RATE,
    TTS_SAMPLE_RATE,
    TTS_SPEAKING_RATE,
    TTS_VOICE_NAME,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_LANGUAGE_CODE: str = "en-US"
_ENCODING = texttospeech.AudioEncoding.LINEAR16
_SAMPLE_WIDTH: int = 2   # 16-bit PCM = 2 bytes per sample
_CHANNELS: int = 1       # mono


# ---------------------------------------------------------------------------
# Text Preprocessing
# ---------------------------------------------------------------------------

# Regex helpers for monetary / percentage expansions
_RE_TRILLION = re.compile(r"\$\s*([\d,.]+)\s*[Tt](?:rillion)?")
_RE_BILLION = re.compile(r"\$\s*([\d,.]+)\s*[Bb](?:illion)?")
_RE_MILLION = re.compile(r"\$\s*([\d,.]+)\s*[Mm](?:illion)?")
_RE_DOLLARS = re.compile(r"\$\s*([\d,.]+)")
_RE_PERCENT = re.compile(r"([\d,.]+)\s*%")

# Detect "card index" text -- purely numeric, 1-2 digits
_RE_CARD_INDEX = re.compile(r"^\s*\d{1,2}\s*$")


def preprocess_for_tts(text: str) -> Optional[str]:
    """Prepare a text element for TTS synthesis.

    Returns
    -------
    str or None
        The cleaned text ready for TTS, or ``None`` if the element should
        be skipped (e.g. a bare card-index number or pure whitespace).
    """
    if not text or not text.strip():
        return None

    cleaned = text.strip()

    # Skip bare card indices (single / double digit only text)
    if _RE_CARD_INDEX.match(cleaned):
        return None

    # --- Symbol expansion (order matters: trillion > billion > million > bare $) ---
    cleaned = _RE_TRILLION.sub(
        lambda m: f"{m.group(1)} trillion dollars", cleaned,
    )
    cleaned = _RE_BILLION.sub(
        lambda m: f"{m.group(1)} billion dollars", cleaned,
    )
    cleaned = _RE_MILLION.sub(
        lambda m: f"{m.group(1)} million dollars", cleaned,
    )
    cleaned = _RE_DOLLARS.sub(
        lambda m: f"{m.group(1)} dollars", cleaned,
    )
    cleaned = _RE_PERCENT.sub(
        lambda m: f"{m.group(1)} percent", cleaned,
    )

    # --- ALL_CAPS words -> title case, preserving known acronyms ---
    def _caps_to_title(match: re.Match) -> str:
        word = match.group(0)
        if word in ACRONYMS:
            return word
        return word.title()

    # Match sequences of 2+ uppercase letters (whole words)
    cleaned = re.sub(r"\b[A-Z]{2,}\b", _caps_to_title, cleaned)

    return cleaned if cleaned else None


# ---------------------------------------------------------------------------
# Audio Helpers
# ---------------------------------------------------------------------------

def _make_silence(duration_ms: int) -> bytes:
    """Generate raw PCM silence (16-bit, mono, 48 kHz) of the given duration."""
    if duration_ms <= 0:
        return b""
    num_samples = int(TTS_SAMPLE_RATE * duration_ms / 1000)
    return b"\x00\x00" * num_samples


def _wav_bytes_to_pcm(wav_bytes: bytes) -> bytes:
    """Strip WAV header and return raw PCM data."""
    with io.BytesIO(wav_bytes) as buf:
        with wave.open(buf, "rb") as wf:
            return wf.readframes(wf.getnframes())


def _pcm_duration_ms(pcm_data: bytes) -> float:
    """Duration of raw PCM data in milliseconds."""
    num_samples = len(pcm_data) // _SAMPLE_WIDTH
    return (num_samples / TTS_SAMPLE_RATE) * 1000


def _write_wav(pcm_data: bytes, path: str) -> None:
    """Write raw PCM data to a WAV file."""
    with wave.open(path, "wb") as wf:
        wf.setnchannels(_CHANNELS)
        wf.setsampwidth(_SAMPLE_WIDTH)
        wf.setframerate(TTS_SAMPLE_RATE)
        wf.writeframes(pcm_data)


def _synthesize_text(
    client: texttospeech.TextToSpeechClient,
    text: str,
    speaking_rate: float,
) -> bytes:
    """Call Google Cloud TTS and return WAV bytes.

    Note: Journey-D does NOT support the ``pitch`` parameter, so we do
    not set it.
    """
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code=_LANGUAGE_CODE,
        name=TTS_VOICE_NAME,
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=_ENCODING,
        sample_rate_hertz=TTS_SAMPLE_RATE,
        speaking_rate=speaking_rate,
    )
    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config,
    )
    return response.audio_content


def _estimate_speaking_rate(text: str, available_ms: float) -> float:
    """Estimate the speaking rate needed to fit *text* into *available_ms*.

    Heuristic: average English speech is ~150 words / minute at rate 1.0.
    """
    if available_ms <= 0:
        return TTS_SPEAKING_RATE

    word_count = len(text.split())
    # At rate=1.0, ~150 wpm => 2.5 words/sec => 400ms/word
    estimated_ms_at_1x = word_count * 400.0

    if estimated_ms_at_1x <= 0:
        return TTS_SPEAKING_RATE

    desired_rate = estimated_ms_at_1x / available_ms
    # Clamp to [min, max]
    return max(TTS_SPEAKING_RATE, min(desired_rate, TTS_MAX_RATE))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_voice(
    elements: List[Dict[str, Any]],
    output_dir: str,
    duration_seconds: Optional[float] = None,
) -> str:
    """Generate a concatenated voice-over WAV for a list of scene elements.

    Each element is expected to have::

        {
            "text": "...",
            "style": "headline",
            "animation": "fade_in",
            "delay_ms": 0,
            "duration_ms": 600
        }

    The function:
    1. Preprocesses each element's text (symbol expansion, caps normalisation).
    2. Synthesises speech via Google Cloud TTS (Journey-D, LINEAR16, 48 kHz).
    3. Pads each clip with leading silence to match ``delay_ms`` offsets.
    4. Concatenates all clips into a single scene WAV file.

    Parameters
    ----------
    elements
        List of element dicts from a scene's ``"elements"`` array.
    output_dir
        Directory where the output WAV will be written.
    duration_seconds
        Optional target scene duration.  When provided the speaking rate
        is automatically increased (up to 1.5x) if text is likely to
        exceed the available time window.

    Returns
    -------
    str
        Absolute path to the concatenated WAV file.
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    client = texttospeech.TextToSpeechClient()

    # Total scene duration budget in ms (if provided)
    scene_budget_ms: Optional[float] = (
        duration_seconds * 1000.0 if duration_seconds is not None else None
    )

    pcm_chunks: List[bytes] = []
    running_offset_ms: float = 0.0

    for idx, element in enumerate(elements):
        raw_text: str = element.get("text", "")
        delay_ms: float = float(element.get("delay_ms", 0))
        elem_duration_ms: float = float(element.get("duration_ms", 600))

        # Preprocess -- may return None for skippable elements
        tts_text = preprocess_for_tts(raw_text)
        if tts_text is None:
            logger.debug("Skipping element %d (non-speakable): %r", idx, raw_text)
            # Still honour the delay gap for timing alignment
            gap_ms = delay_ms - running_offset_ms
            if gap_ms > 0:
                pcm_chunks.append(_make_silence(int(gap_ms)))
                running_offset_ms += gap_ms
            continue

        # Insert silence to reach the element's delay_ms position
        gap_ms = delay_ms - running_offset_ms
        if gap_ms > 0:
            pcm_chunks.append(_make_silence(int(gap_ms)))
            running_offset_ms += gap_ms

        # Determine speaking rate
        speaking_rate = _estimate_speaking_rate(tts_text, elem_duration_ms)
        logger.debug(
            "Element %d: rate=%.2f, budget=%.0fms, text=%r",
            idx, speaking_rate, elem_duration_ms, tts_text[:60],
        )

        # Synthesise
        wav_bytes = _synthesize_text(client, tts_text, speaking_rate)
        pcm_data = _wav_bytes_to_pcm(wav_bytes)

        pcm_chunks.append(pcm_data)
        clip_ms = _pcm_duration_ms(pcm_data)
        running_offset_ms += clip_ms

    # Concatenate all PCM chunks
    full_pcm = b"".join(pcm_chunks)

    # If a scene duration target was given, pad or trim to match
    if scene_budget_ms is not None:
        current_ms = _pcm_duration_ms(full_pcm)
        if current_ms < scene_budget_ms:
            # Pad with silence
            pad_ms = int(scene_budget_ms - current_ms)
            full_pcm += _make_silence(pad_ms)
        elif current_ms > scene_budget_ms:
            # Trim to budget (hard truncation -- rare if rates are correct)
            target_bytes = int(TTS_SAMPLE_RATE * scene_budget_ms / 1000) * _SAMPLE_WIDTH
            full_pcm = full_pcm[:target_bytes]
            logger.warning(
                "Trimmed audio from %.0fms to %.0fms",
                current_ms, scene_budget_ms,
            )

    # Write output
    output_path = os.path.join(output_dir, "scene_voice.wav")
    _write_wav(full_pcm, output_path)

    logger.info(
        "Voice generated: %s  (%.1fs)",
        output_path,
        _pcm_duration_ms(full_pcm) / 1000,
    )
    return output_path
