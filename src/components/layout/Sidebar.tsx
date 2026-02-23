'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LayoutDashboard, PlusCircle, LogOut, Package } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();

    if (!session) return null;

    const user = session.user;
    const initials = user?.name
        ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase()
        : '?';

    const navItems = [
        { href: '/dashboard', label: 'Orders Dashboard', icon: LayoutDashboard },
        { href: '/orders/new', label: 'New Order', icon: PlusCircle },
    ];

    if (user?.role === 'admin') {
        navItems.push({ href: '/admin/products', label: 'Admin: Products', icon: Package });
        navItems.push({ href: '/admin/vendors', label: 'Admin: Vendors', icon: Package });
        navItems.push({ href: '/admin/fees', label: 'Admin: Fees', icon: Package });
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h2>
                    <Package style={{ display: 'inline', width: 18, height: 18, marginRight: 6, verticalAlign: 'text-bottom' }} />
                    Medical Supply OMS
                </h2>
                <span>Order Management System</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link key={item.href} href={item.href} className={isActive ? 'active' : ''}>
                            <Icon />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="sidebar-user">
                <div className="sidebar-user-avatar">{initials}</div>
                <div className="sidebar-user-info">
                    <p>{user?.name}</p>
                    <span>{(user as any)?.role?.replace('_', ' ')}</span>
                </div>
                <button
                    className="btn-ghost"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    style={{ padding: 6 }}
                    title="Sign out"
                >
                    <LogOut style={{ width: 16, height: 16 }} />
                </button>
            </div>
        </aside>
    );
}
