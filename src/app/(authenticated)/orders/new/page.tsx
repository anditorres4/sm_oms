'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Upload, X, Trash2, Plus, Search, FileText } from 'lucide-react';

const STEPS = ['Patient', 'Clinician', 'Products', 'Pricing', 'Insurance', 'Review'];

const INSURANCE_CHECKLIST = [
    { key: 'activeCoverage', label: 'Active coverage and plan type confirmed' },
    { key: 'dmeBenefit', label: 'DME benefit; in-network requirement verified' },
    { key: 'hcpcsCoveragePolicy', label: 'HCPCS coverage policy and rental/purchase rule checked' },
    { key: 'priorAuthTriggers', label: 'Prior authorization / WOPD triggers reviewed' },
    { key: 'deductibleCoinsurance', label: 'Deductible/coinsurance; secondary payer evaluated' },
    { key: 'documentationRequirements', label: 'Order/clinical documentation requirements verified (Medicare SWO/WOPD)' },
    { key: 'payerGuidelinesChecked', label: 'Payer guidelines checked and confirmed' },
];

function toNum(val: any): number {
    if (typeof val === 'number') return val;
    return parseFloat(val?.toString() ?? '0') || 0;
}

function NewOrderForm() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');

    const [step, setStep] = useState(0);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isInitializing, setIsInitializing] = useState(!!editId);

    // Step 1: Patient
    const [patient, setPatient] = useState({
        firstName: '', lastName: '', address: '', phone: '', email: '',
    });

    // Step 2: Clinician
    const [clinician, setClinician] = useState({
        firstName: '', lastName: '', clinicName: '', clinicAddress: '', phone: '', email: '',
    });

    // Step 3: Products
    const [products, setProducts] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [lines, setLines] = useState<any[]>([]);

    // Step 4: Pricing
    const [payerType, setPayerType] = useState<'self_pay' | 'insurance'>('self_pay');
    const [payers, setPayers] = useState<any[]>([]);
    const [selectedPayerId, setSelectedPayerId] = useState('');

    // Step 5: Insurance checklist
    const [checklist, setChecklist] = useState<Record<string, boolean>>({
        activeCoverage: false,
        dmeBenefit: false,
        hcpcsCoveragePolicy: false,
        priorAuthTriggers: false,
        deductibleCoinsurance: false,
        documentationRequirements: false,
        payerGuidelinesChecked: false,
    });

    // Fetch existing order if editing
    useEffect(() => {
        if (!editId) return;

        async function fetchDraft() {
            try {
                const res = await fetch(`/api/orders/${editId}`);
                if (res.ok) {
                    const order = await res.json();

                    if (!order.isDraft) {
                        router.push(`/orders/${editId}`);
                        return;
                    }

                    setOrderId(order.id);
                    if (order.patient) setPatient(order.patient);
                    if (order.clinician) setClinician(order.clinician);

                    if (order.lines?.length) {
                        setLines(order.lines.map((l: any) => ({
                            product: l.product,
                            quantity: l.quantity,
                            measurementFormUrl: l.measurementFormUrl || null
                        })));
                    }

                    setPayerType(order.payerType || 'self_pay');
                    if (order.payerId) setSelectedPayerId(order.payerId);

                    if (order.insuranceChecklist) {
                        setChecklist((prev) => ({ ...prev, ...order.insuranceChecklist }));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch draft order", err);
            } finally {
                setIsInitializing(false);
            }
        }

        fetchDraft();
    }, [editId, router]);

    // Fetch products
    const searchProducts = useCallback(async (q: string) => {
        if (!q.trim()) { setProductResults([]); return; }
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}`);
        if (res.ok) setProductResults(await res.json());
    }, []);

    useEffect(() => {
        const t = setTimeout(() => searchProducts(productSearch), 250);
        return () => clearTimeout(t);
    }, [productSearch, searchProducts]);

    // Fetch payers
    useEffect(() => {
        fetch('/api/payers').then(r => r.json()).then(setPayers).catch(() => { });
    }, []);

    // Auto-save draft
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);

    const saveDraft = useCallback(async () => {
        if (!orderId) return;
        setSaving(true);

        const selectedPayer = payers.find((p: any) => p.id === selectedPayerId);

        const computedLines = lines.map((l) => {
            let unitPrice = toNum(l.product.msrp);
            if (payerType === 'insurance' && selectedPayer) {
                const feeEntry = selectedPayer.feeSchedule?.find((fs: any) => fs.hcpcsCode === l.product.hcpcsCode);
                if (feeEntry) unitPrice = toNum(feeEntry.rate);
            }
            return {
                productId: l.product.id,
                quantity: l.quantity,
                unitPrice,
                lineTotal: unitPrice * l.quantity,
                measurementFormUrl: l.measurementFormUrl || null,
            };
        });

        await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient,
                clinician,
                lines: computedLines,
                payerType,
                payerId: selectedPayerId || null,
                insuranceChecklist: checklist,
            }),
        });

        setSaving(false);
        setLastSaved(new Date());
    }, [orderId, patient, clinician, lines, payerType, selectedPayerId, payers, checklist]);

    useEffect(() => {
        if (!orderId) return;
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(saveDraft, 2000);
        return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
    }, [patient, clinician, lines, payerType, selectedPayerId, checklist, saveDraft]);

    // Validation
    const validateStep = (s: number): boolean => {
        const errs: Record<string, string> = {};

        if (s === 0) {
            if (!patient.firstName.trim()) errs.patientFirstName = 'First name is required';
            if (!patient.lastName.trim()) errs.patientLastName = 'Last name is required';
            if (!patient.address.trim()) errs.patientAddress = 'Address is required';
            if (!patient.phone.trim()) errs.patientPhone = 'Phone is required';
            if (!patient.email.trim()) errs.patientEmail = 'Email is required';
        }

        if (s === 1) {
            if (!clinician.firstName.trim()) errs.clinicianFirstName = 'First name is required';
            if (!clinician.lastName.trim()) errs.clinicianLastName = 'Last name is required';
            if (!clinician.clinicName.trim()) errs.clinicianClinicName = 'Clinic name is required';
            if (!clinician.clinicAddress.trim()) errs.clinicianClinicAddress = 'Clinic address is required';
            if (!clinician.phone.trim()) errs.clinicianPhone = 'Phone is required';
            if (!clinician.email.trim()) errs.clinicianEmail = 'Email is required';
        }

        if (s === 2) {
            if (lines.length === 0) errs.lines = 'At least one product is required';
            lines.forEach((l, i) => {
                if (l.quantity < 1) errs[`line_qty_${i}`] = 'Quantity must be at least 1';
                if (l.product.measurementFormRequired && !l.measurementFormUrl) {
                    errs[`line_form_${i}`] = 'Measurement form upload is required for this product';
                }
            });
        }

        if (s === 4) {
            if (payerType === 'insurance') {
                INSURANCE_CHECKLIST.forEach((item) => {
                    if (!checklist[item.key]) errs[item.key] = `Required: ${item.label}`;
                });
            }
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // Create order on first step completion
    const handleNext = async () => {
        if (!validateStep(step)) return;

        if (step === 0 && !orderId) {
            // Create the order
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient, clinician }),
            });
            if (res.ok) {
                const order = await res.json();
                setOrderId(order.id);
            } else {
                return;
            }
        }

        setStep((s) => Math.min(s + 1, STEPS.length - 1));
    };

    const handlePrev = () => {
        setErrors({});
        setStep((s) => Math.max(s - 1, 0));
    };

    // Add product line
    const addLine = (product: any) => {
        if (lines.find((l) => l.product.id === product.id)) return;
        setLines([...lines, { product, quantity: 1, measurementFormUrl: null }]);
        setProductSearch('');
        setShowDropdown(false);
    };

    const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

    const updateLineQty = (idx: number, qty: number) => {
        const updated = [...lines];
        updated[idx].quantity = Math.max(1, qty);
        setLines(updated);
    };

    const updateLinePrice = (idx: number, priceStr: string) => {
        const updated = [...lines];
        if (priceStr.trim() === '') {
            updated[idx].unitPriceOverride = undefined;
        } else {
            updated[idx].unitPriceOverride = parseFloat(priceStr);
        }
        setLines(updated);
    };

    // File upload
    const handleFileUpload = async (idx: number, file: File) => {
        if (!orderId) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('orderId', orderId);
        formData.append('lineId', String(idx));

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
            const { url } = await res.json();
            const updated = [...lines];
            updated[idx].measurementFormUrl = url;
            setLines(updated);
        }
    };

    // Compute pricing
    const selectedPayer = payers.find((p: any) => p.id === selectedPayerId);
    const computedLines = lines.map((l) => {
        let defaultPrice = toNum(l.product.msrp);
        if (payerType === 'insurance' && selectedPayer) {
            const fee = selectedPayer.feeSchedule?.find((f: any) => f.hcpcsCode === l.product.hcpcsCode);
            if (fee) defaultPrice = toNum(fee.rate);
        }
        const unitPrice = l.unitPriceOverride !== undefined ? l.unitPriceOverride : defaultPrice;

        const unitCost = toNum(l.product.unitCost);
        const margin = (unitPrice - unitCost) * l.quantity;

        return { ...l, unitPrice, lineTotal: unitPrice * l.quantity, margin, unitCost };
    });
    const orderTotal = computedLines.reduce((s, l) => s + l.lineTotal, 0);

    // Submit
    const handleSubmit = async () => {
        if (!validateStep(4)) return;
        setSubmitting(true);

        // Final save
        await saveDraft();

        const res = await fetch(`/api/orders/${orderId}/submit`, { method: 'POST' });
        if (res.ok) {
            router.push(`/orders/${orderId}`);
        } else {
            const data = await res.json();
            setErrors({ submit: data.error || 'Failed to submit order' });
            setSubmitting(false);
        }
    };

    if (isInitializing) return <div className="loader"><div className="spinner" /></div>;

    return (
        <>
            <div className="page-header">
                <h1>New Order</h1>
                <p>Fill in the details below to create a new medical supply order</p>
            </div>

            {/* Stepper */}
            <div className="stepper">
                {STEPS.map((s, i) => (
                    <div
                        key={s}
                        className={`stepper-step ${i < step ? 'completed' : ''} ${i === step ? 'active' : ''}`}
                    >
                        <div className="stepper-circle">
                            {i < step ? <Check style={{ width: 14, height: 14 }} /> : i + 1}
                        </div>
                        <span className="stepper-label">{s}</span>
                    </div>
                ))}
            </div>

            <div className="card">
                <div className="card-body">
                    {/* Step 1: Patient */}
                    {step === 0 && (
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 20, color: 'var(--navy)' }}>
                                Patient Information
                            </h2>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">First Name <span className="required">*</span></label>
                                    <input className={`form-input ${errors.patientFirstName ? 'error' : ''}`} value={patient.firstName} onChange={(e) => setPatient({ ...patient, firstName: e.target.value })} placeholder="John" />
                                    {errors.patientFirstName && <p className="form-error">{errors.patientFirstName}</p>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name <span className="required">*</span></label>
                                    <input className={`form-input ${errors.patientLastName ? 'error' : ''}`} value={patient.lastName} onChange={(e) => setPatient({ ...patient, lastName: e.target.value })} placeholder="Doe" />
                                    {errors.patientLastName && <p className="form-error">{errors.patientLastName}</p>}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Full Address <span className="required">*</span></label>
                                <input className={`form-input ${errors.patientAddress ? 'error' : ''}`} value={patient.address} onChange={(e) => setPatient({ ...patient, address: e.target.value })} placeholder="123 Main St, City, State ZIP" />
                                {errors.patientAddress && <p className="form-error">{errors.patientAddress}</p>}
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Phone <span className="required">*</span></label>
                                    <input className={`form-input ${errors.patientPhone ? 'error' : ''}`} value={patient.phone} onChange={(e) => setPatient({ ...patient, phone: e.target.value })} placeholder="(555) 555-0100" />
                                    {errors.patientPhone && <p className="form-error">{errors.patientPhone}</p>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email <span className="required">*</span></label>
                                    <input className={`form-input ${errors.patientEmail ? 'error' : ''}`} type="email" value={patient.email} onChange={(e) => setPatient({ ...patient, email: e.target.value })} placeholder="patient@email.com" />
                                    {errors.patientEmail && <p className="form-error">{errors.patientEmail}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Clinician */}
                    {step === 1 && (
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 20, color: 'var(--navy)' }}>
                                Clinician Information
                            </h2>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">First Name <span className="required">*</span></label>
                                    <input className={`form-input ${errors.clinicianFirstName ? 'error' : ''}`} value={clinician.firstName} onChange={(e) => setClinician({ ...clinician, firstName: e.target.value })} placeholder="Dr. Jane" />
                                    {errors.clinicianFirstName && <p className="form-error">{errors.clinicianFirstName}</p>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name <span className="required">*</span></label>
                                    <input className={`form-input ${errors.clinicianLastName ? 'error' : ''}`} value={clinician.lastName} onChange={(e) => setClinician({ ...clinician, lastName: e.target.value })} placeholder="Smith" />
                                    {errors.clinicianLastName && <p className="form-error">{errors.clinicianLastName}</p>}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Clinic Name <span className="required">*</span></label>
                                    <input className={`form-input ${errors.clinicianClinicName ? 'error' : ''}`} value={clinician.clinicName} onChange={(e) => setClinician({ ...clinician, clinicName: e.target.value })} placeholder="Springfield Orthopedics" />
                                    {errors.clinicianClinicName && <p className="form-error">{errors.clinicianClinicName}</p>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone <span className="required">*</span></label>
                                    <input className={`form-input ${errors.clinicianPhone ? 'error' : ''}`} value={clinician.phone} onChange={(e) => setClinician({ ...clinician, phone: e.target.value })} placeholder="(555) 555-0200" />
                                    {errors.clinicianPhone && <p className="form-error">{errors.clinicianPhone}</p>}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Clinic Address <span className="required">*</span></label>
                                <input className={`form-input ${errors.clinicianClinicAddress ? 'error' : ''}`} value={clinician.clinicAddress} onChange={(e) => setClinician({ ...clinician, clinicAddress: e.target.value })} placeholder="456 Medical Plaza, Suite 200" />
                                {errors.clinicianClinicAddress && <p className="form-error">{errors.clinicianClinicAddress}</p>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email <span className="required">*</span></label>
                                <input className={`form-input ${errors.clinicianEmail ? 'error' : ''}`} type="email" value={clinician.email} onChange={(e) => setClinician({ ...clinician, email: e.target.value })} placeholder="dr.smith@clinic.com" />
                                {errors.clinicianEmail && <p className="form-error">{errors.clinicianEmail}</p>}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Products */}
                    {step === 2 && (
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 20, color: 'var(--navy)' }}>
                                Products & Quantities
                            </h2>

                            {/* Product search */}
                            <div style={{ position: 'relative', marginBottom: 20 }}>
                                <div style={{ position: 'relative' }}>
                                    <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
                                    <input
                                        className="form-input"
                                        style={{ paddingLeft: 36 }}
                                        placeholder="Search products by name, HCPCS code, or category..."
                                        value={productSearch}
                                        onChange={(e) => { setProductSearch(e.target.value); setShowDropdown(true); }}
                                        onFocus={() => setShowDropdown(true)}
                                    />
                                </div>
                                {showDropdown && productResults.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                                        background: 'white', border: '1px solid var(--border-light)',
                                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                                        maxHeight: 260, overflowY: 'auto',
                                    }}>
                                        {productResults.map((p: any) => (
                                            <div
                                                key={p.id}
                                                style={{
                                                    padding: '10px 14px', cursor: 'pointer',
                                                    borderBottom: '1px solid var(--border-light)',
                                                    transition: 'background 150ms',
                                                }}
                                                onClick={() => addLine(p)}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--teal-muted)')}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: 12, marginTop: 2 }}>
                                                    <span>HCPCS: <strong>{p.hcpcsCode}</strong></span>
                                                    <span>Vendor: {p.vendor?.name}</span>
                                                    <span>MSRP: ${toNum(p.msrp).toFixed(2)}</span>
                                                    <span>{p.category}</span>
                                                    {p.measurementFormRequired && <span style={{ color: 'var(--status-pending)' }}>📏 Form Required</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {errors.lines && <p className="form-error" style={{ marginBottom: 12 }}>{errors.lines}</p>}

                            {/* Line items */}
                            {lines.map((line, idx) => (
                                <div key={line.product.id} className="product-line">
                                    <div className="product-line-header">
                                        <span className="product-line-name">{line.product.name}</span>
                                        <button className="btn btn-ghost btn-sm" onClick={() => removeLine(idx)} type="button">
                                            <Trash2 style={{ width: 14, height: 14, color: '#ef4444' }} />
                                        </button>
                                    </div>
                                    <div className="product-line-meta">
                                        <span>HCPCS: <strong>{line.product.hcpcsCode}</strong></span>
                                        <span>Vendor: <strong>{line.product.vendor?.name}</strong></span>
                                        <span>Unit Cost: <strong>${toNum(line.product.unitCost).toFixed(2)}</strong></span>
                                        <span>MSRP: <strong>${toNum(line.product.msrp).toFixed(2)}</strong></span>
                                        <span>Category: <strong>{line.product.category}</strong></span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12 }}>
                                        <div style={{ width: 100 }}>
                                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Quantity</label>
                                            <input
                                                className={`form-input ${errors[`line_qty_${idx}`] ? 'error' : ''}`}
                                                type="number"
                                                min={1}
                                                value={line.quantity}
                                                onChange={(e) => updateLineQty(idx, parseInt(e.target.value) || 1)}
                                            />
                                            {errors[`line_qty_${idx}`] && <p className="form-error">{errors[`line_qty_${idx}`]}</p>}
                                        </div>

                                        {line.product.measurementFormRequired && (
                                            <div style={{ flex: 1 }}>
                                                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                                                    Measurement Form <span className="required">*</span>
                                                </label>
                                                {line.measurementFormUrl ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: '0.82rem', color: 'var(--status-approved)' }}>✓ Uploaded</span>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => {
                                                                const updated = [...lines];
                                                                updated[idx].measurementFormUrl = null;
                                                                setLines(updated);
                                                            }}
                                                            type="button"
                                                        >
                                                            <X style={{ width: 12, height: 12 }} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                                                            <Upload style={{ width: 14, height: 14 }} />
                                                            Upload
                                                            <input
                                                                type="file"
                                                                accept=".pdf,.jpg,.jpeg,.png"
                                                                style={{ display: 'none' }}
                                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(idx, e.target.files[0])}
                                                            />
                                                        </label>
                                                        {errors[`line_form_${idx}`] && <p className="form-error">{errors[`line_form_${idx}`]}</p>}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {lines.length === 0 && (
                                <div className="empty-state" style={{ padding: 32 }}>
                                    <FileText />
                                    <h3>No products added</h3>
                                    <p>Search and add products above to create order lines</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Pricing */}
                    {step === 3 && (
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 20, color: 'var(--navy)' }}>
                                Pricing
                            </h2>

                            <div className="form-row" style={{ marginBottom: 20 }}>
                                <div className="form-group">
                                    <label className="form-label">Payer Type <span className="required">*</span></label>
                                    <select className="form-select" value={payerType} onChange={(e) => setPayerType(e.target.value as any)}>
                                        <option value="self_pay">Self-Pay</option>
                                        <option value="insurance">Insurance</option>
                                    </select>
                                </div>
                                {payerType === 'insurance' && (
                                    <div className="form-group">
                                        <label className="form-label">Insurance Payer <span className="required">*</span></label>
                                        <select className="form-select" value={selectedPayerId} onChange={(e) => setSelectedPayerId(e.target.value)}>
                                            <option value="">Select payer...</option>
                                            {payers.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {payerType === 'insurance' && selectedPayerId && (
                                <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--teal-muted)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--teal)' }}>
                                    ✓ Insurance pricing applied via fee schedule
                                </div>
                            )}

                            {/* Pricing table */}
                            <div className="table-wrapper" style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>HCPCS</th>
                                            <th>Qty</th>
                                            <th style={{ width: 140 }}>Billable Amount</th>
                                            <th style={{ textAlign: 'right' }}>Margin</th>
                                            <th style={{ textAlign: 'right' }}>Line Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {computedLines.map((l, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{l.product.name}</td>
                                                <td style={{ fontFamily: 'monospace' }}>{l.product.hcpcsCode}</td>
                                                <td>{l.quantity}</td>
                                                <td>
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>$</span>
                                                        <input
                                                            className="form-input"
                                                            type="number"
                                                            step="0.01"
                                                            style={{ paddingLeft: 24, paddingRight: 8, height: 32 }}
                                                            value={lines[i].unitPriceOverride !== undefined ? lines[i].unitPriceOverride : l.unitPrice.toFixed(2)}
                                                            onChange={(e) => updateLinePrice(i, e.target.value)}
                                                        />
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right', color: l.margin >= 0 ? 'var(--status-approved)' : '#ef4444' }}>
                                                    ${l.margin.toFixed(2)}
                                                </td>
                                                <td style={{ fontWeight: 700, textAlign: 'right' }}>${l.lineTotal.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pricing-summary">
                                <h3>Order Summary</h3>
                                {computedLines.map((l, i) => (
                                    <div className="pricing-row" key={i}>
                                        <span>{l.product.name} × {l.quantity}</span>
                                        <span>${l.lineTotal.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="pricing-row">
                                    <span className="total-label">Total</span>
                                    <span className="total-value">${orderTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Insurance Checklist */}
                    {step === 4 && (
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, color: 'var(--navy)' }}>
                                Insurance Verification Checklist
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
                                Complete all verification items before submitting the order. Each item must be checked.
                            </p>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 16, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                <input
                                    type="checkbox"
                                    checked={Object.keys(checklist).length > 0 && INSURANCE_CHECKLIST.every(item => checklist[item.key])}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        const newState = { ...checklist };
                                        INSURANCE_CHECKLIST.forEach(item => { newState[item.key] = checked; });
                                        setChecklist(newState);
                                    }}
                                    style={{ width: 16, height: 16 }}
                                />
                                <strong>Select All Checklist Items</strong>
                            </label>

                            {INSURANCE_CHECKLIST.map((item, idx) => (
                                <div
                                    key={item.key}
                                    className={`checklist-item ${checklist[item.key] ? 'checked' : ''}`}
                                    onClick={() => setChecklist({ ...checklist, [item.key]: !checklist[item.key] })}
                                >
                                    <span className="checklist-num">{idx + 1}</span>
                                    <input
                                        type="checkbox"
                                        checked={checklist[item.key]}
                                        onChange={() => { }}
                                    />
                                    <label>{item.label}</label>
                                </div>
                            ))}

                            {Object.keys(errors).length > 0 && (
                                <p className="form-error" style={{ marginTop: 12 }}>All checklist items must be completed before proceeding.</p>
                            )}
                        </div>
                    )}

                    {/* Step 6: Review */}
                    {step === 5 && (
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 20, color: 'var(--navy)' }}>
                                Encounter Form Review
                            </h2>

                            <div className="detail-info-grid">
                                <div className="detail-info-card">
                                    <h4>Patient</h4>
                                    <p>{patient.firstName} {patient.lastName}</p>
                                    <p className="sub">{patient.address}</p>
                                    <p className="sub">{patient.phone} • {patient.email}</p>
                                </div>
                                <div className="detail-info-card">
                                    <h4>Clinician</h4>
                                    <p>{clinician.firstName} {clinician.lastName}</p>
                                    <p className="sub">{clinician.clinicName}</p>
                                    <p className="sub">{clinician.clinicAddress}</p>
                                </div>
                                <div className="detail-info-card">
                                    <h4>Payer</h4>
                                    <p>{payerType === 'insurance' ? 'Insurance' : 'Self-Pay'}</p>
                                    {selectedPayer && <p className="sub">{selectedPayer.name}</p>}
                                </div>
                                <div className="detail-info-card">
                                    <h4>Order Total</h4>
                                    <p style={{ fontSize: '1.4rem', color: 'var(--teal)' }}>${orderTotal.toFixed(2)}</p>
                                    <p className="sub">{lines.length} item{lines.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>

                            {/* Product summary */}
                            <div style={{ marginTop: 16 }}>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, color: 'var(--navy)' }}>Product Lines</h3>
                                <div className="table-wrapper" style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>HCPCS</th>
                                                <th>Qty</th>
                                                <th style={{ textAlign: 'right' }}>Billable Amount</th>
                                                <th style={{ textAlign: 'right' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {computedLines.map((l, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{l.product.name}</td>
                                                    <td style={{ fontFamily: 'monospace' }}>{l.product.hcpcsCode}</td>
                                                    <td>{l.quantity}</td>
                                                    <td style={{ textAlign: 'right' }}>${l.unitPrice.toFixed(2)}</td>
                                                    <td style={{ fontWeight: 700, textAlign: 'right' }}>${l.lineTotal.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Checklist summary */}
                            <div style={{ marginTop: 24 }}>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, color: 'var(--navy)' }}>Insurance Verification</h3>
                                {INSURANCE_CHECKLIST.map((item) => (
                                    <div key={item.key} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.85rem' }}>
                                        <span style={{ color: checklist[item.key] ? 'var(--status-approved)' : '#ef4444' }}>
                                            {checklist[item.key] ? '✓' : '✗'}
                                        </span>
                                        <span style={{ color: checklist[item.key] ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.label}</span>
                                    </div>
                                ))}
                            </div>

                            {errors.submit && <p className="form-error" style={{ marginTop: 16 }}>{errors.submit}</p>}
                        </div>
                    )}

                    {/* Wizard Footer */}
                    <div className="wizard-footer">
                        <div>
                            {step > 0 && (
                                <button className="btn btn-secondary" onClick={handlePrev} type="button">
                                    <ChevronLeft /> Previous
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            {lastSaved && (
                                <div className="wizard-save-indicator">
                                    <Check /> Saved {lastSaved.toLocaleTimeString()}
                                </div>
                            )}
                            {saving && (
                                <div className="wizard-save-indicator" style={{ color: 'var(--text-muted)' }}>
                                    Saving...
                                </div>
                            )}

                            {step < STEPS.length - 1 ? (
                                <button className="btn btn-primary" onClick={handleNext} type="button">
                                    Next <ChevronRight />
                                </button>
                            ) : (
                                <button
                                    className="btn btn-primary btn-lg"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    type="button"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Order'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default function NewOrderPage() {
    return (
        <Suspense fallback={<div className="loader"><div className="spinner" /></div>}>
            <NewOrderForm />
        </Suspense>
    );
}
