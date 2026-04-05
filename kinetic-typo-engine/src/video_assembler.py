"""
Kinetic Typography Engine - Video Assembler

Assembles rendered JPEG frames + audio into video clips using FFmpeg.
Supports per-scene clip assembly and multi-clip concatenation for
long-form output.
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# FFmpeg binary discovery
# ---------------------------------------------------------------------------

def _find_ffmpeg() -> str:
    """
    Locate the FFmpeg binary.

    Search order:
      1. ``FFMPEG_PATH`` environment variable
      2. ``ffmpeg`` on the system PATH (via ``shutil.which``)
      3. ``imageio_ffmpeg.get_ffmpeg_exe()`` as a bundled fallback

    Returns
    -------
    str
        Absolute path to the FFmpeg executable.

    Raises
    ------
    FileNotFoundError
        If no FFmpeg binary can be found.
    """
    # 1. Explicit env override
    env_path = os.getenv("FFMPEG_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    # 2. System PATH
    system_path = shutil.which("ffmpeg")
    if system_path:
        return system_path

    # 3. imageio-ffmpeg bundled binary
    try:
        import imageio_ffmpeg
        bundled = imageio_ffmpeg.get_ffmpeg_exe()
        if bundled and os.path.isfile(bundled):
            return bundled
    except ImportError:
        pass

    raise FileNotFoundError(
        "FFmpeg not found.  Install FFmpeg, set FFMPEG_PATH, "
        "or pip install imageio-ffmpeg."
    )


def _run_ffmpeg(cmd: List[str], description: str) -> None:
    """
    Execute an FFmpeg command list and raise on failure.

    Parameters
    ----------
    cmd : list[str]
        Full argument list (e.g. ``["ffmpeg", "-y", ...]``).
    description : str
        Human-readable label for log / error messages.
    """
    logger.info("Running %s: %s", description, " ".join(cmd))
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        logger.error(
            "%s failed (rc=%d):\nstdout: %s\nstderr: %s",
            description,
            result.returncode,
            result.stdout[-2000:] if result.stdout else "",
            result.stderr[-2000:] if result.stderr else "",
        )
        raise RuntimeError(
            description + " failed (rc=" + str(result.returncode) + "): "
            + (result.stderr[-500:] if result.stderr else "no stderr")
        )
    logger.info("%s completed successfully.", description)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def assemble_video(
    frames_dir: str,
    audio_path: str,
    output_path: str,
    *,
    low_memory: bool = False,
) -> str:
    """
    Assemble numbered JPEG frames + an audio file into a single MP4.

    Frames must be named ``frame_%06d.jpg`` (i.e. ``frame_000000.jpg``,
    ``frame_000001.jpg``, ...).

    Parameters
    ----------
    frames_dir : str
        Directory containing the numbered frame JPEGs.
    audio_path : str
        Path to the audio file (WAV, MP3, AAC, etc.).
    output_path : str
        Destination ``.mp4`` path.
    low_memory : bool
        When *True*, add ``-threads 1 -filter_threads 1`` to reduce peak
        memory usage on constrained systems.

    Returns
    -------
    str
        The *output_path* on success.
    """
    ffmpeg = _find_ffmpeg()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    frame_pattern = os.path.join(frames_dir, "frame_%06d.jpg")

    cmd: List[str] = [ffmpeg, "-y"]

    if low_memory:
        cmd.extend(["-threads", "1", "-filter_threads", "1"])

    cmd.extend([
        "-framerate", "30",
        "-i", frame_pattern,
        "-i", audio_path,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        output_path,
    ])

    _run_ffmpeg(cmd, "assemble_video")
    return output_path


def assemble_scene_clip(
    scene_frames_dir: str,
    scene_audio_path: str,
    output_path: str,
    *,
    low_memory: bool = False,
) -> str:
    """
    Assemble one scene's frames and audio into a single clip.

    This is a convenience wrapper around :func:`assemble_video` with
    identical semantics, intended for per-scene clip generation before
    final concatenation.

    Parameters
    ----------
    scene_frames_dir : str
        Directory containing frame JPEGs for this scene.
    scene_audio_path : str
        Audio file for this scene.
    output_path : str
        Destination ``.mp4`` path for the scene clip.
    low_memory : bool
        Reduce threading for constrained systems.

    Returns
    -------
    str
        The *output_path* on success.
    """
    return assemble_video(
        frames_dir=scene_frames_dir,
        audio_path=scene_audio_path,
        output_path=output_path,
        low_memory=low_memory,
    )


def concat_clips(
    clip_paths: List[str],
    output_path: str,
    *,
    low_memory: bool = False,
) -> str:
    """
    Concatenate multiple scene clips into a single video using the
    FFmpeg concat demuxer.

    All clips must share the same codec/resolution/framerate (which
    they will if produced by :func:`assemble_scene_clip`).

    Parameters
    ----------
    clip_paths : list[str]
        Ordered list of ``.mp4`` clip paths to join.
    output_path : str
        Destination path for the concatenated video.
    low_memory : bool
        Reduce threading for constrained systems.

    Returns
    -------
    str
        The *output_path* on success.

    Raises
    ------
    ValueError
        If *clip_paths* is empty.
    """
    if not clip_paths:
        raise ValueError("clip_paths must contain at least one clip.")

    ffmpeg = _find_ffmpeg()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    # Write a temporary concat list file
    concat_fd, concat_list_path = tempfile.mkstemp(
        suffix=".txt", prefix="concat_"
    )
    try:
        with os.fdopen(concat_fd, "w", encoding="utf-8") as f:
            for clip in clip_paths:
                # FFmpeg concat requires forward slashes and escaped quotes
                safe_path = os.path.abspath(clip).replace("\\", "/")
                f.write("file '" + safe_path + "'\n")

        cmd: List[str] = [ffmpeg, "-y"]

        if low_memory:
            cmd.extend(["-threads", "1", "-filter_threads", "1"])

        cmd.extend([
            "-f", "concat",
            "-safe", "0",
            "-i", concat_list_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-ar", "48000",
            "-ac", "1",
            "-b:a", "192k",
            "-movflags", "+faststart",
            output_path,
        ])

        _run_ffmpeg(cmd, "concat_clips")
    finally:
        # Clean up the temporary concat list
        try:
            os.unlink(concat_list_path)
        except OSError:
            pass

    return output_path
