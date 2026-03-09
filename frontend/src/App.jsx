import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ReviewPage from './pages/ReviewPage';

export default function App() {
    return (
        <div className="app">
            <header className="app-header">
                <h1>🦅 RedWing DB Automation</h1>
            </header>
            <main className="app-main">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/submissions/:id" element={<ReviewPage />} />
                </Routes>
            </main>
        </div>
    );
}
