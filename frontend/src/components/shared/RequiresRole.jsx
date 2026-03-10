/**
 * Firebase-ready RBAC wrapper.
 *
 * Currently renders children unconditionally.
 * When Firebase is added, check user's role claim here.
 */
import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function RequiresRole({ role, children, fallback = null }) {
    const { user } = useAuth();
    // TODO: Replace with actual Firebase role check
    // if (user.role !== role && user.role !== 'admin') return fallback;
    return <>{children}</>;
}
