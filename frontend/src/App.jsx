import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/shared/Toast';
import AppShell from './components/shell/AppShell';
import InboxPage from './pages/InboxPage';
import SubmissionDetail from './components/submissions/SubmissionDetail';
import StatsPage from './pages/StatsPage';
import ViewerPage from './pages/ViewerPage';

export default function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <AppShell>
                    <Routes>
                        <Route path="/" element={<InboxPage />} />
                        <Route path="/submissions/:id" element={<SubmissionDetail />} />
                        <Route path="/stats" element={<StatsPage />} />
                        <Route path="/viewer" element={<ViewerPage />} />
                    </Routes>
                </AppShell>
            </ToastProvider>
        </AuthProvider>
    );
}
