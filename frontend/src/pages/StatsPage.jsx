import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = {
    pending: '#D97706',
    approved: '#16A34A',
    rejected: '#DC2626',
    failed: '#DC2626',
    duplicate: '#6B7280',
};

export default function StatsPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.getStats()
            .then(setStats)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading-state">Loading stats...</div>;
    if (error) return <div className="banner banner-error">⚠ {error}</div>;
    if (!stats) return null;

    const statusData = Object.entries(stats.submission_statuses).map(([k, v]) => ({ name: k, value: v }));

    return (
        <div>
            <div className="page-header">
                <h1>DB Stats</h1>
            </div>

            {/* Stat Cards */}
            <div className="stat-cards">
                <div className="stat-card">
                    <div className="stat-card-value">{stats.total_routes}</div>
                    <div className="stat-card-label">Total Routes</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{stats.active_routes}</div>
                    <div className="stat-card-label">Active Routes</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{stats.total_locations}</div>
                    <div className="stat-card-label">Locations</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-value">{stats.total_landing_zones}</div>
                    <div className="stat-card-label">Landing Zones</div>
                </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
                {/* Routes per Network */}
                {stats.routes_per_network.length > 0 && (
                    <div className="chart-container">
                        <div className="chart-title">Routes per Network</div>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.routes_per_network}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                                <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* LZs per Location */}
                {stats.lz_per_location.length > 0 && (
                    <div className="chart-container">
                        <div className="chart-title">Landing Zones per Location (Top 10)</div>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={stats.lz_per_location}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                                <Bar dataKey="count" fill="#16A34A" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Submission Status Pie */}
                {statusData.length > 0 && (
                    <div className="chart-container">
                        <div className="chart-title">Submission Statuses</div>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                >
                                    {statusData.map((entry) => (
                                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#6B7280'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            {stats.recent_approved.length > 0 && (
                <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Recent Approved</h3>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Route</th>
                                <th>Mission File</th>
                                <th>Approved At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recent_approved.map(r => (
                                <tr key={r.id}>
                                    <td className="table-id">#{r.id.slice(0, 6)}</td>
                                    <td>{r.route}</td>
                                    <td className="table-meta">{r.mission_file}</td>
                                    <td className="table-meta">{new Date(r.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
