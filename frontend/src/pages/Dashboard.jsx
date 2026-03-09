import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const STATUS_COLORS = {
    pending: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    failed: '#dc2626',
    duplicate: '#6b7280',
};

export default function Dashboard() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSubmissions = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.listSubmissions();
            setSubmissions(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSubmissions(); }, []);

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2>Submissions</h2>
                <button className="btn btn-secondary" onClick={fetchSubmissions} disabled={loading}>
                    {loading ? 'Loading...' : '↻ Refresh'}
                </button>
            </div>

            {error && <div className="error-banner">Error: {error}</div>}

            {!loading && submissions.length === 0 && (
                <div className="empty-state">No submissions yet. Waiting for Google Form responses.</div>
            )}

            <div className="submissions-grid">
                {submissions.map((sub) => (
                    <Link
                        to={`/submissions/${sub.id}`}
                        key={sub.id}
                        className={`submission-card ${sub.status === 'duplicate' ? 'is-duplicate' : ''}`}
                    >
                        <div className="card-header">
                            <span className="submission-id">{sub.id.slice(0, 8)}...</span>
                            <span className="status-badge" style={{ backgroundColor: STATUS_COLORS[sub.status] }}>
                                {sub.status}
                            </span>
                        </div>
                        <div className="card-route">
                            <span className="route-from">{sub.payload.source_location_name}</span>
                            <span className="route-arrow">→</span>
                            <span className="route-to">{sub.payload.destination_location_name}</span>
                        </div>
                        <div className="card-meta">
                            <span>🛫 {sub.payload.takeoff_direction}°</span>
                            <span>🛬 {sub.payload.approach_direction}°</span>
                            <span>📁 {sub.payload.mission_filename}</span>
                        </div>
                        <div className="card-timestamp">{new Date(sub.created_at).toLocaleString()}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
