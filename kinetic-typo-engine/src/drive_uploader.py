"""
Kinetic Typography Engine - Google Drive Uploader

Uploads generated video files to Google Drive using a service account.
Supports resumable uploads for large files (>5 MB) and sets files as
viewable by anyone with the link.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Threshold for switching to resumable upload (bytes)
_RESUMABLE_THRESHOLD: int = 5 * 1024 * 1024  # 5 MB


def _build_drive_service(credentials_path: Optional[str] = None) -> Any:
    """
    Build and return an authenticated Google Drive API v3 service object.

    Parameters
    ----------
    credentials_path : str or None
        Path to a service account JSON key file.  Falls back to the
        ``GOOGLE_APPLICATION_CREDENTIALS`` environment variable.

    Returns
    -------
    googleapiclient.discovery.Resource
        An authorised Drive API service.

    Raises
    ------
    FileNotFoundError
        If no credentials file can be located.
    """
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    creds_file = credentials_path or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_file:
        raise FileNotFoundError(
            "No credentials path provided and GOOGLE_APPLICATION_CREDENTIALS "
            "is not set."
        )
    if not os.path.isfile(creds_file):
        raise FileNotFoundError(
            "Credentials file not found: " + str(creds_file)
        )

    scopes = ["https://www.googleapis.com/auth/drive"]
    credentials = service_account.Credentials.from_service_account_file(
        creds_file, scopes=scopes,
    )
    service = build("drive", "v3", credentials=credentials, cache_discovery=False)
    return service


def _set_public_permission(service: Any, file_id: str) -> None:
    """
    Grant "anyone with the link" read access to a Drive file.
    """
    try:
        service.permissions().create(
            fileId=file_id,
            body={"type": "anyone", "role": "reader"},
            fields="id",
        ).execute()
        logger.debug("Public permission set for file %s", file_id)
    except Exception:
        logger.warning(
            "Failed to set public permission for file %s", file_id,
            exc_info=True,
        )


def upload_to_drive(
    file_path: str,
    folder_id: str,
    filename: Optional[str] = None,
    credentials_path: Optional[str] = None,
) -> Optional[Dict[str, str]]:
    """
    Upload a file to Google Drive and make it viewable by anyone with the link.

    Uses a resumable upload for files larger than 5 MB.

    Parameters
    ----------
    file_path : str
        Local path to the file to upload.
    folder_id : str
        Google Drive folder ID to upload into.
    filename : str or None
        Name for the file on Drive.  Defaults to the local filename.
    credentials_path : str or None
        Path to a service account JSON key file.  Falls back to the
        ``GOOGLE_APPLICATION_CREDENTIALS`` environment variable.

    Returns
    -------
    dict or None
        On success: ``{"id": "<file-id>", "webViewLink": "<url>"}``.
        On failure: ``None`` (the error is logged).
    """
    try:
        from googleapiclient.http import MediaFileUpload
    except ImportError:
        logger.error(
            "google-api-python-client is not installed.  "
            "pip install google-api-python-client google-auth"
        )
        return None

    if not os.path.isfile(file_path):
        logger.error("File not found: %s", file_path)
        return None

    resolved_name = filename or os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    resumable = file_size > _RESUMABLE_THRESHOLD

    logger.info(
        "Uploading %s (%s bytes, resumable=%s) to folder %s",
        resolved_name, file_size, resumable, folder_id,
    )

    try:
        service = _build_drive_service(credentials_path)
    except Exception:
        logger.error("Failed to build Drive service", exc_info=True)
        return None

    # Guess MIME type
    mime_type = _guess_mime_type(file_path)

    file_metadata: Dict[str, Any] = {
        "name": resolved_name,
        "parents": [folder_id],
    }

    media = MediaFileUpload(
        file_path,
        mimetype=mime_type,
        resumable=resumable,
    )

    try:
        if resumable:
            # Resumable (chunked) upload
            request = service.files().create(
                body=file_metadata,
                media_body=media,
                fields="id, webViewLink",
            )
            response = None
            while response is None:
                status, response = request.next_chunk()
                if status:
                    logger.debug(
                        "Upload progress: %d%%",
                        int(status.progress() * 100),
                    )
        else:
            # Simple upload
            response = service.files().create(
                body=file_metadata,
                media_body=media,
                fields="id, webViewLink",
            ).execute()

        file_id: str = response.get("id", "")
        web_link: str = response.get("webViewLink", "")

        # Make viewable by anyone with the link
        _set_public_permission(service, file_id)

        logger.info(
            "Upload complete: id=%s  link=%s", file_id, web_link,
        )
        return {"id": file_id, "webViewLink": web_link}

    except Exception:
        logger.error("Drive upload failed for %s", file_path, exc_info=True)
        return None


def _guess_mime_type(file_path: str) -> str:
    """
    Return a MIME type string based on the file extension.
    Falls back to ``application/octet-stream``.
    """
    ext = Path(file_path).suffix.lower()
    mime_map: Dict[str, str] = {
        ".mp4": "video/mp4",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".aac": "audio/aac",
        ".m4a": "audio/mp4",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".json": "application/json",
        ".txt": "text/plain",
        ".srt": "text/plain",
    }
    return mime_map.get(ext, "application/octet-stream")
