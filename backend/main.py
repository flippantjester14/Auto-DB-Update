"""FastAPI application for RedWing DB Automation.

All routes: webhook, submissions CRUD, file downloads, waypoint parsing,
resolve preview, and approval pipeline.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from config import Settings, get_settings
from auth import get_current_user, require_role
from drive_downloader import download_submission_files
from excel_updater import ExcelUpdater
from models import (
    ApprovalRequest,
    DownloadResult,
    DownloadStatus,
    PipelineResult,
    ResolvePreviewResponse,
    ReviewStateUpdateRequest,
    StatusUpdateRequest,
    SubmissionPayload,
    SubmissionResponse,
    SubmissionStatus,
    WaypointFileResponse,
)
from pipeline import run_approval_pipeline
from submission_store import SubmissionStore
from waypoint_parser import parse_waypoints_file

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="RedWing DB Automation",
    description="Backend for automating RedWing flight database updates from Google Form submissions.",
    version="1.0.0",
)


# Configure CORS at module level
_settings_for_cors = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings_for_cors.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Dependencies ─────────────────────────────────────────────────────────────

_store: Optional[SubmissionStore] = None


def get_store() -> SubmissionStore:
    global _store
    if _store is None:
        settings = get_settings()
        _store = SubmissionStore(settings.SUBMISSIONS_DB_PATH)
    return _store


def init_app() -> None:
    """Initialize the app on startup."""
    settings = get_settings()
    # Ensure submission store is ready
    get_store()
    logger.info("RedWing DB Automation backend started")
    logger.info(f"  Repo path: {settings.repo_path}")
    logger.info(f"  Excel: {settings.excel_path}")


@app.on_event("startup")
async def startup_event():
    init_app()


# ── Auth Helper ──────────────────────────────────────────────────────────────

def verify_webhook_secret(
    x_webhook_secret: Optional[str] = Header(None),
    settings: Settings = Depends(get_settings),
) -> None:
    if not x_webhook_secret or x_webhook_secret != settings.WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing webhook secret")


# ── 1. WEBHOOK — Receive New Submissions ─────────────────────────────────────

@app.post("/webhook/new-submission", status_code=200)
async def webhook_new_submission(
    payload: SubmissionPayload,
    _auth: None = Depends(verify_webhook_secret),
    store: SubmissionStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
):
    """Receive a new submission from Google Apps Script webhook."""
    # Check for duplicate in Excel
    status = SubmissionStatus.PENDING
    
    if settings.excel_path.exists():
        updater = ExcelUpdater(settings.excel_path)
        try:
            updater.open()
            if updater.is_duplicate_submission(payload):
                status = SubmissionStatus.DUPLICATE
                logger.info(f"Duplicate submission detected - auto-flagging as {status}")
        except Exception as e:
            logger.error(f"Error checking for duplicate: {e}")
        finally:
            updater.close()

    submission_id = store.add_submission(payload, status=status)
    logger.info(f"New submission received: {submission_id} (Status: {status})")
    return {"submission_id": submission_id, "status": status.value}


# ── 2. SUBMISSIONS API ──────────────────────────────────────────────────────

@app.get("/submissions", response_model=list[SubmissionResponse])
async def list_submissions(store: SubmissionStore = Depends(get_store), user: dict = Depends(get_current_user)):
    """List all submissions with their status."""
    return store.list_submissions()


@app.get("/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: str,
    store: SubmissionStore = Depends(get_store),
    user: dict = Depends(get_current_user)):
    """Get full details of one submission."""
    sub = store.get_submission(submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub


@app.patch("/submissions/{submission_id}/review-state")
async def update_review_state(
    submission_id: str,
    request: ReviewStateUpdateRequest,
    store: SubmissionStore = Depends(get_store),
    user: dict = Depends(require_role('operator'))):
    """Update verification flags for a submission."""
    affected = store.update_review_state(
        submission_id,
        waypoint_verified=request.waypoint_verified,
        id_resolution_reviewed=request.id_resolution_reviewed,
        user_uid=user['uid']
    )
    if not affected:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"status": "ok"}


@app.patch("/submissions/{submission_id}/status")
async def update_submission_status(
    submission_id: str,
    body: StatusUpdateRequest,
    store: SubmissionStore = Depends(get_store),
    user: dict = Depends(require_role('operator'))):
    """Update submission status (e.g., reject)."""
    sub = store.get_submission(submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    if body.status not in (SubmissionStatus.REJECTED, SubmissionStatus.PENDING):
        raise HTTPException(
            status_code=400,
            detail="Can only set status to 'rejected' or 'pending' via this endpoint",
        )

    store.update_status(submission_id, body.status, body.reason, user_uid=user['uid'])
    return {"submission_id": submission_id, "status": body.status.value}


# ── 3. FILE DOWNLOAD ────────────────────────────────────────────────────────

@app.patch("/submissions/{submission_id}/mark-duplicate", response_model=SubmissionResponse)
async def mark_as_duplicate(
    submission_id: str,
    store: SubmissionStore = Depends(get_store),
    user: dict = Depends(require_role('operator'))):
    """Manually flag a submission as a duplicate."""
    sub = store.get_submission(submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    success = store.update_status(submission_id, SubmissionStatus.DUPLICATE, user_uid=user['uid'])
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update status")
    
    return store.get_submission(submission_id)


@app.post("/submissions/{submission_id}/download-files", response_model=SubmissionResponse)
async def download_files(
    submission_id: str,
    store: SubmissionStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
    user: dict = Depends(require_role('operator'))):
    """Download waypoints and image files from Google Drive."""
    sub = store.get_submission(submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    store.update_download_status(submission_id, DownloadStatus.IN_PROGRESS, user_uid=user['uid'])

    result = await download_submission_files(
        sub.payload, settings.repo_path, settings.GNOME_GOA_ACCOUNT_PATH
    )

    if result.success:
        store.update_download_status(
            submission_id,
            DownloadStatus.COMPLETED,
            {
                "mission_file": result.mission_file_path,
                "elevation_image": result.elevation_image_path,
                "route_image": result.route_image_path,
            },
            user_uid=user['uid']
        )
    else:
        store.update_download_status(
            submission_id, 
            DownloadStatus.FAILED, 
            error_detail=result.error,
            user_uid=user['uid']
        )

    return store.get_submission(submission_id)


# ── 4. WAYPOINT DATA ────────────────────────────────────────────────────────

@app.get(
    "/submissions/{submission_id}/waypoint-data",
    response_model=WaypointFileResponse,
)
async def get_waypoint_data(
    submission_id: str,
    store: SubmissionStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
    user: dict = Depends(get_current_user)):
    """Parse the downloaded .waypoints file and return structured JSON."""
    sub = store.get_submission(submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    mission_path = settings.missions_dir / sub.payload.mission_filename
    if not mission_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Mission file not downloaded yet: {sub.payload.mission_filename}",
        )

    try:
        return parse_waypoints_file(mission_path)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse waypoints: {e}")


# ── RESOLVE PREVIEW ─────────────────────────────────────────────────────────

@app.get(
    "/submissions/{submission_id}/resolve-preview",
    response_model=ResolvePreviewResponse,
)
async def resolve_preview(
    submission_id: str,
    store: SubmissionStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
    user: dict = Depends(get_current_user)):
    """Dry-run of Excel resolution pipeline (Steps 2–8). No writes."""
    sub = store.get_submission(submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    if not settings.excel_path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Excel file not found: {settings.excel_path}",
        )

    updater = ExcelUpdater(settings.excel_path)
    try:
        updater.open()
        preview = updater.resolve_preview(sub.payload)
        return preview
    finally:
        updater.close()


# ── 5. APPROVE ──────────────────────────────────────────────────────────────

@app.post("/submissions/{submission_id}/approve", response_model=PipelineResult)
async def approve_submission(
    submission_id: str,
    body: ApprovalRequest,
    store: SubmissionStore = Depends(get_store),
    settings: Settings = Depends(get_settings),
    user: dict = Depends(require_role('operator'))):
    """Run the full approval pipeline with confirmation gate."""
    sub = store.get_submission(submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    if sub.status == SubmissionStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Submission already approved")

    if sub.status == SubmissionStatus.REJECTED:
        raise HTTPException(status_code=400, detail="Submission was rejected")

    # Run pre-check for confirmations
    if not settings.excel_path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Excel file not found: {settings.excel_path}",
        )

    updater = ExcelUpdater(settings.excel_path)
    try:
        updater.open()
        preview = updater.resolve_preview(sub.payload)
    finally:
        updater.close()

    # Validate confirmations
    from pipeline import validate_confirmations

    validation_error = validate_confirmations(preview, body.confirmed_new_entities)
    if validation_error:
        raise HTTPException(status_code=403, detail=validation_error)

    # Run the full pipeline
    result = run_approval_pipeline(submission_id, body, store, settings)

    if not result.success:
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline failed at step {result.error_step}: {result.error_detail}",
        )

    return result


# ── STATS ────────────────────────────────────────────────────────────────────

@app.get("/stats")
async def get_stats(
    settings: Settings = Depends(get_settings),
    store: SubmissionStore = Depends(get_store),
    user: dict = Depends(get_current_user)):
    """Aggregated stats from flights.db and submissions.db."""
    import sqlite3 as _sqlite3

    result = {
        "total_routes": 0,
        "active_routes": 0,
        "total_locations": 0,
        "total_landing_zones": 0,
        "routes_per_network": [],
        "lz_per_location": [],
        "submission_statuses": {},
        "recent_approved": [],
    }

    # ── flights.db stats ─────────────────────────────────────────────────
    flights_db = settings.instance_dir / "flights.db"
    if flights_db.exists():
        try:
            conn = _sqlite3.connect(str(flights_db))
            conn.row_factory = _sqlite3.Row

            # Total & active routes
            row = conn.execute("SELECT COUNT(*) as c FROM flight_routes").fetchone()
            result["total_routes"] = row["c"] if row else 0
            result["active_routes"] = result["total_routes"]  # assume all active

            row = conn.execute("SELECT COUNT(*) as c FROM locations").fetchone()
            result["total_locations"] = row["c"] if row else 0

            row = conn.execute("SELECT COUNT(*) as c FROM landing_zones").fetchone()
            result["total_landing_zones"] = row["c"] if row else 0

            # Routes per network
            try:
                rows = conn.execute(
                    "SELECT n.name, COUNT(fr.id) as cnt "
                    "FROM flight_routes fr JOIN networks n ON fr.network_id = n.id "
                    "GROUP BY n.name ORDER BY cnt DESC"
                ).fetchall()
                result["routes_per_network"] = [
                    {"name": r["name"], "count": r["cnt"]} for r in rows
                ]
            except Exception:
                pass

            # LZ per location (top 10)
            try:
                rows = conn.execute(
                    "SELECT l.name, COUNT(lz.id) as cnt "
                    "FROM landing_zones lz JOIN locations l ON lz.location_id = l.id "
                    "GROUP BY l.name ORDER BY cnt DESC LIMIT 10"
                ).fetchall()
                result["lz_per_location"] = [
                    {"name": r["name"], "count": r["cnt"]} for r in rows
                ]
            except Exception:
                pass

            conn.close()
        except Exception as e:
            logger.warning("Stats: failed to read flights.db: %s", e)

    # ── submissions.db stats ─────────────────────────────────────────────
    try:
        subs = store.list_submissions()
        status_counts: dict[str, int] = {}
        recent: list[dict] = []
        for s in subs:
            status_counts[s.status.value] = status_counts.get(s.status.value, 0) + 1
            if s.status.value == "approved" and len(recent) < 10:
                recent.append({
                    "id": s.id,
                    "route": f"{s.payload.source_location_name} → {s.payload.destination_location_name}",
                    "mission_file": s.payload.mission_filename,
                    "created_at": s.created_at,
                })
        result["submission_statuses"] = status_counts
        result["recent_approved"] = recent
    except Exception as e:
        logger.warning("Stats: failed to read submissions: %s", e)

    return result


@app.get("/submissions/{submission_id}/pipeline-status")
async def get_pipeline_status(
    submission_id: str,
    store: SubmissionStore = Depends(get_store),
    user: dict = Depends(get_current_user)):
    """Return current pipeline step/status for live UI polling during approval."""
    sub = store.get_submission(submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    return {
        "submission_id": submission_id,
        "status": sub.status.value,
        "download_status": sub.download_status.value,
        "error_detail": sub.error_detail,
    }


# ── CONFIG ENDPOINT ─────────────────────────────────────────────────────────

@app.get("/config/cesium-token")
async def get_cesium_token(settings: Settings = Depends(get_settings), user: dict = Depends(get_current_user)):
    """Return the Cesium Ion token for the frontend."""
    return {"token": settings.CESIUM_ION_TOKEN}


# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health(settings: Settings = Depends(get_settings)):
    import sqlite3
    import httpx
    status = {"status": "ok", "service": "redwing-db-automation", "components": {}}
    
    # Check submissions DB
    try:
        if Path(settings.SUBMISSIONS_DB_PATH).exists():
            status["components"]["submissions_db"] = "ok"
        else:
            status["components"]["submissions_db"] = "missing"
    except Exception as e:
        status["components"]["submissions_db"] = f"error: {str(e)}"
        
    # Check flights DB (if applicable)
    flights_db = settings.instance_dir / "flights.db"
    try:
        if flights_db.exists():
            status["components"]["flights_db"] = "ok"
        else:
            status["components"]["flights_db"] = "missing"
    except Exception as e:
        status["components"]["flights_db"] = f"error: {str(e)}"
        
    # Check Excel
    try:
        if settings.excel_path.exists():
            status["components"]["excel"] = "ok"
        else:
            status["components"]["excel"] = "missing"
    except Exception as e:
        status["components"]["excel"] = f"error: {str(e)}"
        
    # Check Ngrok
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:4040/api/tunnels", timeout=2.0)
            if resp.status_code == 200:
                tunnels = resp.json().get('tunnels', [])
                if any(t.get('public_url') == f"https://{settings.NGROK_DOMAIN}" for t in tunnels):
                    status["components"]["ngrok"] = "ok"
                else:
                    status["components"]["ngrok"] = "tunnel_missing_or_mismatch"
            else:
                status["components"]["ngrok"] = "api_error"
    except Exception as e:
        status["components"]["ngrok"] = f"unreachable"
        
    return status
