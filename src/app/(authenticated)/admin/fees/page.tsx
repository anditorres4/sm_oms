'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Edit2, Trash2, List } from 'lucide-react';

interface FeeSchedule {
    id: string;
    payerId: string;
    hcpcsCode: string;
    rate: number;
}

interface Payer {
    id: string;
    name: string;
    feeSchedule: FeeSchedule[];
}

export default function AdminFeesPage() {
    const { data: session } = useSession();
    const [payers, setPayers] = useState<Payer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPayer, setSelectedPayer] = useState<Payer | null>(null);

    // Payer Modal State
    const [payerModalOpen, setPayerModalOpen] = useState(false);
    const [editingPayer, setEditingPayer] = useState<Payer | null>(null);
    const [payerName, setPayerName] = useState('');

    // Fee Modal State
    const [feeModalOpen, setFeeModalOpen] = useState(false);
    const [editingFee, setEditingFee] = useState<FeeSchedule | null>(null);
    const [hcpcsCode, setHcpcsCode] = useState('');
    const [rate, setRate] = useState('');

    useEffect(() => {
        fetchPayers();
    }, []);

    const fetchPayers = async (reselectPayerId?: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/payers');
            const data = await res.json();
            setPayers(data);
            if (reselectPayerId) {
                const updated = data.find((p: Payer) => p.id === reselectPayerId);
                if (updated) setSelectedPayer(updated);
            } else if (selectedPayer) {
                const updated = data.find((p: Payer) => p.id === selectedPayer.id);
                if (updated) setSelectedPayer(updated);
            }
        } catch (error) {
            console.error('Failed to fetch payers', error);
        }
        setLoading(false);
    };

    // --- Payer Handlers ---
    const handleOpenPayerModal = (payer?: Payer) => {
        if (payer) {
            setEditingPayer(payer);
            setPayerName(payer.name);
        } else {
            setEditingPayer(null);
            setPayerName('');
        }
        setPayerModalOpen(true);
    };

    const handleSavePayer = async () => {
        if (!payerName.trim()) return;

        const url = editingPayer ? `/api/payers/${editingPayer.id}` : '/api/payers';
        const method = editingPayer ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: payerName.trim() }),
            });
            if (res.ok) {
                setPayerModalOpen(false);
                fetchPayers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save payer');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeletePayer = async (id: string) => {
        if (!confirm('Are you sure you want to delete this payer and ALL its fee schedules?')) return;
        try {
            const res = await fetch(`/api/payers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (selectedPayer?.id === id) setSelectedPayer(null);
                fetchPayers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete payer');
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- Fee Handlers ---
    const handleOpenFeeModal = (fee?: FeeSchedule) => {
        if (fee) {
            setEditingFee(fee);
            setHcpcsCode(fee.hcpcsCode);
            setRate(fee.rate.toString());
        } else {
            setEditingFee(null);
            setHcpcsCode('');
            setRate('');
        }
        setFeeModalOpen(true);
    };

    const handleSaveFee = async () => {
        if (!hcpcsCode.trim() || !rate || !selectedPayer) return;

        const url = editingFee ? `/api/fees/${editingFee.id}` : '/api/fees';
        const method = editingFee ? 'PUT' : 'POST';

        const payload = {
            payerId: selectedPayer.id,
            hcpcsCode: hcpcsCode.trim(),
            rate
        };

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setFeeModalOpen(false);
                fetchPayers(selectedPayer.id);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save fee');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteFee = async (id: string) => {
        if (!confirm('Are you sure you want to delete this fee schedule line?')) return;
        try {
            const res = await fetch(`/api/fees/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchPayers(selectedPayer?.id);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete fee');
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="loader"><div className="spinner" /></div>;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 32 }}>

            {/* Payers Column */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Payers</h2>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenPayerModal()}>
                        <Plus style={{ width: 14, height: 14 }} /> Add
                    </button>
                </div>

                <div className="table-container" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <table className="table">
                        <tbody>
                            {payers.length === 0 ? (
                                <tr>
                                    <td style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No payers found.</td>
                                </tr>
                            ) : (
                                payers.map(payer => (
                                    <tr
                                        key={payer.id}
                                        style={{
                                            cursor: 'pointer',
                                            background: selectedPayer?.id === payer.id ? 'var(--light-teal)' : 'transparent',
                                            borderLeft: selectedPayer?.id === payer.id ? '4px solid var(--teal)' : '4px solid transparent'
                                        }}
                                    >
                                        <td onClick={() => setSelectedPayer(payer)} style={{ fontWeight: selectedPayer?.id === payer.id ? 600 : 400 }}>
                                            {payer.name}
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {payer.feeSchedule.length} fee rates
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); setSelectedPayer(payer); }} title="View Fees">
                                                <List style={{ width: 16, height: 16, color: 'var(--navy)' }} />
                                            </button>
                                            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); handleOpenPayerModal(payer); }} title="Edit">
                                                <Edit2 style={{ width: 16, height: 16, color: 'var(--teal)' }} />
                                            </button>
                                            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); handleDeletePayer(payer.id); }} title="Delete">
                                                <Trash2 style={{ width: 16, height: 16, color: 'var(--danger, #ef4444)' }} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Fee Schedule Column */}
            <div>
                {!selectedPayer ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 8, border: '1px dashed var(--border)' }}>
                        Select a Payer from the left to manage its fee schedule.
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                                Fee Schedule: <span style={{ color: 'var(--teal)' }}>{selectedPayer.name}</span>
                            </h2>
                            <button className="btn btn-primary btn-sm" onClick={() => handleOpenFeeModal()}>
                                <Plus style={{ width: 14, height: 14 }} /> Add Rate
                            </button>
                        </div>

                        <div className="table-container" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>HCPCS Code</th>
                                        <th style={{ textAlign: 'right' }}>Allowable Rate</th>
                                        <th style={{ textAlign: 'right', width: 100 }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedPayer.feeSchedule.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                                                No fee schedule lines found for this payer.
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedPayer.feeSchedule
                                            .sort((a, b) => a.hcpcsCode.localeCompare(b.hcpcsCode))
                                            .map(fee => (
                                                <tr key={fee.id}>
                                                    <td><strong style={{ fontFamily: 'monospace' }}>{fee.hcpcsCode}</strong></td>
                                                    <td style={{ textAlign: 'right' }}>${parseFloat(fee.rate.toString()).toFixed(2)}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button className="btn-ghost" onClick={() => handleOpenFeeModal(fee)} title="Edit">
                                                            <Edit2 style={{ width: 16, height: 16, color: 'var(--teal)' }} />
                                                        </button>
                                                        <button className="btn-ghost" onClick={() => handleDeleteFee(fee.id)} title="Delete">
                                                            <Trash2 style={{ width: 16, height: 16, color: 'var(--danger, #ef4444)' }} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Payer Modal */}
            {payerModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>
                            {editingPayer ? 'Edit Payer' : 'Add Payer'}
                        </h3>
                        <div className="form-group">
                            <label>Payer Name</label>
                            <input className="input" value={payerName} onChange={e => setPayerName(e.target.value)} autoFocus />
                        </div>
                        <div className="modal-actions" style={{ marginTop: 24 }}>
                            <button className="btn btn-secondary" onClick={() => setPayerModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSavePayer} disabled={!payerName.trim()}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fee Modal */}
            {feeModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>
                            {editingFee ? 'Edit Fee Rate' : 'Add Fee Rate'}
                        </h3>
                        <div className="form-group">
                            <label>HCPCS Code *</label>
                            <input className="input" style={{ textTransform: 'uppercase' }} value={hcpcsCode} onChange={e => setHcpcsCode(e.target.value)} autoFocus />
                        </div>
                        <div className="form-group">
                            <label>Allowable Rate ($) *</label>
                            <input type="number" step="0.01" className="input" value={rate} onChange={e => setRate(e.target.value)} />
                        </div>
                        <div className="modal-actions" style={{ marginTop: 24 }}>
                            <button className="btn btn-secondary" onClick={() => setFeeModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveFee} disabled={!hcpcsCode.trim() || !rate}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
