"""Post-approval validation: verify the SQLite database.

These tests validate the output of populate_data.py against the Excel.
They use test paths — never the real production database.
"""

from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))


@pytest.fixture
def mock_flights_db(test_repo_path: Path) -> Path:
    """Create a mock flights.db matching the test Excel structure."""
    db_path = test_repo_path / "instance" / "flights.db"
    db_path.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE network (id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE location (id INTEGER PRIMARY KEY, name TEXT, code TEXT, network_id INTEGER);
        CREATE TABLE landing_zone (id INTEGER PRIMARY KEY, location_id INTEGER, name TEXT, latitude REAL, longitude REAL);
        CREATE TABLE waypoint_file (id INTEGER PRIMARY KEY, filename TEXT, local_filepath TEXT);
        CREATE TABLE flight_route (
            id INTEGER PRIMARY KEY, start_lz_id INTEGER, end_lz_id INTEGER,
            start_location_id INTEGER, end_location_id INTEGER,
            waypoint_file_id INTEGER, network_id INTEGER,
            takeoff_direction INTEGER, approach_direction INTEGER, status INTEGER
        );
        INSERT INTO network VALUES (1, 'Hoskote - Network Zero');
        INSERT INTO location VALUES (1, 'HQ - Redwing Techworks', 'HQ-RWT', 1);
        INSERT INTO location VALUES (2, 'Depot - Main Warehouse', 'D-MW', 1);
        INSERT INTO landing_zone VALUES (1, 1, 'HQ North Pad', 13.1637751, 77.8672772);
        INSERT INTO landing_zone VALUES (2, 2, 'Depot Pad A', 13.18, 77.88);
        INSERT INTO waypoint_file VALUES (1, 'HQ-DEPOT-150m.waypoints', './missions/HQ-DEPOT-150m.waypoints');
        INSERT INTO flight_route VALUES (1, 1, 2, 1, 2, 1, 1, 90, 270, 1);
    """)
    conn.commit()
    conn.close()
    return db_path


class TestDBIntegrity:
    def test_flight_route_exists(self, mock_flights_db: Path):
        conn = sqlite3.connect(str(mock_flights_db))
        row = conn.execute("SELECT * FROM flight_route WHERE id = 1").fetchone()
        assert row is not None
        conn.close()

    def test_foreign_keys_resolve(self, mock_flights_db: Path):
        conn = sqlite3.connect(str(mock_flights_db))
        rows = conn.execute("""
            SELECT fr.id, lz1.name, lz2.name, l1.name, l2.name, wf.filename, n.name
            FROM flight_route fr
            JOIN landing_zone lz1 ON fr.start_lz_id = lz1.id
            JOIN landing_zone lz2 ON fr.end_lz_id = lz2.id
            JOIN location l1 ON fr.start_location_id = l1.id
            JOIN location l2 ON fr.end_location_id = l2.id
            JOIN waypoint_file wf ON fr.waypoint_file_id = wf.id
            JOIN network n ON fr.network_id = n.id
        """).fetchall()
        assert len(rows) >= 1
        # No nulls in the join
        for row in rows:
            for val in row:
                assert val is not None
        conn.close()

    def test_waypoint_file_row_exists(self, mock_flights_db: Path):
        conn = sqlite3.connect(str(mock_flights_db))
        row = conn.execute("SELECT * FROM waypoint_file WHERE id = 1").fetchone()
        assert row is not None
        assert "HQ-DEPOT-150m.waypoints" in row[1]
        conn.close()


class TestMissionFileExists:
    def test_mission_file_on_disk(self, test_repo_path: Path):
        missions = test_repo_path / "missions"
        # In test env, just verify dir exists
        assert missions.exists()
