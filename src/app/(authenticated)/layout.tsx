import Providers from '@/components/Providers';
import Sidebar from '@/components/layout/Sidebar';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    return (
        <Providers>
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">{children}</main>
            </div>
        </Providers>
    );
}
