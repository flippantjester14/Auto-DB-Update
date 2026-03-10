import React, { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { parseWaypointsFile } from '../components/waypoint/waypointParser';
import CesiumViewer from '../components/waypoint/CesiumViewer';
import WaypointTable from '../components/waypoint/WaypointTable';
import ElevationGraph from '../components/waypoint/ElevationGraph';

export default function ViewerPage() {
    const [waypoints, setWaypoints] = useState(null);
    const [filename, setFilename] = useState('');
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [error, setError] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = useCallback((file) => {
        setError(null);
        if (!file) return;
        setFilename(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wps = parseWaypointsFile(e.target.result);
                setWaypoints(wps);
            } catch (err) {
                setError(err.message);
                setWaypoints(null);
            }
        };
        reader.readAsText(file);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, [handleFile]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => setDragOver(false), []);

    const handleBrowse = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.waypoints,.txt';
        input.onchange = (e) => handleFile(e.target.files[0]);
        input.click();
    };

    return (
        <div>
            <div className="page-header">
                <h1>Waypoint Viewer</h1>
                {filename && (
                    <span className="text-sm text-muted">
                        {filename} · {waypoints?.length || 0} waypoints
                    </span>
                )}
            </div>

            {!waypoints && (
                <div
                    className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={handleBrowse}
                >
                    <Upload size={40} />
                    <p>Drag & drop a .waypoints file here, or click to browse</p>
                    <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); handleBrowse(); }}>
                        📁 Browse File
                    </button>
                </div>
            )}

            {error && <div className="banner banner-error" style={{ marginTop: 16 }}>⚠ {error}</div>}

            {waypoints && (
                <div>
                    <div className="flex gap-12 mb-16">
                        <button className="btn" onClick={() => { setWaypoints(null); setFilename(''); }}>
                            ← Load Another File
                        </button>
                    </div>

                    <div className="wp-split">
                        <CesiumViewer
                            waypoints={waypoints}
                            hoveredIndex={hoveredIndex}
                            onHover={setHoveredIndex}
                        />
                        <WaypointTable
                            waypoints={waypoints}
                            hoveredIndex={hoveredIndex}
                            onHover={setHoveredIndex}
                        />
                    </div>

                    <ElevationGraph waypoints={waypoints} />
                </div>
            )}
        </div>
    );
}
