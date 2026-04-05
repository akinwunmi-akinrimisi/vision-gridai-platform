"""
Kinetic Typography Engine -- Audio Generator

Selects background music from the Supabase ``music_library`` table,
mixes it under narration with voice-activated ducking, and exports
the final audio as 48 kHz WAV.
"""

from __future__ import annotations

import logging
import math
import os
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydub import AudioSegment

from config import (
    DUCK_DB,
    DUCK_FADE_MS,
    DUCK_RMS_WINDOW_MS,
    TTS_SAMPLE_RATE,
    get_supabase_client,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_EXPORT_SAMPLE_RATE: int = TTS_SAMPLE_RATE   # 48 kHz
_EXPORT_CHANNELS: int = 1
_EXPORT_SAMPLE_WIDTH: int = 2                 # 16-bit


# ---------------------------------------------------------------------------
# Music Selection
# ---------------------------------------------------------------------------

def select_music(
    mood_tags: List[str],
    duration_seconds: float,
    supabase_client: Optional[Any] = None,
) -> Optional[str]:
    """Query the ``music_library`` table for a track matching *mood_tags*.

    The function looks for rows where at least one of the provided mood
    tags appears in the ``mood_tags`` column (a Postgres ``text[]`` array).
    Among the matches it prefers tracks whose duration is closest to (and
    ideally >= ) the requested *duration_seconds*.

    Parameters
    ----------
    mood_tags
        One or more mood/genre descriptors, e.g. ``["upbeat", "corporate"]``.
    duration_seconds
        Target music duration in seconds.
    supabase_client
        Optional pre-initialised Supabase client.  If ``None``, one will be
        created from environment variables via ``config.get_supabase_client()``.

    Returns
    -------
    str or None
        Absolute path (or URL) to the selected music file, or ``None`` if
        nothing matched.
    """
    if not mood_tags:
        logger.info("No mood tags provided -- skipping music selection.")
        return None

    try:
        client = supabase_client or get_supabase_client()
    except ValueError:
        logger.warning(
            "Supabase credentials not configured -- cannot query music_library."
        )
        return None

    # Build an "overlaps" filter:  mood_tags column && ARRAY[tag1, tag2, ...]
    # Supabase PostgREST uses `ov.` for array-overlap filtering.
    tags_csv = ",".join(f"{{{t}}}" for t in mood_tags)
    try:
        response = (
            client.table("music_library")
            .select("id, file_path, file_url, duration_seconds, mood_tags")
            .filter("mood_tags", "ov", f"{{{','.join(mood_tags)}}}")
            .filter("is_active", "eq", True)
            .execute()
        )
    except Exception:
        logger.exception("music_library query failed")
        return None

    rows: List[Dict[str, Any]] = response.data or []
    if not rows:
        logger.info("No music found for mood_tags=%s", mood_tags)
        return None

    # Pick the best match: prefer tracks >= duration, sorted by closeness
    def _sort_key(row: Dict[str, Any]) -> tuple:
        track_dur = row.get("duration_seconds") or 0.0
        delta = track_dur - duration_seconds
        # (prefer positive delta = track is long enough, then smallest abs delta)
        return (0 if delta >= 0 else 1, abs(delta))

    rows.sort(key=_sort_key)
    best = rows[0]

    # Return file_path if it exists on disk; otherwise file_url
    file_path = best.get("file_path")
    if file_path and os.path.isfile(file_path):
        logger.info("Selected music: %s (%.1fs)", file_path, best.get("duration_seconds", 0))
        return file_path

    file_url = best.get("file_url")
    if file_url:
        logger.info("Selected music URL: %s (%.1fs)", file_url, best.get("duration_seconds", 0))
        return file_url

    logger.warning("Music row %s has neither file_path nor file_url.", best.get("id"))
    return None


# ---------------------------------------------------------------------------
# Voice-region Detection
# ---------------------------------------------------------------------------

def _detect_voice_regions(
    audio: AudioSegment,
    rms_window_ms: int = DUCK_RMS_WINDOW_MS,
    silence_threshold_db: float = -40.0,
) -> List[bool]:
    """Analyse *audio* and return a per-window boolean mask.

    ``True`` = voice active (RMS above threshold), ``False`` = silence.

    Parameters
    ----------
    audio
        A pydub ``AudioSegment`` of the narration track.
    rms_window_ms
        Analysis window size in milliseconds (default 20 ms).
    silence_threshold_db
        dBFS below which a window is considered silent.

    Returns
    -------
    list[bool]
        One entry per ``rms_window_ms`` chunk of the audio.
    """
    num_windows = max(1, math.ceil(len(audio) / rms_window_ms))
    regions: List[bool] = []

    for i in range(num_windows):
        start_ms = i * rms_window_ms
        end_ms = min(start_ms + rms_window_ms, len(audio))
        chunk = audio[start_ms:end_ms]

        if chunk.rms == 0:
            regions.append(False)
        else:
            chunk_dbfs = chunk.dBFS
            regions.append(chunk_dbfs > silence_threshold_db)

    return regions


def _smooth_regions(
    regions: List[bool],
    fade_windows: int,
) -> List[float]:
    """Convert a boolean voice mask into a smoothed gain-reduction curve.

    Uses a rolling average over ``fade_windows`` entries to create gradual
    transitions between ducked and full-volume segments.

    Returns
    -------
    list[float]
        Per-window gain factor in [0.0, 1.0] where 0.0 = full duck and
        1.0 = no duck.
    """
    if fade_windows <= 0:
        return [0.0 if v else 1.0 for v in regions]

    n = len(regions)
    # Convert bools to floats: voice-active=0.0 (duck), silent=1.0 (full)
    raw = [0.0 if v else 1.0 for v in regions]

    smoothed: List[float] = []
    for i in range(n):
        lo = max(0, i - fade_windows)
        hi = min(n, i + fade_windows + 1)
        window = raw[lo:hi]
        smoothed.append(sum(window) / len(window))

    return smoothed


# ---------------------------------------------------------------------------
# Audio Mixing
# ---------------------------------------------------------------------------

def mix_final_audio(
    narration_path: str,
    music_path: Optional[str],
    output_path: str,
    duck_db: float = DUCK_DB,
    fade_ms: int = DUCK_FADE_MS,
    rms_window_ms: int = DUCK_RMS_WINDOW_MS,
) -> str:
    """Mix narration with background music using voice-activated ducking.

    If *music_path* is ``None``, the narration is copied to *output_path*
    unchanged (still re-exported as 48 kHz WAV for format consistency).

    Parameters
    ----------
    narration_path
        Path to the narration WAV (produced by ``voice_generator``).
    music_path
        Path to the background music file (any format pydub supports),
        or ``None`` to skip music.
    output_path
        Where to write the final mixed WAV.
    duck_db
        Decibel reduction applied to music during voice regions.
        Default ``-7`` dB.
    fade_ms
        Rolling-average window for smoothing duck transitions.
        Default ``50`` ms.
    rms_window_ms
        RMS analysis window for voice detection.
        Default ``20`` ms.

    Returns
    -------
    str
        Absolute path to the exported WAV file (same as *output_path*).
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    narration = AudioSegment.from_file(narration_path)

    # Normalise narration to target sample rate / channels
    narration = narration.set_frame_rate(_EXPORT_SAMPLE_RATE)
    narration = narration.set_channels(_EXPORT_CHANNELS)
    narration = narration.set_sample_width(_EXPORT_SAMPLE_WIDTH)

    if music_path is None:
        logger.info("No music track -- exporting narration only.")
        narration.export(output_path, format="wav")
        return output_path

    # Load music
    music = AudioSegment.from_file(music_path)
    music = music.set_frame_rate(_EXPORT_SAMPLE_RATE)
    music = music.set_channels(_EXPORT_CHANNELS)
    music = music.set_sample_width(_EXPORT_SAMPLE_WIDTH)

    # Loop or trim music to match narration length
    narration_len = len(narration)
    if len(music) < narration_len:
        repeats = math.ceil(narration_len / len(music))
        music = music * repeats
    music = music[:narration_len]

    # Detect voice regions in the narration
    voice_mask = _detect_voice_regions(narration, rms_window_ms=rms_window_ms)

    # Smooth for gradual fade transitions
    fade_windows = max(1, fade_ms // rms_window_ms) if rms_window_ms > 0 else 1
    gain_curve = _smooth_regions(voice_mask, fade_windows)

    # Apply per-window gain reduction to music
    ducked_chunks: List[AudioSegment] = []
    num_windows = len(gain_curve)

    for i in range(num_windows):
        start_ms = i * rms_window_ms
        end_ms = min(start_ms + rms_window_ms, narration_len)
        music_chunk = music[start_ms:end_ms]

        # gain_curve[i] in [0.0, 1.0]:
        #   0.0 = voice active => apply full duck_db reduction
        #   1.0 = silence      => no reduction
        reduction_db = duck_db * (1.0 - gain_curve[i])
        if reduction_db != 0.0:
            music_chunk = music_chunk + reduction_db

        ducked_chunks.append(music_chunk)

    ducked_music = sum(ducked_chunks[1:], ducked_chunks[0]) if ducked_chunks else AudioSegment.silent(0)

    # Overlay ducked music under narration
    mixed = narration.overlay(ducked_music)

    # Export
    mixed.export(output_path, format="wav")

    logger.info(
        "Mixed audio exported: %s  (%.1fs, duck=%.1fdB)",
        output_path, len(mixed) / 1000.0, duck_db,
    )
    return output_path
