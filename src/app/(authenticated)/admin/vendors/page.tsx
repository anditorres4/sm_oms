'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Vendor {
    id: string;
    name: string;
}

export default function AdminVendorsPage() {
    const { data: session } = useSession();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [name, setName] = useState('');

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/vendors');
            const data = await res.json();
            setVendors(data);
        } catch (error) {
            console.error('Failed to fetch vendors', error);
        }
        setLoading(false);
    };

    const handleOpenModal = (vendor?: Vendor) => {
        if (vendor) {
            setEditingVendor(vendor);
            setName(vendor.name);
        } else {
            setEditingVendor(null);
            setName('');
        }
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);

        const url = editingVendor ? `/api/vendors/${editingVendor.id}` : '/api/vendors';
        const method = editingVendor ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() }),
            });

            if (res.ok) {
                setModalOpen(false);
                fetchVendors();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred');
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this vendor?')) return;

        try {
            const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchVendors();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete');
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="loader"><div className="spinner" /></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Manage Vendors</h2>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus style={{ width: 16, height: 16 }} /> Add Vendor
                </button>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vendors.length === 0 ? (
                            <tr>
                                <td colSpan={2} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                                    No vendors found.
                                </td>
                            </tr>
                        ) : (
                            vendors.map(vendor => (
                                <tr key={vendor.id}>
                                    <td>{vendor.name}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn-ghost" onClick={() => handleOpenModal(vendor)} title="Edit">
                                            <Edit2 style={{ width: 16, height: 16, color: 'var(--teal)' }} />
                                        </button>
                                        <button className="btn-ghost" onClick={() => handleDelete(vendor.id)} title="Delete">
                                            <Trash2 style={{ width: 16, height: 16, color: 'var(--danger, #ef4444)' }} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600 }}>
                            {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
                        </h3>

                        <div className="form-group">
                            <label>Vendor Name</label>
                            <input
                                className="input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="modal-actions" style={{ marginTop: 24 }}>
                            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || !name.trim()}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
