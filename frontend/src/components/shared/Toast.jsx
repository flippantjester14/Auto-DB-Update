import React, { useState, useCallback } from 'react';

let toastId = 0;

const ToastContext = React.createContext(null);

export function useToast() {
    return React.useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, duration = 4000) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className="toast">{t.message}</div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
