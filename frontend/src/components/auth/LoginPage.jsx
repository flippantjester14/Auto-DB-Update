import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
    const { login } = useAuth();

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

                <button
                    onClick={login}
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
