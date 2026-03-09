#!/bin/bash
# Script to verify the flights.db contents after automated update

DB_PATH="/home/jester/RedWingGCS/instance/flights.db"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Error: Database not found at $DB_PATH"
    echo "Note: The database is created only AFTER you follow the 'Approve' process in the UI."
    exit 1
fi

echo "--- 🦅 RedWing Flight DB Check ---"
echo "Database: $DB_PATH"
echo ""

# Check if tables are empty
ROUTE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM flight_routes;")

if [ "$ROUTE_COUNT" -eq 0 ]; then
    echo "⚠️  Database is currently EMPTY (0 records)."
    echo "This is expected IF you haven't clicked 'Approve' in the Dashboard yet."
    echo "The pipeline will populate this DB automatically during approval."
    exit 0
fi

echo "Total Routes in DB: $ROUTE_COUNT"
echo ""

echo "[1] Recent Flight Routes (Last 5):"
sqlite3 "$DB_PATH" "SELECT id, start_location_id, end_location_id, waypoint_file_id, takeoff_direction, approach_direction FROM flight_routes ORDER BY id DESC LIMIT 5;" -header -column
echo ""

echo "[2] Newest Locations:"
sqlite3 "$DB_PATH" "SELECT id, name, code, district_id FROM locations ORDER BY id DESC LIMIT 3;" -header -column
echo ""

echo "[3] Newest Landing Zones:"
sqlite3 "$DB_PATH" "SELECT id, name, latitude, longitude, location_id FROM landing_zones ORDER BY id DESC LIMIT 3;" -header -column
echo ""

echo "[4] Newest Waypoint Files:"
sqlite3 "$DB_PATH" "SELECT id, filename, local_filepath FROM waypoint_files ORDER BY id DESC LIMIT 3;" -header -column
echo ""

echo "--- Check Complete ---"
