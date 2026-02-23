import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
        redirect('/dashboard');
    }

    return (
        <div className="admin-layout">
            <header style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--navy)' }}>Admin Dashboard</h1>
            </header>
            {children}
        </div>
    );
}
