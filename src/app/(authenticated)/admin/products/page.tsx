'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Vendor {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    hcpcsCode: string;
    vendorId: string;
    vendor?: Vendor;
    unitCost: number;
    msrp: number;
    category: string;
    measurementFormRequired: boolean;
}

export default function AdminProductsPage() {
    const { data: session } = useSession();
    const [products, setProducts] = useState<Product[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [hcpcsCode, setHcpcsCode] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [msrp, setMsrp] = useState('');
    const [category, setCategory] = useState('');
    const [measurementFormRequired, setMeasurementFormRequired] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchVendors();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            setProducts(data);
        } catch (error) {
            console.error('Failed to fetch products', error);
        }
        setLoading(false);
    };

    const fetchVendors = async () => {
        try {
            const res = await fetch('/api/vendors');
            const data = await res.json();
            setVendors(data);
        } catch (error) {
            console.error('Failed to fetch vendors', error);
        }
    };

    const handleOpenModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setName(product.name);
            setHcpcsCode(product.hcpcsCode);
            setVendorId(product.vendorId);
            setUnitCost(product.unitCost.toString());
            setMsrp(product.msrp.toString());
            setCategory(product.category);
            setMeasurementFormRequired(product.measurementFormRequired);
        } else {
            setEditingProduct(null);
            setName('');
            setHcpcsCode('');
            setVendorId(vendors[0]?.id || '');
            setUnitCost('');
            setMsrp('');
            setCategory('');
            setMeasurementFormRequired(false);
        }
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim() || !hcpcsCode.trim() || !vendorId || !category.trim()) {
            alert('Please fill out all required fields.');
            return;
        }
        setIsSaving(true);

        const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
        const method = editingProduct ? 'PUT' : 'POST';

        const payload = {
            name: name.trim(),
            hcpcsCode: hcpcsCode.trim(),
            vendorId,
            unitCost,
            msrp,
            category: category.trim(),
            measurementFormRequired
        };

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setModalOpen(false);
                fetchProducts();
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
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchProducts();
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
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Manage Products</h2>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus style={{ width: 16, height: 16 }} /> Add Product
                </button>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>HCPCS</th>
                            <th>Vendor</th>
                            <th>Category</th>
                            <th>Cost</th>
                            <th>MSRP</th>
                            <th>Requires Auth</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                                    No products found.
                                </td>
                            </tr>
                        ) : (
                            products.map(product => (
                                <tr key={product.id}>
                                    <td><strong>{product.name}</strong></td>
                                    <td>{product.hcpcsCode}</td>
                                    <td>{product.vendor?.name}</td>
                                    <td>{product.category}</td>
                                    <td>${parseFloat(product.unitCost.toString()).toFixed(2)}</td>
                                    <td>${parseFloat(product.msrp.toString()).toFixed(2)}</td>
                                    <td>{product.measurementFormRequired ? 'Yes' : 'No'}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn-ghost" onClick={() => handleOpenModal(product)} title="Edit">
                                            <Edit2 style={{ width: 16, height: 16, color: 'var(--teal)' }} />
                                        </button>
                                        <button className="btn-ghost" onClick={() => handleDelete(product.id)} title="Delete">
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
                <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '5vh' }}>
                    <div className="modal-content" style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: 16, fontSize: '1.2rem', fontWeight: 600 }}>
                            {editingProduct ? 'Edit Product' : 'Add Product'}
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label>Product Name *</label>
                                <input className="input" value={name} onChange={e => setName(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>HCPCS Code *</label>
                                <input className="input" value={hcpcsCode} onChange={e => setHcpcsCode(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Vendor *</label>
                                <select className="input" value={vendorId} onChange={e => setVendorId(e.target.value)}>
                                    <option value="" disabled>Select Vendor</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Category *</label>
                                <input className="input" value={category} onChange={e => setCategory(e.target.value)} />
                            </div>

                            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={measurementFormRequired}
                                        onChange={e => setMeasurementFormRequired(e.target.checked)}
                                        style={{ width: 18, height: 18 }}
                                    />
                                    Requires Measurement Form
                                </label>
                            </div>

                            <div className="form-group">
                                <label>Unit Cost ($) *</label>
                                <input type="number" step="0.01" className="input" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>MSRP ($) *</label>
                                <input type="number" step="0.01" className="input" value={msrp} onChange={e => setMsrp(e.target.value)} />
                            </div>
                        </div>

                        <div className="modal-actions" style={{ marginTop: 24 }}>
                            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || !name.trim() || !hcpcsCode.trim() || !category.trim()}>
                                {isSaving ? 'Saving...' : 'Save Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
