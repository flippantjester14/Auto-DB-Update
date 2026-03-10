/**
 * API service for RedWing DB Automation backend.
 *
 * All calls go through authFetch() — currently a no-op wrapper.
 * When Firebase is added, only authFetch needs updating to attach
 * the Authorization header.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Authenticated fetch wrapper.
 * Currently passes requests through unchanged.
 * Firebase integration: add `Authorization: Bearer <token>` here.
 */
async function authFetch(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        // TODO: add Firebase token header here
        ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return res.json();
}

export const api = {
    // ── Submissions ─────────────────────────────────────────────────────
    listSubmissions: () => authFetch('/submissions'),
    getSubmission: (id) => authFetch(`/submissions/${id}`),

    updateStatus: (id, status, reason) =>
        authFetch(`/submissions/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, reason }),
        }),

    rejectSubmission: (id, reason) =>
        authFetch(`/submissions/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'rejected', reason }),
        }),

    markAsDuplicate: (id) =>
        authFetch(`/submissions/${id}/mark-duplicate`, {
            method: 'PATCH',
        }),

    markDuplicateWithId: (id, duplicateOf, reason) =>
        authFetch(`/submissions/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({
                status: 'duplicate',
                duplicate_of: duplicateOf,
                reason,
            }),
        }),

    // ── Files ───────────────────────────────────────────────────────────
    downloadFiles: (id) =>
        authFetch(`/submissions/${id}/download-files`, { method: 'POST' }),

    // ── Waypoints ───────────────────────────────────────────────────────
    getWaypointData: (id) => authFetch(`/submissions/${id}/waypoint-data`),

    // ── Preview ─────────────────────────────────────────────────────────
    getResolvePreview: (id) => authFetch(`/submissions/${id}/resolve-preview`),

    // ── Approve ─────────────────────────────────────────────────────────
    approveSubmission: (id, confirmedNewEntities) =>
        authFetch(`/submissions/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ confirmed_new_entities: confirmedNewEntities }),
        }),

    // ── Review State ────────────────────────────────────────────────────
    updateReviewState: (id, { waypoint_verified, id_resolution_reviewed }) =>
        authFetch(`/submissions/${id}/review-state`, {
            method: 'PATCH',
            body: JSON.stringify({ waypoint_verified, id_resolution_reviewed }),
        }),

    // ── Pipeline Status ─────────────────────────────────────────────────
    getPipelineStatus: (id) =>
        authFetch(`/submissions/${id}/pipeline-status`),

    // ── Stats ───────────────────────────────────────────────────────────
    getStats: () => authFetch('/stats'),

    // ── Config ──────────────────────────────────────────────────────────
    getCesiumToken: () => authFetch('/config/cesium-token'),
};
