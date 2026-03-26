import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
    const { login } = useAuth();
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async () => {
        setErrorMsg('');
        try {
            await login();
        } catch (err) {
            if (err.message === 'Invalid domain') {
                setErrorMsg('Access denied. Please sign in with your @redwinglabs.in account.');
            } else {
                setErrorMsg('Failed to sign in. Please try again.');
            }
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFFFF',
            fontFamily: 'Barlow, sans-serif'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '48px'
            }}>
                <div style={{
                    width: 10,
                    height: 10,
                    background: '#DC2626',
                    borderRadius: 2
                }} />
                <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontWeight: 600,
                    fontSize: '22px',
                    color: '#111827',
                    letterSpacing: '0.02em'
                }}>
                    RedWing Ops
                </span>
            </div>

            <div style={{
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '40px',
                width: '360px',
                textAlign: 'center'
            }}>
                <h2 style={{
                    fontFamily: 'Barlow, sans-serif',
                    fontWeight: 600,
                    fontSize: '18px',
                    color: '#111827',
                    marginBottom: '8px'
                }}>
                    Sign in to continue
                </h2>
                <p style={{
                    fontSize: '13px',
                    color: '#6B7280',
                    marginBottom: '32px'
                }}>
                    Use your RedWing Google account
                </p>

                {errorMsg && (
                    <div style={{
                        marginBottom: '24px',
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        color: '#991B1B',
                        fontSize: '13px',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '2px', flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>{errorMsg}</span>
                    </div>
                )}

                <button
                    onClick={handleLogin}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '10px 16px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: 'Barlow, sans-serif',
                        fontWeight: 500,
                        color: '#111827'
                    }}
                >
                    <img
                        src="https://www.google.com/favicon.ico"
                        width={16}
                        height={16}
                        alt="Google"
                    />
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
