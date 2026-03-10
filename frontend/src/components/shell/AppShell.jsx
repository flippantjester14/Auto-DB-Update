import React from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
    return (
        <div className="app-shell">
            <TopBar />
            <div className="app-body">
                <Sidebar />
                <main className="app-main">
                    {children}
                </main>
            </div>
        </div>
    );
}
