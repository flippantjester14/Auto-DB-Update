/**
 * Auth context — mock implementation, Firebase-ready.
 *
 * When Firebase is introduced, only this file changes.
 * All other components use the useAuth() hook.
 */
import React, { createContext, useContext } from 'react';

const ROLES = {
    VIEWER: 'viewer',
    OPERATOR: 'operator',
    ADMIN: 'admin',
};

const MOCK_USER = {
    uid: 'dev-user-1',
    email: 'ops@redwinglabs.in',
    role: ROLES.OPERATOR,
    displayName: 'Operator',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const value = {
        user: MOCK_USER,
        roles: ROLES,
        loading: false,
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

export { ROLES };
