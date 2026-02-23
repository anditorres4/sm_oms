'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PlusCircle, Search, Package } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    payment_confirmed: 'Payment Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
};

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchName, setSearchName] = useState('');
    const [searchId, setSearchId] = useState('');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (searchName) params.set('patientName', searchName);
        if (searchId) params.set('orderId', searchId);

        const res = await fetch(`/api/orders?${params.toString()}`);
        if (res.ok) {
            setOrders(await res.json());
        }
        setLoading(false);
    }, [statusFilter, searchName, searchId]);

    useEffect(() => {
        const timer = setTimeout(fetchOrders, 300);
        return () => clearTimeout(timer);
    }, [fetchOrders]);

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Orders Dashboard</h1>
                    <p>Manage and track medical supply orders</p>
                </div>
                <Link href="/orders/new" className="btn btn-primary">
                    <PlusCircle />
                    New Order
                </Link>
            </div>

            <div className="card">
                <div className="card-body" style={{ paddingBottom: 0 }}>
                    <div className="filters-bar">
                        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 280 }}>
                            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
                            <input
                                className="form-input"
                                style={{ paddingLeft: 34 }}
                                placeholder="Search by patient name..."
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                            />
                        </div>
                        <input
                            className="form-input"
                            placeholder="Search by Order ID..."
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                        />
                        <select
                            className="form-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            {Object.entries(STATUS_LABELS).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="table-wrapper">
                    {loading ? (
                        <div className="loader"><div className="spinner" /></div>
                    ) : orders.length === 0 ? (
                        <div className="empty-state">
                            <Package />
                            <h3>No orders found</h3>
                            <p>Try adjusting your filters or create a new order</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Patient Name</th>
                                    <th>Clinic</th>
                                    <th>Status</th>
                                    <th>Created At</th>
                                    <th>Updated At</th>
                                    <th>Assigned To</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr
                                        key={order.id}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => router.push(`/orders/${order.id}`)}
                                    >
                                        <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--navy)' }}>
                                            {order.id.slice(-8).toUpperCase()}
                                        </td>
                                        <td>
                                            <strong>{order.patient?.firstName} {order.patient?.lastName}</strong>
                                        </td>
                                        <td>{order.clinician?.clinicName || '—'}</td>
                                        <td>
                                            <span className={`status-badge ${order.isDraft ? 'draft' : order.status}`}>
                                                {order.isDraft ? 'Draft' : STATUS_LABELS[order.status] || order.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            {formatDate(order.createdAt)}
                                        </td>
                                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            {formatDate(order.updatedAt)}
                                        </td>
                                        <td>{order.assignedTo?.name || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}
