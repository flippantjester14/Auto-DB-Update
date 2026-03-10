import React from 'react';

const STATUS_MAP = {
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
    failed: 'status-failed',
    duplicate: 'status-duplicate',
};

export default function StatusBadge({ status }) {
    return (
        <span className={`status-badge ${STATUS_MAP[status] || 'status-pending'}`}>
            {status}
        </span>
    );
}
