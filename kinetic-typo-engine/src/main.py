"""
Kinetic Typography Engine - FastAPI Service

Provides HTTP endpoints for generating kinetic typography videos:
  POST /generate       - Queue a new video generation job
  GET  /status/{id}    - Poll job progress
  POST /cancel/{id}    - Cancel a running job
  GET  /health         - Service health check

Each job runs as a background task through the full pipeline:
  script -> frames -> voice -> audio mix -> assemble -> upload
"""

from __future__ import annotations

import gc
import logging
import threading
import traceback
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from . import config

# ---------------------------------------------------------------------------
# Module-level imports for pipeline stages.
# These modules are not yet implemented; the imports are structured so that
# the service starts cleanly and each stage can be developed independently.
# ---------------------------------------------------------------------------
try:
    from .script_generator import generate_script
except ImportError:
    generate_script = None  # type: ignore[assignment]

try:
    from .frame_renderer import render_scene_frames
except ImportError:
    render_scene_frames = None  # type: ignore[assignment]

try:
    from .voice_generator import generate_voice
except ImportError:
    generate_voice = None  # type: ignore[assignment]

try:
    from .audio_generator import mix_audio
except ImportError:
    mix_audio = None  # type: ignore[assignment]

try:
    from .video_assembler import assemble_video
except ImportError:
    assemble_video = None  # type: ignore[assignment]

try:
    from .drive_uploader import upload_to_drive
except ImportError:
    upload_to_drive = None  # type: ignore[assignment]

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logger = logging.getLogger("kinetic-typo-engine")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# ---------------------------------------------------------------------------
# In-process job tracking
# ---------------------------------------------------------------------------
_active_jobs: Dict[str, Dict[str, Any]] = {}
_job_lock = threading.Lock()

# ---------------------------------------------------------------------------
# FastAPI Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Kinetic Typography Engine",
    version="0.1.0",
    description="Generates kinetic typography videos from topic data.",
)


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------
class GenerateRequest(BaseModel):
    """Payload accepted by POST /generate."""

    topic_id: str = Field(..., description="UUID of the topic row in Supabase")
    project_id: str = Field(..., description="UUID of the parent project")
    keyword: str = Field(..., description="Primary keyword / topic phrase")
    niche: str = Field(..., description="Niche name (e.g. 'US Credit Cards')")
    duration_seconds: int = Field(
        default=120,
        ge=10,
        le=7200,
        description="Target video duration in seconds",
    )
    style_dna: Optional[str] = Field(
        default=None,
        description="Locked visual identity string for this project",
    )
    supabase_url: Optional[str] = Field(
        default=None,
        description="Override Supabase URL (falls back to env)",
    )
    supabase_key: Optional[str] = Field(
        default=None,
        description="Override Supabase service-role key (falls back to env)",
    )
    drive_folder_id: Optional[str] = Field(
        default=None,
        description="Google Drive folder to upload the final video into",
    )


class GenerateResponse(BaseModel):
    """Returned by POST /generate."""

    job_id: str
    status: str


class JobStatus(BaseModel):
    """Returned by GET /status/{job_id}."""

    job_id: str
    status: str
    current_stage: Optional[str] = None
    current_scene: Optional[int] = None
    total_scenes: Optional[int] = None
    frames_rendered: Optional[int] = None
    progress_pct: Optional[float] = None
    error_message: Optional[str] = None
    video_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class HealthResponse(BaseModel):
    """Returned by GET /health."""

    status: str
    active_jobs: int


# ---------------------------------------------------------------------------
# Supabase Helpers
# ---------------------------------------------------------------------------

def _get_sb(req: GenerateRequest):
    """Resolve a Supabase client from the request or env."""
    return config.get_supabase_client(
        url=req.supabase_url,
        key=req.supabase_key,
    )


def _upsert_job(
    sb,
    job_id: str,
    *,
    status: str,
    current_stage: Optional[str] = None,
    current_scene: Optional[int] = None,
    total_scenes: Optional[int] = None,
    frames_rendered: Optional[int] = None,
    progress_pct: Optional[float] = None,
    error_message: Optional[str] = None,
    video_url: Optional[str] = None,
) -> None:
    """Write job progress to the ``kinetic_jobs`` table.

    Uses upsert so the first call creates the row and subsequent calls
    update it.  Silently logs errors rather than crashing the pipeline.
    """
    now = datetime.now(timezone.utc).isoformat()
    payload: Dict[str, Any] = {
        "id": job_id,
        "status": status,
        "updated_at": now,
    }
    if current_stage is not None:
        payload["current_stage"] = current_stage
    if current_scene is not None:
        payload["current_scene"] = current_scene
    if total_scenes is not None:
        payload["total_scenes"] = total_scenes
    if frames_rendered is not None:
        payload["frames_rendered"] = frames_rendered
    if progress_pct is not None:
        payload["progress_pct"] = round(progress_pct, 2)
    if error_message is not None:
        payload["error_message"] = error_message
    if video_url is not None:
        payload["video_url"] = video_url

    try:
        sb.table("kinetic_jobs").upsert(payload).execute()
    except Exception:
        logger.warning("Failed to write job progress to Supabase", exc_info=True)


def _read_job(sb, job_id: str) -> Optional[Dict[str, Any]]:
    """Read a single job row from ``kinetic_jobs``."""
    try:
        resp = (
            sb.table("kinetic_jobs")
            .select("*")
            .eq("id", job_id)
            .single()
            .execute()
        )
        return resp.data
    except Exception:
        logger.warning("Failed to read job %s from Supabase", job_id, exc_info=True)
        return None


# ---------------------------------------------------------------------------
# Background Pipeline Orchestrator
# ---------------------------------------------------------------------------

def _run_pipeline(job_id: str, req: GenerateRequest) -> None:
    """Execute the full kinetic-typography pipeline synchronously.

    Called from a background thread.  Writes progress to both the
    in-process ``_active_jobs`` dict and the Supabase ``kinetic_jobs``
    table after every meaningful state change.
    """
    sb = _get_sb(req)

    def _update(
        stage: str,
        *,
        scene: Optional[int] = None,
        total: Optional[int] = None,
        frames: Optional[int] = None,
        pct: Optional[float] = None,
        status: str = "processing",
    ) -> None:
        with _job_lock:
            if job_id in _active_jobs:
                _active_jobs[job_id].update(
                    {
                        "status": status,
                        "current_stage": stage,
                        "current_scene": scene,
                        "total_scenes": total,
                        "frames_rendered": frames,
                        "progress_pct": pct,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
        _upsert_job(
            sb,
            job_id,
            status=status,
            current_stage=stage,
            current_scene=scene,
            total_scenes=total,
            frames_rendered=frames,
            progress_pct=pct,
        )

    try:
        # ------------------------------------------------------------------
        # Stage 1: Script generation
        # ------------------------------------------------------------------
        _update("script_generation", pct=0.0)
        logger.info("[%s] Stage 1/6 - Generating script", job_id)

        if generate_script is None:
            raise RuntimeError(
                "script_generator module not implemented yet"
            )

        script_data = generate_script(
            keyword=req.keyword,
            niche=req.niche,
            duration_seconds=req.duration_seconds,
            style_dna=req.style_dna,
        )
        scenes = script_data.get("scenes", [])
        total_scenes = len(scenes)

        if total_scenes == 0:
            raise ValueError("Script generation returned zero scenes")

        _update("script_generation", total=total_scenes, pct=5.0)
        logger.info(
            "[%s] Script generated: %d scenes", job_id, total_scenes
        )

        # ------------------------------------------------------------------
        # Stage 2: Frame rendering (scene by scene with GC)
        # ------------------------------------------------------------------
        _update("frame_rendering", total=total_scenes, pct=10.0)
        logger.info("[%s] Stage 2/6 - Rendering frames", job_id)

        if render_scene_frames is None:
            raise RuntimeError(
                "frame_renderer module not implemented yet"
            )

        all_frame_paths: list[list[str]] = []
        cumulative_frames = 0

        for idx, scene in enumerate(scenes):
            # Check for cancellation
            with _job_lock:
                job_state = _active_jobs.get(job_id, {})
                if job_state.get("status") == "failed":
                    logger.info("[%s] Job cancelled, aborting", job_id)
                    return

            frame_paths = render_scene_frames(
                scene=scene,
                scene_index=idx,
                total_scenes=total_scenes,
                style_dna=req.style_dna,
            )
            all_frame_paths.append(frame_paths)
            cumulative_frames += len(frame_paths)

            # Progress: frames stage spans 10% - 50%
            pct = 10.0 + (40.0 * (idx + 1) / total_scenes)
            _update(
                "frame_rendering",
                scene=idx + 1,
                total=total_scenes,
                frames=cumulative_frames,
                pct=pct,
            )

            # Aggressive GC after each scene to keep memory in check
            gc.collect()

        logger.info(
            "[%s] Frames rendered: %d total across %d scenes",
            job_id,
            cumulative_frames,
            total_scenes,
        )

        # ------------------------------------------------------------------
        # Stage 3: Voice generation (TTS)
        # ------------------------------------------------------------------
        _update("voice_generation", total=total_scenes, pct=55.0)
        logger.info("[%s] Stage 3/6 - Generating voice", job_id)

        if generate_voice is None:
            raise RuntimeError(
                "voice_generator module not implemented yet"
            )

        voice_result = generate_voice(
            scenes=scenes,
            job_id=job_id,
        )
        voice_path = voice_result.get("audio_path", "")
        word_timestamps = voice_result.get("word_timestamps", [])

        _update("voice_generation", pct=65.0)
        logger.info("[%s] Voice generated: %s", job_id, voice_path)

        # ------------------------------------------------------------------
        # Stage 4: Audio mixing (voice + background music ducking)
        # ------------------------------------------------------------------
        _update("audio_mixing", pct=68.0)
        logger.info("[%s] Stage 4/6 - Mixing audio", job_id)

        if mix_audio is None:
            raise RuntimeError(
                "audio_generator module not implemented yet"
            )

        mixed_audio_path = mix_audio(
            voice_path=voice_path,
            job_id=job_id,
            duration_seconds=req.duration_seconds,
        )

        _update("audio_mixing", pct=72.0)
        logger.info("[%s] Audio mixed: %s", job_id, mixed_audio_path)

        # ------------------------------------------------------------------
        # Stage 5: Video assembly (frames + audio -> mp4)
        # ------------------------------------------------------------------
        _update("video_assembly", pct=75.0)
        logger.info("[%s] Stage 5/6 - Assembling video", job_id)

        if assemble_video is None:
            raise RuntimeError(
                "video_assembler module not implemented yet"
            )

        video_path = assemble_video(
            frame_dirs=all_frame_paths,
            audio_path=mixed_audio_path,
            job_id=job_id,
        )

        _update("video_assembly", pct=90.0)
        logger.info("[%s] Video assembled: %s", job_id, video_path)

        # ------------------------------------------------------------------
        # Stage 6: Upload to Google Drive
        # ------------------------------------------------------------------
        video_url: Optional[str] = None
        if req.drive_folder_id and upload_to_drive is not None:
            _update("uploading", pct=92.0)
            logger.info("[%s] Stage 6/6 - Uploading to Drive", job_id)

            upload_result = upload_to_drive(
                file_path=video_path,
                folder_id=req.drive_folder_id,
                title=f"kinetic_{req.keyword[:40]}_{job_id[:8]}.mp4",
            )
            video_url = upload_result.get("drive_url")

            logger.info("[%s] Uploaded: %s", job_id, video_url)
        else:
            logger.info(
                "[%s] Stage 6/6 - Skipping Drive upload (no folder_id or uploader)",
                job_id,
            )

        # ------------------------------------------------------------------
        # Done
        # ------------------------------------------------------------------
        with _job_lock:
            if job_id in _active_jobs:
                _active_jobs[job_id].update(
                    {
                        "status": "completed",
                        "current_stage": "completed",
                        "progress_pct": 100.0,
                        "video_url": video_url or video_path,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
        _upsert_job(
            sb,
            job_id,
            status="completed",
            current_stage="completed",
            progress_pct=100.0,
            video_url=video_url or video_path,
        )
        logger.info("[%s] Pipeline complete", job_id)

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        logger.error("[%s] Pipeline failed: %s", job_id, error_msg)

        with _job_lock:
            if job_id in _active_jobs:
                _active_jobs[job_id].update(
                    {
                        "status": "failed",
                        "error_message": error_msg[:4000],
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
        _upsert_job(
            sb,
            job_id,
            status="failed",
            error_message=error_msg[:4000],
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    """Queue a new kinetic typography video generation job.

    Creates a ``kinetic_jobs`` row in Supabase with status ``queued``,
    then launches the pipeline in a background thread so the HTTP
    response returns immediately.
    """
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Register in local tracker
    with _job_lock:
        _active_jobs[job_id] = {
            "status": "queued",
            "current_stage": None,
            "current_scene": None,
            "total_scenes": None,
            "frames_rendered": None,
            "progress_pct": 0.0,
            "error_message": None,
            "video_url": None,
            "created_at": now,
            "updated_at": now,
        }

    # Persist initial row in Supabase
    try:
        sb = _get_sb(req)
        sb.table("kinetic_jobs").insert(
            {
                "id": job_id,
                "topic_id": req.topic_id,
                "project_id": req.project_id,
                "keyword": req.keyword,
                "niche": req.niche,
                "duration_seconds": req.duration_seconds,
                "style_dna": req.style_dna,
                "drive_folder_id": req.drive_folder_id,
                "status": "queued",
                "progress_pct": 0.0,
                "created_at": now,
                "updated_at": now,
            }
        ).execute()
    except Exception:
        logger.warning(
            "Failed to insert kinetic_jobs row for %s", job_id, exc_info=True
        )

    # Launch the pipeline in a daemon thread so it doesn't block shutdown
    thread = threading.Thread(
        target=_run_pipeline,
        args=(job_id, req),
        name=f"kinetic-job-{job_id[:8]}",
        daemon=True,
    )
    thread.start()

    logger.info(
        "Job %s queued for keyword=%r niche=%r duration=%ds",
        job_id,
        req.keyword,
        req.niche,
        req.duration_seconds,
    )
    return GenerateResponse(job_id=job_id, status="queued")


@app.get("/status/{job_id}", response_model=JobStatus)
async def status(job_id: str) -> JobStatus:
    """Return current progress of a generation job.

    Reads from the in-process cache first (fastest path for active jobs).
    Falls back to Supabase for completed/historical jobs.
    """
    # Try local cache
    with _job_lock:
        local = _active_jobs.get(job_id)
    if local:
        return JobStatus(
            job_id=job_id,
            status=local.get("status", "unknown"),
            current_stage=local.get("current_stage"),
            current_scene=local.get("current_scene"),
            total_scenes=local.get("total_scenes"),
            frames_rendered=local.get("frames_rendered"),
            progress_pct=local.get("progress_pct"),
            error_message=local.get("error_message"),
            video_url=local.get("video_url"),
            created_at=local.get("created_at"),
            updated_at=local.get("updated_at"),
        )

    # Fall back to Supabase
    try:
        sb = config.get_supabase_client()
        row = _read_job(sb, job_id)
    except ValueError:
        row = None

    if row is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return JobStatus(
        job_id=job_id,
        status=row.get("status", "unknown"),
        current_stage=row.get("current_stage"),
        current_scene=row.get("current_scene"),
        total_scenes=row.get("total_scenes"),
        frames_rendered=row.get("frames_rendered"),
        progress_pct=row.get("progress_pct"),
        error_message=row.get("error_message"),
        video_url=row.get("video_url"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


@app.post("/cancel/{job_id}")
async def cancel(job_id: str) -> Dict[str, str]:
    """Cancel a running job.

    Sets the job status to ``failed`` with an error message indicating
    user cancellation.  The pipeline checks for this flag between scenes
    and will abort gracefully.
    """
    cancelled = False
    with _job_lock:
        if job_id in _active_jobs:
            _active_jobs[job_id]["status"] = "failed"
            _active_jobs[job_id]["error_message"] = "Cancelled by user"
            _active_jobs[job_id]["updated_at"] = datetime.now(
                timezone.utc
            ).isoformat()
            cancelled = True

    # Also persist to Supabase so the dashboard sees the cancellation
    try:
        sb = config.get_supabase_client()
        _upsert_job(
            sb,
            job_id,
            status="failed",
            error_message="Cancelled by user",
        )
    except ValueError:
        pass  # no Supabase configured, local cancel is enough

    if not cancelled:
        # Check Supabase in case the job finished and was evicted from memory
        try:
            sb = config.get_supabase_client()
            row = _read_job(sb, job_id)
            if row is None:
                raise HTTPException(
                    status_code=404, detail=f"Job {job_id} not found"
                )
            # Update in DB even if not in local cache
        except ValueError:
            raise HTTPException(
                status_code=404, detail=f"Job {job_id} not found"
            )

    return {"job_id": job_id, "status": "cancelled"}


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Service health check.

    Returns ``ok`` and the count of jobs currently tracked in memory
    (queued + processing).
    """
    with _job_lock:
        active = sum(
            1
            for j in _active_jobs.values()
            if j.get("status") in ("queued", "processing")
        )
    return HealthResponse(status="ok", active_jobs=active)
