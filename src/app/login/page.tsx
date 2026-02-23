'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (result?.error) {
            setError('Invalid email or password. Please try again.');
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">Medical Supply OMS</div>
                <h1>Welcome Back</h1>
                <p className="login-subtitle">Sign in to manage your medical supply orders</p>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email address</label>
                        <input
                            className="form-input"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', marginTop: 8 }}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <p><strong>Demo Accounts:</strong></p>
                    <p>admin@oms.com / password123</p>
                    <p>order_entry@oms.com / password123</p>
                    <p>ops@oms.com / password123</p>
                </div>
            </div>
        </div>
    );
}
