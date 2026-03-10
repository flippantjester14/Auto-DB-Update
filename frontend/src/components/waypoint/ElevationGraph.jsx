import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

export default function ElevationGraph({ waypoints, elevationImageUrl }) {
    const [view, setView] = React.useState('graph');

    // Filter out WP0 if lat/lng zero
    const validWps = waypoints?.filter(wp => !(wp.latitude === 0 && wp.longitude === 0)) || [];

    const data = validWps.map(wp => ({
        name: `WP ${wp.index}`,
        altitude: wp.altitude,
        index: wp.index,
    }));

    if (!data.length && !elevationImageUrl) return null;

    return (
        <div className="elevation-graph">
            {elevationImageUrl && (
                <div className="elevation-tabs">
                    <button className={`tab ${view === 'graph' ? 'active' : ''}`} onClick={() => setView('graph')}>
                        Generated Graph
                    </button>
                    <button className={`tab ${view === 'image' ? 'active' : ''}`} onClick={() => setView('image')}>
                        Provided Image
                    </button>
                </div>
            )}

            {view === 'graph' && data.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
                        <defs>
                            <linearGradient id="altGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} unit="m" />
                        <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E5E7EB' }}
                            formatter={(val) => [`${val}m`, 'Altitude']}
                        />
                        <Area
                            type="monotone"
                            dataKey="altitude"
                            stroke="#2563EB"
                            strokeWidth={2}
                            fill="url(#altGrad)"
                            dot={{ r: 4, fill: '#2563EB' }}
                        >
                            <LabelList dataKey="name" position="top" style={{ fontSize: 10, fill: '#6B7280' }} />
                        </Area>
                    </AreaChart>
                </ResponsiveContainer>
            )}

            {view === 'image' && elevationImageUrl && (
                <img src={elevationImageUrl} alt="Elevation profile" className="inline-image" />
            )}
        </div>
    );
}
