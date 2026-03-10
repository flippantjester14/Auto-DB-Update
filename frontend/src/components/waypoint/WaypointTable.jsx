import React from 'react';

const COMMAND_COLORS = {
    WAYPOINT: { bg: 'transparent', color: '#111827', chip: false },
    TAKEOFF: { bg: '#DCFCE7', color: '#16A34A', chip: true },
    VTOL_TAKEOFF: { bg: '#DCFCE7', color: '#16A34A', chip: true },
    LAND: { bg: '#FEE2E2', color: '#DC2626', chip: true },
    VTOL_LAND: { bg: '#FEE2E2', color: '#DC2626', chip: true },
    LAND_SEQUENCE: { bg: '#FEE2E2', color: '#DC2626', chip: true },
    RTL: { bg: '#FEF3C7', color: '#D97706', chip: true },
    LOITER_UNLIM: { bg: '#EDE9FE', color: '#7C3AED', chip: true },
    LOITER_TURNS: { bg: '#EDE9FE', color: '#7C3AED', chip: true },
    LOITER_TIME: { bg: '#EDE9FE', color: '#7C3AED', chip: true },
    DO_LAND_START: { bg: '#F3F4F6', color: '#6B7280', chip: true },
};

function renderCommandChip(commandName) {
    if (!commandName) return <span className="cmd-unknown">—</span>;

    const style = COMMAND_COLORS[commandName];

    if (!style || !style.chip) {
        return (
            <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                color: style?.color ?? '#6B7280',
                fontStyle: style ? 'normal' : 'italic'
            }}>
                {commandName}
            </span>
        );
    }

    return (
        <span style={{
            background: style.bg,
            color: style.color,
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap'
        }}>
            {commandName}
        </span>
    );
}

export default function WaypointTable({ waypoints, hoveredIndex, onHover }) {
    if (!waypoints?.length) return null;

    const renderFramePill = (name) => {
        return (
            <span className="status-badge" style={{
                fontSize: 10,
                padding: '1px 4px',
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)'
            }}>
                {name}
            </span>
        );
    };

    const renderAltCell = (alt) => {
        const isHigh = alt > 500;
        return (
            <span style={{
                color: isHigh ? 'var(--danger)' : 'inherit',
                fontWeight: isHigh ? 600 : 400
            }}>
                {alt}m
            </span>
        );
    };

    return (
        <div className="waypoint-table-container">
            <table className="waypoint-table">
                <thead>
                    <tr>
                        <th className="col-index">#</th>
                        <th className="col-cmdname">Command Name</th>
                        <th className="col-cmd">CMD</th>
                        <th className="col-frame">Frame</th>
                        <th className="col-hold">Hold</th>
                        <th className="col-acceptr">Accept R</th>
                        <th className="col-passr">Pass R</th>
                        <th className="col-yaw">Yaw°</th>
                        <th className="col-lat">Lat</th>
                        <th className="col-lng">Lng</th>
                        <th className="col-alt">Alt</th>
                        <th className="col-auto">Auto</th>
                    </tr>
                </thead>
                <tbody>
                    {waypoints.map((wp) => {
                        const isSkip = wp.latitude === 0 && wp.longitude === 0;

                        return (
                            <tr
                                key={wp.index}
                                className={`${hoveredIndex === wp.index ? 'hovered' : ''} ${isSkip ? 'skip' : ''} ${wp.is_action_command ? 'row-subdued' : ''}`}
                                onMouseEnter={() => onHover?.(wp.index)}
                                onMouseLeave={() => onHover?.(null)}
                            >
                                <td className="col-index mono">{wp.index}</td>
                                <td className="col-cmdname">{renderCommandChip(wp.command_name)}</td>
                                <td className="col-cmd mono muted">{wp.command}</td>
                                <td className="col-frame">{renderFramePill(wp.coord_frame_name)}</td>
                                <td className="col-hold mono">{wp.param1 || '—'}</td>
                                <td className="col-acceptr mono">{wp.param2 || '—'}</td>
                                <td className="col-passr mono">{wp.param3 || '—'}</td>
                                <td className="col-yaw mono">{wp.param4 ? `${wp.param4}°` : '—'}</td>
                                <td className="col-lat mono">{isSkip ? '—' : wp.latitude.toFixed(7)}</td>
                                <td className="col-lng mono">{isSkip ? '—' : wp.longitude.toFixed(7)}</td>
                                <td className="col-alt">{renderAltCell(wp.altitude)}</td>
                                <td className="col-auto">{wp.autocontinue ? '✓' : '✗'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
