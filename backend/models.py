"""Pydantic models for RedWing DB Automation."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────────────

class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FAILED = "failed"
    DUPLICATE = "duplicate"


class EntityAction(str, enum.Enum):
    EXISTING = "existing"
    NEW = "new"
    NOT_FOUND = "not_found"


class DownloadStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


# ── Submission Payload (from Google Form webhook) ────────────────────────────

class SubmissionPayload(BaseModel):
    network_name: str
    source_location_name: str
    source_takeoff_zone_name: str
    source_latitude: float
    source_longitude: float
    destination_location_name: str
    destination_landing_zone_name: str
    destination_latitude: float
    destination_longitude: float
    takeoff_direction: int
    approach_direction: int
    mission_filename: str
    mission_drive_link: str
    elevation_image_drive_link: str
    route_image_drive_link: str


# ── Submission Response ──────────────────────────────────────────────────────

class SubmissionResponse(BaseModel):
    id: str
    payload: SubmissionPayload
    status: SubmissionStatus
    download_status: DownloadStatus = DownloadStatus.NOT_STARTED
    error_detail: Optional[str] = None
    created_at: str
    downloaded_files: Optional[Dict[str, str]] = None


# ── Status Update ────────────────────────────────────────────────────────────

class StatusUpdateRequest(BaseModel):
    status: SubmissionStatus
    reason: Optional[str] = None


# ── Approval Request (with confirmation gate) ───────────────────────────────

class ConfirmedNewEntities(BaseModel):
    source_location: bool = False
    source_lz: bool = False
    destination_location: bool = False
    destination_lz: bool = False


class ApprovalRequest(BaseModel):
    confirmed_new_entities: ConfirmedNewEntities


# ── Resolve Preview ─────────────────────────────────────────────────────────

class EntityPreview(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    action: EntityAction


class ResolvePreviewResponse(BaseModel):
    network: EntityPreview
    source_location: EntityPreview
    source_lz: EntityPreview
    destination_location: EntityPreview
    destination_lz: EntityPreview
    waypoint_file: EntityPreview
    flight_route: EntityPreview
    warnings: List[str] = Field(default_factory=list)


# ── Waypoint Data ───────────────────────────────────────────────────────────

class WaypointData(BaseModel):
    index: int
    current_wp: int
    coord_frame: int
    command: int
    param1: float
    param2: float
    param3: float
    param4: float
    latitude: float
    longitude: float
    altitude: float
    autocontinue: int


class WaypointFileResponse(BaseModel):
    mission_filename: str
    waypoints: List[WaypointData]
    total_waypoints: int


# ── Pipeline Result ─────────────────────────────────────────────────────────

class PipelineResult(BaseModel):
    success: bool
    submission_id: str
    network_id: Optional[int] = None
    source_location_id: Optional[int] = None
    source_lz_id: Optional[int] = None
    destination_location_id: Optional[int] = None
    destination_lz_id: Optional[int] = None
    waypoint_file_id: Optional[int] = None
    flight_route_id: Optional[int] = None
    error_step: Optional[int] = None
    error_detail: Optional[str] = None
    git_output: Optional[str] = None


# ── Download Result ─────────────────────────────────────────────────────────

class DownloadResult(BaseModel):
    success: bool
    mission_file_path: Optional[str] = None
    elevation_image_path: Optional[str] = None
    route_image_path: Optional[str] = None
    error: Optional[str] = None
