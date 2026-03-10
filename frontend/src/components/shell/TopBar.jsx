import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function TopBar() {
    const { user } = useAuth();
    const [query, setQuery] = useState('');

    const initials = (user.displayName || user.email)
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <header className="topbar">
            <div className="topbar-brand">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                </svg>
                RedWing Ops
            </div>

            <div className="topbar-search">
                <Search size={16} />
                <input
                    type="text"
                    placeholder="Search submissions..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
            </div>

            <div className="topbar-actions">
                <div className="topbar-avatar" title={user.email}>
                    {initials}
                </div>
            </div>
        </header>
    );
}
