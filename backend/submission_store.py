"""SQLite-backed submission queue for RedWing DB Automation."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List, Optional

from models import (
    DownloadStatus,
    SubmissionPayload,
    SubmissionResponse,
    SubmissionStatus,
)


class SubmissionStore:
    """Manages submissions in a local SQLite database."""

    def __init__(self, db_path: str = "./submissions.db"):
        self.db_path = db_path
        self._ensure_db()

    # ── Schema ───────────────────────────────────────────────────────────

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _ensure_db(self) -> None:
        conn = self._get_conn()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS submissions (
                id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                download_status TEXT NOT NULL DEFAULT 'not_started',
                error_detail TEXT,
                downloaded_files TEXT,
                files_downloaded INTEGER NOT NULL DEFAULT 0,
                waypoint_verified INTEGER NOT NULL DEFAULT 0,
                id_resolution_reviewed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT,
                created_by_uid TEXT,
                updated_by_uid TEXT,
                deleted_at TEXT,
                deleted_by_uid TEXT
            )
        """)
        # Migration: Add columns if they don't exist
        try:
            conn.execute("ALTER TABLE submissions ADD COLUMN files_downloaded INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE submissions ADD COLUMN waypoint_verified INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE submissions ADD COLUMN id_resolution_reviewed INTEGER NOT NULL DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        
        # Migration: Add new V2 columns
        for col in ["updated_at TEXT", "created_by_uid TEXT", "updated_by_uid TEXT", "deleted_at TEXT", "deleted_by_uid TEXT", "source TEXT DEFAULT 'webhook'"]:
            try:
                conn.execute(f"ALTER TABLE submissions ADD COLUMN {col}")
            except sqlite3.OperationalError:
                pass
                
        conn.commit()
        conn.close()

    # ── CRUD ─────────────────────────────────────────────────────────────

    def add_submission(
        self, payload: SubmissionPayload, status: SubmissionStatus = SubmissionStatus.PENDING, user_uid: Optional[str] = None, source: str = "webhook"
    ) -> str:
        submission_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        conn = self._get_conn()
        conn.execute(
            """INSERT INTO submissions (id, payload, status, download_status, files_downloaded, waypoint_verified, id_resolution_reviewed, created_at, created_by_uid, source)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                submission_id,
                payload.model_dump_json(),
                status.value,
                DownloadStatus.NOT_STARTED.value,
                0,
                0,
                0,
                now,
                user_uid,
                source,
            ),
        )
        conn.commit()
        conn.close()
        return submission_id

    def get_submission(self, submission_id: str) -> Optional[SubmissionResponse]:
        conn = self._get_conn()
        row = conn.execute(
            "SELECT * FROM submissions WHERE id = ?", (submission_id,)
        ).fetchone()
        conn.close()
        if row is None:
            return None
        return self._row_to_response(row)

    def list_submissions(self) -> List[SubmissionResponse]:
        conn = self._get_conn()
        rows = conn.execute(
            "SELECT * FROM submissions WHERE deleted_at IS NULL ORDER BY created_at DESC"
        ).fetchall()
        conn.close()
        return [self._row_to_response(r) for r in rows]

    def update_status(
        self,
        submission_id: str,
        status: SubmissionStatus,
        error_detail: Optional[str] = None,
        user_uid: Optional[str] = None,
    ) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        conn = self._get_conn()
        if error_detail:
            conn.execute(
                "UPDATE submissions SET status = ?, error_detail = ?, updated_at = ?, updated_by_uid = ? WHERE id = ?",
                (status.value, error_detail, now, user_uid, submission_id),
            )
        else:
            conn.execute(
                "UPDATE submissions SET status = ?, updated_at = ?, updated_by_uid = ? WHERE id = ?",
                (status.value, now, user_uid, submission_id),
            )
        conn.commit()
        affected = conn.total_changes
        conn.close()
        return affected > 0

    def update_download_status(
        self,
        submission_id: str,
        download_status: DownloadStatus,
        downloaded_files: Optional[dict] = None,
        error_detail: Optional[str] = None,
        user_uid: Optional[str] = None,
    ) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        conn = self._get_conn()
        files_json = json.dumps(downloaded_files) if downloaded_files else None
        
        is_completed = 1 if download_status == DownloadStatus.COMPLETED else 0
        
        if error_detail:
            conn.execute(
                "UPDATE submissions SET download_status = ?, downloaded_files = ?, error_detail = ?, files_downloaded = ?, updated_at = ?, updated_by_uid = ? WHERE id = ?",
                (download_status.value, files_json, error_detail, is_completed, now, user_uid, submission_id),
            )
        else:
            conn.execute(
                "UPDATE submissions SET download_status = ?, downloaded_files = ?, files_downloaded = ?, updated_at = ?, updated_by_uid = ? WHERE id = ?",
                (download_status.value, files_json, is_completed, now, user_uid, submission_id),
            )
        conn.commit()
        conn.close()
        return True

    def update_review_state(
        self,
        submission_id: str,
        waypoint_verified: Optional[bool] = None,
        id_resolution_reviewed: Optional[bool] = None,
        user_uid: Optional[str] = None,
    ) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        conn = self._get_conn()
        updates = ["updated_at = ?", "updated_by_uid = ?"]
        params: list[Any] = [now, user_uid]
        if waypoint_verified is not None:
            updates.append("waypoint_verified = ?")
            params.append(1 if waypoint_verified else 0)
        if id_resolution_reviewed is not None:
            updates.append("id_resolution_reviewed = ?")
            params.append(1 if id_resolution_reviewed else 0)

        if len(updates) == 2: # Only updated_at and updated_by_uid
            conn.close()
            return False

        params.append(submission_id)
        query = f"UPDATE submissions SET {', '.join(updates)} WHERE id = ?"
        conn.execute(query, tuple(params))
        conn.commit()
        affected = conn.total_changes
        conn.close()
        return affected > 0

    # ── Helpers ──────────────────────────────────────────────────────────

    def _row_to_response(self, row: sqlite3.Row) -> SubmissionResponse:
        downloaded_files = None
        if row["downloaded_files"]:
            downloaded_files = json.loads(row["downloaded_files"])
        # Handle source column gracefully (may not exist in old DBs)
        try:
            source = row["source"] or "webhook"
        except (IndexError, KeyError):
            source = "webhook"
        return SubmissionResponse(
            id=row["id"],
            payload=SubmissionPayload.model_validate_json(row["payload"]),
            status=SubmissionStatus(row["status"]),
            download_status=DownloadStatus(row["download_status"]),
            error_detail=row["error_detail"],
            created_at=row["created_at"],
            downloaded_files=downloaded_files,
            files_downloaded=bool(row["files_downloaded"]),
            waypoint_verified=bool(row["waypoint_verified"]),
            id_resolution_reviewed=bool(row["id_resolution_reviewed"]),
            source=source,
        )
