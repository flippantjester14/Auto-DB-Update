/**
 * MAVLink command ID to human-readable name mapping.
 */
export const MAVLINK_COMMANDS = {
    16: 'WAYPOINT',
    17: 'LOITER_UNLIM',
    18: 'LOITER_TURNS',
    19: 'LOITER_TIME',
    20: 'RTL',
    21: 'LAND',
    22: 'TAKEOFF',
    177: 'DO_JUMP',
    178: 'DO_CHANGE_SPEED',
    189: 'DO_LAND_START',
    203: 'DO_AUX_FUNCTION',
};

export function getCommandName(code) {
    return MAVLINK_COMMANDS[code] || `CMD_${code}`;
}

/**
 * Parse a QGC WPL 110 waypoints file (text content).
 * Returns array of waypoint objects matching the backend WaypointData model.
 */
export function parseWaypointsFile(text) {
    const lines = text.trim().split('\n');
    if (!lines[0]?.startsWith('QGC WPL')) {
        throw new Error('Not a valid QGC waypoints file');
    }

    const waypoints = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\t/);
        if (parts.length < 12) continue;

        waypoints.push({
            index: parseInt(parts[0], 10),
            current_wp: parseInt(parts[1], 10),
            coord_frame: parseInt(parts[2], 10),
            command: parseInt(parts[3], 10),
            param1: parseFloat(parts[4]),
            param2: parseFloat(parts[5]),
            param3: parseFloat(parts[6]),
            param4: parseFloat(parts[7]),
            latitude: parseFloat(parts[8]),
            longitude: parseFloat(parts[9]),
            altitude: parseFloat(parts[10]),
            autocontinue: parseInt(parts[11], 10),
            angle: parts.length >= 13 ? parseFloat(parts[12]) : undefined,
        });
    }

    return waypoints;
}
