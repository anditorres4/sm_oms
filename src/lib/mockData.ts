import { Role, OrderStatus, PayerType, DocumentType, User, Vendor, Product, Payer, FeeSchedule, Patient, Clinician, Order, OrderLine, Document, AuditEvent } from '@prisma/client';

// Generate a dummy hashed password for 'password123'
// bcrypt.hashSync('password123', 10)
const DUMMY_HASH = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGjRs4Zq9c9oR0vE6';

export let mockUsers: User[] = [
    {
        id: 'user-oe',
        name: 'Sarah Johnson',
        email: 'order_entry@oms.com',
        passwordHash: DUMMY_HASH,
        role: Role.order_entry,
        createdAt: new Date(),
    },
    {
        id: 'user-ops',
        name: 'Mike Torres',
        email: 'ops@oms.com',
        passwordHash: DUMMY_HASH,
        role: Role.ops,
        createdAt: new Date(),
    },
    {
        id: 'user-admin',
        name: 'Admin User',
        email: 'admin@oms.com',
        passwordHash: DUMMY_HASH,
        role: Role.admin,
        createdAt: new Date(),
    },
];

export let mockVendors: Vendor[] = [
    { id: 'vendor-1', name: 'Ossur Americas' },
    { id: 'vendor-2', name: 'Ottobock' },
    { id: 'vendor-3', name: 'Breg Inc.' },
];

export let mockProducts: Product[] = [
    { id: 'prod-1', name: 'Knee Brace - Hinged OA', hcpcsCode: 'L1851', vendorId: 'vendor-1', unitCost: 180.0 as any, msrp: 350.0 as any, category: 'Orthopedic Bracing', measurementFormRequired: true },
    { id: 'prod-2', name: 'Ankle Foot Orthosis (AFO)', hcpcsCode: 'L1906', vendorId: 'vendor-1', unitCost: 120.0 as any, msrp: 240.0 as any, category: 'Orthopedic Bracing', measurementFormRequired: true },
    { id: 'prod-3', name: 'Lumbar Support Belt', hcpcsCode: 'L0650', vendorId: 'vendor-2', unitCost: 65.0 as any, msrp: 140.0 as any, category: 'Spinal Supports', measurementFormRequired: false },
    { id: 'prod-4', name: 'Plantar Fasciitis Night Splint', hcpcsCode: 'L4396', vendorId: 'vendor-3', unitCost: 45.0 as any, msrp: 95.0 as any, category: 'Foot Orthotics', measurementFormRequired: false },
    { id: 'prod-5', name: 'Wrist Splint - Cock-up', hcpcsCode: 'L3908', vendorId: 'vendor-3', unitCost: 35.0 as any, msrp: 75.0 as any, category: 'Upper Extremity', measurementFormRequired: false },
    { id: 'prod-6', name: 'Shoulder Immobilizer Sling', hcpcsCode: 'L3675', vendorId: 'vendor-2', unitCost: 28.0 as any, msrp: 60.0 as any, category: 'Upper Extremity', measurementFormRequired: false },
    { id: 'prod-7', name: 'Cervical Collar - Soft', hcpcsCode: 'L0120', vendorId: 'vendor-2', unitCost: 22.0 as any, msrp: 48.0 as any, category: 'Spinal Supports', measurementFormRequired: true },
    { id: 'prod-8', name: 'TLSO - Custom Fit Thoracic', hcpcsCode: 'L0456', vendorId: 'vendor-1', unitCost: 320.0 as any, msrp: 680.0 as any, category: 'Spinal Supports', measurementFormRequired: true },
    { id: 'prod-9', name: 'Elbow Orthosis - Tennis Elbow', hcpcsCode: 'L3720', vendorId: 'vendor-3', unitCost: 25.0 as any, msrp: 55.0 as any, category: 'Upper Extremity', measurementFormRequired: false },
    { id: 'prod-10', name: 'Hip Abduction Orthosis', hcpcsCode: 'L1685', vendorId: 'vendor-1', unitCost: 210.0 as any, msrp: 420.0 as any, category: 'Orthopedic Bracing', measurementFormRequired: true },
];

export let mockPayers: Payer[] = [
    { id: 'payer-1', name: 'Medicare' },
    { id: 'payer-2', name: 'Blue Cross Blue Shield' },
    { id: 'payer-3', name: 'Aetna' },
];

export let mockFeeSchedules: FeeSchedule[] = [
    { id: 'fs-1', payerId: 'payer-1', hcpcsCode: 'L1851', rate: 280.0 as any },
    { id: 'fs-2', payerId: 'payer-1', hcpcsCode: 'L1906', rate: 185.0 as any },
    { id: 'fs-3', payerId: 'payer-1', hcpcsCode: 'L0650', rate: 98.0 as any },
    { id: 'fs-4', payerId: 'payer-1', hcpcsCode: 'L4396', rate: 72.0 as any },
    { id: 'fs-5', payerId: 'payer-1', hcpcsCode: 'L3908', rate: 55.0 as any },
    { id: 'fs-6', payerId: 'payer-1', hcpcsCode: 'L3675', rate: 44.0 as any },
    { id: 'fs-7', payerId: 'payer-1', hcpcsCode: 'L0120', rate: 38.0 as any },
    { id: 'fs-8', payerId: 'payer-1', hcpcsCode: 'L0456', rate: 520.0 as any },
    { id: 'fs-9', payerId: 'payer-1', hcpcsCode: 'L3720', rate: 40.0 as any },
    { id: 'fs-10', payerId: 'payer-1', hcpcsCode: 'L1685', rate: 340.0 as any },
];

export let mockPatients: Patient[] = [
    { id: 'patient-1', firstName: 'Robert', lastName: 'Martinez', address: '123 Oak Street, Springfield, IL 62701', phone: '(217) 555-0142', email: 'robert.martinez@email.com', createdAt: new Date() },
    { id: 'patient-2', firstName: 'Linda', lastName: 'Thompson', address: '789 Maple Ave, Chicago, IL 60601', phone: '(312) 555-0217', email: 'linda.thompson@email.com', createdAt: new Date() },
];

export let mockClinicians: Clinician[] = [
    { id: 'clinician-1', firstName: 'Dr. Emily', lastName: 'Chen', clinicName: 'Springfield Orthopedic Associates', clinicAddress: '456 Medical Plaza', phone: '(217) 555-0198', email: 'echen@springfieldortho.com', createdAt: new Date() },
];

export let mockOrders: Order[] = [
    {
        id: 'order-1',
        patientId: 'patient-1',
        clinicianId: 'clinician-1',
        payerType: PayerType.insurance,
        payerId: 'payer-1',
        status: OrderStatus.pending_approval,
        createdById: 'user-oe',
        assignedToId: 'user-oe',
        isDraft: false,
        submittedAt: new Date(),
        insuranceChecklist: {
            activeCoverage: true, dmeBenefit: true, hcpcsCoveragePolicy: true, priorAuthTriggers: true, deductibleCoinsurance: true, documentationRequirements: true, payerGuidelinesChecked: true,
        } as any,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

export let mockOrderLines: OrderLine[] = [
    {
        id: 'line-1',
        orderId: 'order-1',
        productId: 'prod-1',
        quantity: 1,
        unitCost: 180.0 as any,
        unitPrice: 280.0 as any,
        lineTotal: 280.0 as any,
        measurementFormUrl: null,
        createdAt: new Date(),
    }
];

export let mockDocuments: Document[] = [];
export let mockAuditEvents: AuditEvent[] = [
    {
        id: 'audit-1',
        orderId: 'order-1',
        actorUserId: 'user-oe',
        eventType: 'ORDER_CREATED',
        eventPayload: { note: 'Order created as draft' } as any,
        createdAt: new Date(),
    },
    {
        id: 'audit-2',
        orderId: 'order-1',
        actorUserId: 'user-oe',
        eventType: 'ORDER_SUBMITTED',
        eventPayload: { note: 'Order submitted with encounter form' } as any,
        createdAt: new Date(),
    }
];
