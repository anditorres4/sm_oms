'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Download, Edit, Clock, FileText, Package,
    AlertCircle, CheckCircle, Truck, ChevronDown, User, Stethoscope
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    payment_confirmed: 'Payment Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

const EVENT_LABELS: Record<string, string> = {
    ORDER_CREATED: 'Order Created',
    ORDER_UPDATED: 'Order Updated',
    ORDER_SUBMITTED: 'Order Submitted',
    STATUS_CHANGED: 'Status Changed',
    PDF_GENERATED: 'PDF Generated',
};

function toNum(val: any): number {
    if (typeof val === 'number') return val;
    return parseFloat(val?.toString() ?? '0') || 0;
}

function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatCurrency(val: any) {
    return `$${toNum(val).toFixed(2)}`;
}

export default function OrderDetailPage() {
    const { data: session } = useSession();
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const fetchOrder = useCallback(async () => {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
            setOrder(await res.json());
        }
        setLoading(false);
    }, [orderId]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    const handleStatusChange = async () => {
        if (!newStatus) return;
        setUpdatingStatus(true);
        const res = await fetch(`/api/orders/${orderId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
            await fetchOrder();
            setShowStatusModal(false);
            setNewStatus('');
        }
        setUpdatingStatus(false);
    };

    if (loading) return <div className="loader"><div className="spinner" /></div>;
    if (!order) return (
        <div className="empty-state">
            <AlertCircle />
            <h3>Order not found</h3>
            <p>The order you&apos;re looking for doesn&apos;t exist.</p>
            <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 16 }}>Back to Dashboard</Link>
        </div>
    );

    const orderTotal = order.lines?.reduce((s: number, l: any) => s + toNum(l.lineTotal), 0) || 0;
    const checklist = order.insuranceChecklist as Record<string, boolean> | null;

    const checklistLabels = [
        { key: 'activeCoverage', label: 'Active coverage and plan type' },
        { key: 'dmeBenefit', label: 'DME benefit; in-network requirement' },
        { key: 'hcpcsCoveragePolicy', label: 'HCPCS coverage policy' },
        { key: 'priorAuthTriggers', label: 'Prior auth / WOPD triggers' },
        { key: 'deductibleCoinsurance', label: 'Deductible/coinsurance' },
        { key: 'documentationRequirements', label: 'Documentation requirements' },
        { key: 'payerGuidelinesChecked', label: 'Payer guidelines checked' },
    ];

    return (
        <>
            {/* Back link */}
            <Link href="/dashboard" className="btn btn-ghost" style={{ marginBottom: 12 }}>
                <ArrowLeft /> Back to Dashboard
            </Link>

            {/* Header */}
            <div className="detail-header">
                <div className="detail-header-left">
                    <h1>Order #{order.id.slice(-8).toUpperCase()}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                        <span className={`status-badge ${order.isDraft ? 'draft' : order.status}`}>
                            {order.isDraft ? 'Draft' : STATUS_LABELS[order.status] || order.status}
                        </span>
                        {order.isDraft && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Draft — not yet submitted
                            </span>
                        )}
                    </div>
                </div>
                <div className="detail-header-right">
                    {order.isDraft && (
                        <Link href={`/orders/new?edit=${order.id}`} className="btn btn-secondary">
                            <Edit /> Edit Draft
                        </Link>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowStatusModal(true)}>
                        Change Status <ChevronDown />
                    </button>
                </div>
            </div>

            {/* Info cards */}
            <div className="detail-info-grid">
                <div className="detail-info-card">
                    <h4><User style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> Patient</h4>
                    <p>{order.patient?.firstName} {order.patient?.lastName}</p>
                    <p className="sub">{order.patient?.address}</p>
                    <p className="sub">{order.patient?.phone}</p>
                </div>
                <div className="detail-info-card">
                    <h4><Stethoscope style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> Clinician / Clinic</h4>
                    <p>{order.clinician?.firstName} {order.clinician?.lastName}</p>
                    <p className="sub">{order.clinician?.clinicName}</p>
                    <p className="sub">{order.clinician?.clinicAddress}</p>
                </div>
                <div className="detail-info-card">
                    <h4><Package style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> Order Total</h4>
                    <p style={{ fontSize: '1.4rem', color: 'var(--teal)' }}>{formatCurrency(orderTotal)}</p>
                    <p className="sub">{order.lines?.length || 0} line item{order.lines?.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="detail-info-card">
                    <h4><Clock style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} /> Dates</h4>
                    <p className="sub">Created: {formatDate(order.createdAt)}</p>
                    {order.submittedAt && <p className="sub">Submitted: {formatDate(order.submittedAt)}</p>}
                    <p className="sub">Updated: {formatDate(order.updatedAt)}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>Details</button>
                <button className={`tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>Documents</button>
                <button className={`tab ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>Timeline</button>
            </div>

            {/* Details Tab */}
            {activeTab === 'details' && (
                <div className="card">
                    <div className="card-body">
                        {/* Product Lines */}
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--navy)' }}>Product Lines</h3>
                        <div className="table-wrapper" style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 24 }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>HCPCS</th>
                                        <th>Vendor</th>
                                        <th>Qty</th>
                                        <th>Unit Cost</th>
                                        <th>Billable Amount</th>
                                        <th>Margin</th>
                                        <th>Total</th>
                                        <th>Form</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.lines?.map((line: any) => {
                                        const margin = (Number(line.unitPrice) - Number(line.unitCost)) * line.quantity;
                                        return (
                                            <tr key={line.id}>
                                                <td style={{ fontWeight: 600 }}>{line.product?.name}</td>
                                                <td style={{ fontFamily: 'monospace' }}>{line.product?.hcpcsCode}</td>
                                                <td>{line.product?.vendor?.name || '—'}</td>
                                                <td>{line.quantity}</td>
                                                <td>{formatCurrency(line.unitCost)}</td>
                                                <td>{formatCurrency(line.unitPrice)}</td>
                                                <td style={{ color: margin >= 0 ? 'var(--status-approved)' : '#ef4444' }}>{formatCurrency(margin)}</td>
                                                <td style={{ fontWeight: 700 }}>{formatCurrency(line.lineTotal)}</td>
                                                <td>
                                                    {line.measurementFormUrl ? (
                                                        <a href={line.measurementFormUrl} target="_blank" className="btn btn-ghost btn-sm">
                                                            <Download style={{ width: 12, height: 12 }} /> View
                                                        </a>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>N/A</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="pricing-summary">
                            <h3>Price Breakdown</h3>
                            {order.lines?.map((l: any) => (
                                <div className="pricing-row" key={l.id}>
                                    <span>{l.product?.name} × {l.quantity}</span>
                                    <span>{formatCurrency(l.lineTotal)}</span>
                                </div>
                            ))}
                            <div className="pricing-row">
                                <span className="total-label">Order Total</span>
                                <span className="total-value">{formatCurrency(orderTotal)}</span>
                            </div>
                        </div>

                        {/* Insurance Checklist */}
                        {checklist && (
                            <div style={{ marginTop: 28 }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: 'var(--navy)' }}>Insurance Verification</h3>
                                {checklistLabels.map((item) => (
                                    <div key={item.key} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: '0.85rem' }}>
                                        <span style={{ color: checklist[item.key] ? 'var(--status-approved)' : '#ef4444' }}>
                                            {checklist[item.key] ? '✓' : '✗'}
                                        </span>
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
                <div className="card">
                    <div className="card-body">
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: 'var(--navy)' }}>Documents</h3>

                        {order.documents?.length > 0 ? (
                            order.documents.map((doc: any) => {
                                let docTitle = 'Document';
                                if (doc.type === 'ENCOUNTER') docTitle = 'Encounter Form';
                                if (doc.type === 'INVOICE') docTitle = 'Patient Invoice';
                                if (doc.type === 'POD') docTitle = 'Proof of Delivery';

                                return (
                                    <div key={doc.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 16px', border: '1px solid var(--border-light)',
                                        borderRadius: 'var(--radius-md)', marginBottom: 8,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <FileText style={{ width: 24, height: 24, color: 'var(--teal)' }} />
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                    {docTitle} {doc.version > 1 ? `v${doc.version}` : ''}
                                                </p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    Generated {formatDate(doc.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <a href={doc.fileUrl} target="_blank" download className="btn btn-secondary btn-sm">
                                            <Download style={{ width: 14, height: 14 }} /> Download
                                        </a>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="empty-state" style={{ padding: 40 }}>
                                <FileText />
                                <h3>No documents yet</h3>
                                <p>Documents will appear here after the order is submitted</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
                <div className="card">
                    <div className="card-body">
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, color: 'var(--navy)' }}>Audit Timeline</h3>

                        {order.auditEvents?.length > 0 ? (
                            <div className="timeline">
                                {order.auditEvents.map((event: any) => {
                                    const eventClass =
                                        event.eventType === 'ORDER_SUBMITTED' ? 'success' :
                                            event.eventType === 'STATUS_CHANGED' ? 'warning' :
                                                event.eventType === 'PDF_GENERATED' ? 'info' : '';

                                    let description = '';
                                    const payload = event.eventPayload;
                                    if (event.eventType === 'STATUS_CHANGED' && payload) {
                                        description = `Status changed from "${payload.fromLabel || payload.from}" to "${payload.toLabel || payload.to}"`;
                                    } else if (event.eventType === 'ORDER_CREATED') {
                                        description = payload?.note || 'Order was created';
                                    } else if (event.eventType === 'ORDER_SUBMITTED') {
                                        description = 'Order submitted and encounter form generated';
                                    } else if (event.eventType === 'ORDER_UPDATED') {
                                        const fields = payload?.fields;
                                        description = fields ? `Updated fields: ${fields.join(', ')}` : 'Order was updated';
                                    } else if (event.eventType === 'PDF_GENERATED') {
                                        description = 'Encounter form PDF was generated';
                                    } else {
                                        description = payload?.note || event.eventType;
                                    }

                                    return (
                                        <div key={event.id} className={`timeline-item ${eventClass}`}>
                                            <div className="timeline-item-header">
                                                <span className="timeline-item-type">
                                                    {EVENT_LABELS[event.eventType] || event.eventType}
                                                </span>
                                                <span className="timeline-item-time">{formatDate(event.createdAt)}</span>
                                            </div>
                                            <p className="timeline-item-desc">{description}</p>
                                            <p className="timeline-item-actor">by {event.actor?.name || 'System'}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: 40 }}>
                                <Clock />
                                <h3>No events yet</h3>
                                <p>Order activity will be tracked here</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Status Change Modal */}
            {showStatusModal && (
                <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Change Order Status</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                            Current status: <strong>{order.isDraft ? 'Draft' : STATUS_LABELS[order.status]}</strong>
                        </p>
                        <div className="form-group">
                            <label className="form-label">New Status</label>
                            <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                                <option value="">Select status...</option>
                                {STATUS_OPTIONS.map(([v, l]) => (
                                    <option key={v} value={v}>{l}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleStatusChange}
                                disabled={!newStatus || updatingStatus}
                            >
                                {updatingStatus ? 'Updating...' : 'Update Status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
