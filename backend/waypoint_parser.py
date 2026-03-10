"""Mission Planner waypoint file parser for RedWing DB Automation.

Parses .waypoints files in the QGroundControl WPL 1.1 format.
Each line (after the header) is tab-separated with columns:
  index, current_wp, coord_frame, command, param1, param2, param3, param4,
  latitude, longitude, altitude, autocontinue
"""

from __future__ import annotations

from pathlib import Path
from typing import List

from models import WaypointData, WaypointFileResponse
from pymavlink import mavutil

EXPECTED_HEADER = "QGC WPL 110"
EXPECTED_COLUMN_COUNT = 12


class WaypointParseError(Exception):
    """Raised when a .waypoints file cannot be parsed."""
    pass


COMMAND_NAME_MAP = {
    16: "WAYPOINT",
    17: "LOITER_UNLIM",
    18: "LOITER_TURNS",
    19: "LOITER_TIME",
    20: "RTL",
    21: "LAND",
    22: "TAKEOFF",
    23: "LAND_LOCAL",
    24: "MISSION_START",
    80: "ROI",
    82: "PATHPLANNING",
    83: "NAV_SPLINE_WAYPOINT",
    84: "VTOL_TAKEOFF",
    85: "VTOL_LAND",
    92: "DELAY",
    93: "PAYLOAD_PLACE",
    177: "LOITER_TO_ALT",
    178: "DO_FOLLOW",
    189: "LAND_SEQUENCE",
    201: "DO_SET_ROI",
    206: "DO_SET_CAM_TRIGG_DIST",
    218: "DO_LAND_START",
    203: "DO_FENCE_ENABLE",
    400: "COMPONENT_ARM_DISARM",
}

def get_command_name(cmd_int: int) -> str:
    """Resolve human-readable name for a MAVLink command ID."""
    # Try hardcoded map first — most reliable
    if cmd_int in COMMAND_NAME_MAP:
        return COMMAND_NAME_MAP[cmd_int]
    
    # Try pymavlink
    try:
        enums = mavutil.mavlink.enums.get('MAV_CMD', {})
        entry = enums.get(cmd_int)
        if entry:
            name = entry.name
            for prefix in ['MAV_CMD_NAV_', 'MAV_CMD_DO_', 'MAV_CMD_CONDITION_', 'MAV_CMD_']:
                if name.startswith(prefix):
                    return name[len(prefix):]
            return name
    except Exception:
        pass
    
    # Final fallback
    return f'CMD_{cmd_int}'

def parse_waypoints_file(filepath: Path) -> WaypointFileResponse:
    """Parse a Mission Planner waypoint file and return structured data.

    Args:
        filepath: Path to the .waypoints file.

    Returns:
        WaypointFileResponse with all parsed waypoints.

    Raises:
        WaypointParseError: If the file is malformed.
        FileNotFoundError: If the file does not exist.
    """
    if not filepath.exists():
        raise FileNotFoundError(f"Waypoint file not found: {filepath}")

    text = filepath.read_text(encoding="utf-8").strip()
    if not text:
        raise WaypointParseError("Waypoint file is empty")

    lines = text.splitlines()

    # Validate header
    header = lines[0].strip()
    if header != EXPECTED_HEADER:
        raise WaypointParseError(
            f"Invalid header: expected '{EXPECTED_HEADER}', got '{header}'"
        )

    waypoints: List[WaypointData] = []

    for line_num, line in enumerate(lines[1:], start=2):
        line = line.strip()
        if not line:
            continue  # skip blank lines

        parts = line.split("\t")
        if len(parts) != EXPECTED_COLUMN_COUNT:
            raise WaypointParseError(
                f"Line {line_num}: expected {EXPECTED_COLUMN_COUNT} columns, "
                f"got {len(parts)}"
            )

        try:
            cmd_int = int(parts[3])
            wp = WaypointData(
                index=int(parts[0]),
                current_wp=int(parts[1]),
                coord_frame=int(parts[2]),
                coord_frame_name={0: "ABS", 3: "REL", 10: "AGL"}.get(int(parts[2]), f"FRAME_{parts[2]}"),
                command=cmd_int,
                command_name=get_command_name(cmd_int),
                param1=float(parts[4]),
                param2=float(parts[5]),
                param3=float(parts[6]),
                param4=float(parts[7]),
                latitude=float(parts[8]),
                longitude=float(parts[9]),
                altitude=float(parts[10]),
                autocontinue=int(parts[11]),
                is_nav_command=cmd_int in [16,17,18,19,20,21,22,23,24,93,189],
                is_action_command=cmd_int in [82,83,84,85,177,178,179,180,181,218,201,206]
            )
            waypoints.append(wp)
        except (ValueError, IndexError) as e:
            raise WaypointParseError(
                f"Line {line_num}: could not parse values — {e}"
            )

    return WaypointFileResponse(
        mission_filename=filepath.name,
        waypoints=waypoints,
        total_waypoints=len(waypoints),
    )
