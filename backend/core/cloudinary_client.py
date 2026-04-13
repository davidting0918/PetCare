"""
Cloudinary client wrapper.

Provides a single async helper, ``upload_image``, that the user / pet / food
services use to push uploaded photo bytes to Cloudinary instead of writing
them to local disk. The Cloudinary Python SDK is synchronous, so the actual
upload call is delegated to a thread pool via
``starlette.concurrency.run_in_threadpool`` to avoid blocking the FastAPI
event loop.

Configuration is read from environment variables at import time:

* ``CLOUDINARY_CLOUD_NAME``
* ``CLOUDINARY_API_KEY``
* ``CLOUDINARY_API_SECRET``

If any of those are missing the SDK is left unconfigured and the first
``upload_image`` call will raise an HTTP 500 with a clear "not configured"
message. This keeps unit tests and local imports working without env vars
while still failing loudly the moment a real upload is attempted.
"""

import logging
import os
import time
from typing import Any, Dict

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, status
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)


def _configure_cloudinary() -> None:
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    if not (cloud_name and api_key and api_secret):
        return
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )


_configure_cloudinary()


async def upload_image(
    content: bytes,
    folder: str,
    public_id: str,
    content_type: str,
) -> Dict[str, Any]:
    """
    Upload raw bytes to Cloudinary.

    Args:
        content: The image bytes to upload.
        folder: Cloudinary folder path (e.g. ``"petcare/user_photos"``).
        public_id: Cloudinary public_id, typically the entity id, so a
            re-upload overwrites the existing asset instead of accumulating
            orphans.
        content_type: The MIME type of the original upload, kept here for
            symmetry with the service-side return shape (Cloudinary infers
            its own format from the bytes, so this is not forwarded).

    Returns:
        Dict with the fields the services need to build their response:
        ``secure_url``, ``public_id``, ``bytes``, ``format``.

    Raises:
        HTTPException 500 if Cloudinary is not configured or the upload
        call fails for any reason. The original exception message is
        included in the detail.
    """
    if not cloudinary.config().cloud_name:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cloudinary is not configured (missing CLOUDINARY_* env vars)",
        )

    def _do_upload() -> Dict[str, Any]:
        return cloudinary.uploader.upload(
            content,
            folder=folder,
            public_id=public_id,
            overwrite=True,
            invalidate=True,
            resource_type="image",
        )

    start = time.perf_counter()
    try:
        result = await run_in_threadpool(_do_upload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cloudinary upload failed: {exc}",
        )
    finally:
        duration_ms = (time.perf_counter() - start) * 1000.0
        try:
            from backend.core.metrics import metrics_collector

            metrics_collector.record_external_call("cloudinary", duration_ms)
        except Exception:
            pass

    return {
        "secure_url": result["secure_url"],
        "public_id": result["public_id"],
        "bytes": result.get("bytes", len(content)),
        "format": result.get("format", ""),
    }
