import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CesiumViewer from '../waypoint/CesiumViewer';
import WaypointTable from '../waypoint/WaypointTable';
import ElevationGraph from '../waypoint/ElevationGraph';
import { FileDown, AlertTriangle } from 'lucide-react';

export default function WaypointViewerTab({ waypoints, sub }) {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const navigate = useNavigate();

    // Use the persistent flag from the server
    const filesDownloaded = sub?.files_downloaded === true || sub?.download_status === 'completed';

    if (!filesDownloaded) {
        return (
            <div className="empty-state" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <FileDown size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                <h3 style={{ marginBottom: '8px' }}>Files Not Downloaded</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', textAlign: 'center' }}>
                    Download the mission waypoints and elevation images first to view the route on the map.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/submissions/${sub.id}?tab=files`)}
                >
                    Go to Files tab →
                </button>
            </div>
        );
    }

    if (!waypoints) {
        return (
            <div className="empty-state" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
                <h3 style={{ marginBottom: '8px' }}>Waypoint Data Missing</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', textAlign: 'center' }}>
                    Files were downloaded but the waypoint data could not be parsed or loaded.
                    Try reloading the page.
                </p>
            </div>
        );
    }

    const wps = waypoints.waypoints || [];

    return (
        <div>
            <div className="wp-split">
                <CesiumViewer
                    waypoints={wps}
                    hoveredIndex={hoveredIndex}
                    onHover={setHoveredIndex}
                />
                <WaypointTable
                    waypoints={wps}
                    hoveredIndex={hoveredIndex}
                    onHover={setHoveredIndex}
                />
            </div>

            <div className="card mb-24" style={{ marginTop: '16px' }}>
                <ElevationGraph waypoints={wps} />
            </div>
        </div>
    );
}
