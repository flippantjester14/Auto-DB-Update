import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { api } from '../api';

export default function CesiumViewer({ waypoints }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [tokenLoaded, setTokenLoaded] = useState(false);

    useEffect(() => {
        api.getCesiumToken().then(({ token }) => {
            if (token) Cesium.Ion.defaultAccessToken = token;
            setTokenLoaded(true);
        }).catch(() => setTokenLoaded(true));
    }, []);

    useEffect(() => {
        if (!tokenLoaded || !containerRef.current || !waypoints?.length) return;

        const viewer = new Cesium.Viewer(containerRef.current, {
            terrain: Cesium.Terrain.fromWorldTerrain(),
            animation: false,
            timeline: false,
            baseLayerPicker: false,
            fullscreenButton: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            geocoder: false,
        });
        viewerRef.current = viewer;

        const positions = [];

        waypoints.forEach((wp) => {
            const pos = Cesium.Cartesian3.fromDegrees(wp.longitude, wp.latitude, wp.altitude);
            positions.push(pos);

            viewer.entities.add({
                position: pos,
                point: { pixelSize: 10, color: Cesium.Color.fromCssColorString('#ef4444') },
                label: {
                    text: `WP ${wp.index}`,
                    font: '12px sans-serif',
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -15),
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                },
                description: `
          <table>
            <tr><td><b>Index</b></td><td>${wp.index}</td></tr>
            <tr><td><b>Command</b></td><td>${wp.command}</td></tr>
            <tr><td><b>Latitude</b></td><td>${wp.latitude}</td></tr>
            <tr><td><b>Longitude</b></td><td>${wp.longitude}</td></tr>
            <tr><td><b>Altitude</b></td><td>${wp.altitude}m</td></tr>
            <tr><td><b>Param1</b></td><td>${wp.param1}</td></tr>
            <tr><td><b>Param2</b></td><td>${wp.param2}</td></tr>
            <tr><td><b>Param3</b></td><td>${wp.param3}</td></tr>
            <tr><td><b>Param4</b></td><td>${wp.param4}</td></tr>
          </table>`,
            });
        });

        // Polyline connecting waypoints
        if (positions.length > 1) {
            viewer.entities.add({
                polyline: {
                    positions,
                    width: 3,
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.2,
                        color: Cesium.Color.fromCssColorString('#3b82f6'),
                    }),
                },
            });
        }

        viewer.zoomTo(viewer.entities);

        return () => {
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.destroy();
            }
        };
    }, [tokenLoaded, waypoints]);

    return <div ref={containerRef} className="cesium-container" />;
}
