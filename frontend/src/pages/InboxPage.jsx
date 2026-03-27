import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import { useToast } from '../components/shared/Toast';
import StatusBadge from '../components/shared/StatusBadge';

function timeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function InboxPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const statusFilter = searchParams.get('status');
    const addToast = useToast();

    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const prevIdsRef = useRef(new Set());

    const fetchSubmissions = async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        setError(null);
        try {
            const data = await api.listSubmissions();
            // Detect new submissions for toast
            if (isPolling && prevIdsRef.current.size > 0) {
                for (const sub of data) {
                    if (!prevIdsRef.current.has(sub.id)) {
                        addToast(`New submission: ${sub.payload.source_location_name} → ${sub.payload.destination_location_name}`);
                    }
                }
            }
            prevIdsRef.current = new Set(data.map(s => s.id));
            setSubmissions(data);
        } catch (err) {
            if (!isPolling) setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSubmissions(); }, []);

    // Poll every 10s
    useEffect(() => {
        const interval = setInterval(() => fetchSubmissions(true), 10000);
        return () => clearInterval(interval);
    }, []);

    const filtered = statusFilter
        ? submissions.filter(s => s.status === statusFilter)
        : submissions;

    const pendingCount = submissions.filter(s => s.status === 'pending').length;

    if (loading) return <div className="loading-state">Loading submissions...</div>;

    return (
        <div>
            <div className="page-header">
                <h1>Submissions {statusFilter && `— ${statusFilter}`}</h1>
                <button className="btn" onClick={() => fetchSubmissions()}>↻ Refresh</button>
            </div>

            {error && <div className="banner banner-error">⚠ {error}</div>}

            {filtered.length === 0 ? (
                <div className="empty-state">
                    <p>No submissions{statusFilter ? ` with status "${statusFilter}"` : ' yet'}.</p>
                </div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: 30 }}></th>
                            <th>ID</th>
                            <th>Route</th>
                            <th>Mission File</th>
                            <th>Network</th>
                            <th>Received</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((sub) => (
                            <tr
                                key={sub.id}
                                onClick={() => navigate(`/submissions/${sub.id}`)}
                                className={!prevIdsRef.current.has(sub.id) ? 'row-new' : ''}
                            >
                                <td>
                                    {sub.status === 'pending' && <span className="unread-dot" />}
                                </td>
                                <td className="table-id">#{sub.id.slice(0, 6)}</td>
                                <td>
                                    <span className="table-route">
                                        {sub.payload.source_location_name}
                                        <span className="table-route-arrow"> → </span>
                                        {sub.payload.destination_location_name}
                                    </span>
                                    {sub.payload.is_update && (
                                        <span style={{
                                            marginLeft: '8px', fontSize: '0.65rem', fontWeight: 600,
                                            padding: '2px 6px', borderRadius: '4px',
                                            backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd'
                                        }}>
                                            UPDATE
                                        </span>
                                    )}
                                </td>
                                <td className="table-meta">{sub.payload.mission_filename}</td>
                                <td className="table-meta">{sub.payload.network_name}</td>
                                <td className="table-meta">{timeAgo(sub.created_at)}</td>
                                <td><StatusBadge status={sub.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
