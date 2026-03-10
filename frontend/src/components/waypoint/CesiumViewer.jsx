import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { api } from '../../api/api';
import { getCommandName } from './waypointParser';

function getPinColorForCommand(cmd) {
    switch (cmd) {
        case 22:
            return '#16A34A'; // TAKEOFF
        case 21:
            return '#DC2626'; // LAND
        case 16:
            return '#FFFFFF'; // WAYPOINT
        case 20:
            return '#D97706'; // RTL
        default:
            return '#9CA3AF'; // Other
    }
}

function createWaypointPin(index, color = '#FFFFFF') {
    const canvas = document.createElement('canvas');
    canvas.width = 28;
    canvas.height = 28;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // outer circle
    ctx.beginPath();
    ctx.arc(14, 14, 12, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // index number
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 10px "Barlow", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index), 14, 14);

    return canvas.toDataURL();
}

export default function CesiumViewer({ waypoints, hoveredIndex, onHover }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const entitiesRef = useRef({});
    const [tokenLoaded, setTokenLoaded] = useState(false);

    // Load Cesium token once
    useEffect(() => {
        api.getCesiumToken().then(({ token }) => {
            if (token) Cesium.Ion.defaultAccessToken = token;
            setTokenLoaded(true);
        }).catch(() => setTokenLoaded(true));
    }, []);

    // Initialize viewer and plot waypoints
    useEffect(() => {
        if (!tokenLoaded || !containerRef.current || !waypoints?.length) return;

        // Kill existing viewer
        if (viewerRef.current && !viewerRef.current.isDestroyed()) {
            viewerRef.current.destroy();
        }

        const viewer = new Cesium.Viewer(containerRef.current, {
            terrainProvider: new Cesium.EllipsoidTerrainProvider(),
            animation: false,
            timeline: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            geocoder: false,
            infoBox: false,
            selectionIndicator: false,
        });
        viewerRef.current = viewer;
        entitiesRef.current = {};

        const positions = [];
        const validWps = waypoints.filter(wp => !(wp.latitude === 0 && wp.longitude === 0));

        validWps.forEach((wp) => {
            const pos = Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude, wp.altitude);
            positions.push(pos);

            const color = getPinColorForCommand(wp.command);
            const pinImage = createWaypointPin(wp.index, color);

            const entity = viewer.entities.add({
                position: pos,
                billboard: new Cesium.BillboardGraphics({
                    image: pinImage,
                    width: 28,
                    height: 28,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    scaleByDistance: undefined,
                    pixelOffset: new Cesium.Cartesian2(0, -14),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                }),
            });
            entitiesRef.current[wp.index] = entity;
        });

        // Orange polyline - fixed width, clamped to ground
        if (positions.length > 1) {
            viewer.entities.add({
                polyline: new Cesium.PolylineGraphics({
                    positions,
                    width: 3,
                    material: Cesium.Color.fromCssColorString('#F59E0B'),
                    clampToGround: true,
                }),
            });
        }

        // Fly to centroid
        if (validWps.length > 0) {
            const avgLat = validWps.reduce((s, w) => s + w.latitude, 0) / validWps.length;
            const avgLng = validWps.reduce((s, w) => s + w.longitude, 0) / validWps.length;
            const maxAlt = Math.max(...validWps.map(w => w.altitude));
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(avgLng, avgLat, maxAlt * 3 + 500),
                duration: 1.5,
            });
        }

        // Hover handler
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement) => {
            const picked = viewer.scene.pick(movement.endPosition);
            if (Cesium.defined(picked) && picked.id) {
                const idx = Object.entries(entitiesRef.current).find(([, e]) => e === picked.id);
                if (idx) {
                    onHover?.(parseInt(idx[0], 10));
                    return;
                }
            }
            onHover?.(null);
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        return () => {
            handler.destroy();
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.destroy();
            }
        };
    }, [tokenLoaded, waypoints]);

    // Highlight entity on hover from table
    useEffect(() => {
        Object.entries(entitiesRef.current).forEach(([idx, entity]) => {
            if (!entity.billboard) return;
            if (parseInt(idx, 10) === hoveredIndex) {
                entity.billboard.scale = 1.2;
            } else {
                entity.billboard.scale = 1.0;
            }
        });
    }, [hoveredIndex]);

    // Tooltip
    const [tooltip, setTooltip] = useState(null);

    useEffect(() => {
        if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
        const viewer = viewerRef.current;

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement) => {
            const picked = viewer.scene.pick(movement.endPosition);
            if (Cesium.defined(picked) && picked.id) {
                const entry = Object.entries(entitiesRef.current).find(([, e]) => e === picked.id);
                if (entry) {
                    const wp = waypoints.find(w => w.index === parseInt(entry[0], 10));
                    if (wp) {
                        const rect = containerRef.current.getBoundingClientRect();
                        setTooltip({
                            x: movement.endPosition.x,
                            y: movement.endPosition.y,
                            wp,
                        });
                        return;
                    }
                }
            }
            setTooltip(null);
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        return () => handler.destroy();
    }, [tokenLoaded, waypoints]);

    return (
        <div style={{ position: 'relative' }}>
            <div ref={containerRef} className="cesium-container" />
            {tooltip && (
                <div
                    className="wp-tooltip"
                    style={{
                        left: tooltip.x + 16,
                        top: tooltip.y - 20,
                    }}
                >
                    <h4>WP #{tooltip.wp.index}</h4>
                    <div className="wp-tooltip-row">
                        <span>Command</span>
                        <span>{tooltip.wp.command} ({getCommandName(tooltip.wp.command)})</span>
                    </div>
                    <div className="wp-tooltip-row">
                        <span>Lat</span><span>{tooltip.wp.latitude.toFixed(6)}</span>
                    </div>
                    <div className="wp-tooltip-row">
                        <span>Lng</span><span>{tooltip.wp.longitude.toFixed(6)}</span>
                    </div>
                    <div className="wp-tooltip-row">
                        <span>Alt</span><span>{tooltip.wp.altitude}m</span>
                    </div>
                    <div className="wp-tooltip-row">
                        <span>Param1 (Hold)</span><span>{tooltip.wp.param1}s</span>
                    </div>
                    <div className="wp-tooltip-row">
                        <span>Param2 (Accept R)</span><span>{tooltip.wp.param2}m</span>
                    </div>
                    <div className="wp-tooltip-row">
                        <span>AutoContinue</span><span>{tooltip.wp.autocontinue ? 'Yes' : 'No'}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
