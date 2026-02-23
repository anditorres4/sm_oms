import { NextRequest, NextResponse } from 'next/server';
import { mockOrders, mockPatients, mockClinicians, mockAuditEvents, mockOrderLines, mockProducts } from '@/lib/mockData';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const patientName = searchParams.get('patientName');
    const orderId = searchParams.get('orderId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let filteredOrders = mockOrders.map(order => {
        const patient = mockPatients.find(p => p.id === order.patientId) || {} as any;
        const clinician = mockClinicians.find(c => c.id === order.clinicianId) || {} as any;
        const lines = mockOrderLines.filter(l => l.orderId === order.id).map(line => ({
            ...line,
            product: mockProducts.find(p => p.id === line.productId) || {}
        }));

        return {
            ...order,
            patient,
            clinician,
            createdBy: { id: order.createdById, name: 'Demo User', email: '' }, // Simplified
            assignedTo: { id: order.assignedToId, name: 'Demo User', email: '' }, // Simplified
            lines
        };
    });

    if (status && status !== 'all') {
        filteredOrders = filteredOrders.filter(o => o.status === status);
    }
    if (orderId) {
        filteredOrders = filteredOrders.filter(o => o.id.toLowerCase().includes(orderId.toLowerCase()));
    }
    if (patientName) {
        const lowerName = patientName.toLowerCase();
        filteredOrders = filteredOrders.filter(o =>
            o.patient.firstName.toLowerCase().includes(lowerName) ||
            o.patient.lastName.toLowerCase().includes(lowerName)
        );
    }
    if (dateFrom || dateTo) {
        const fromTimestamp = dateFrom ? new Date(dateFrom).getTime() : 0;
        const toTimestamp = dateTo ? new Date(dateTo + 'T23:59:59Z').getTime() : Infinity;

        filteredOrders = filteredOrders.filter(o => {
            const orderTime = new Date(o.createdAt).getTime();
            return orderTime >= fromTimestamp && orderTime <= toTimestamp;
        });
    }

    filteredOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(filteredOrders);
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { patient, clinician } = body;

        // Create mock patient
        const patientRecord = {
            id: `patient-${Date.now()}`,
            firstName: patient.firstName,
            lastName: patient.lastName,
            address: patient.address,
            phone: patient.phone,
            email: patient.email,
            createdAt: new Date(),
        };
        mockPatients.push(patientRecord);

        // Create mock clinician
        const clinicianRecord = {
            id: `clinician-${Date.now()}`,
            firstName: clinician.firstName,
            lastName: clinician.lastName,
            clinicName: clinician.clinicName,
            clinicAddress: clinician.clinicAddress,
            phone: clinician.phone,
            email: clinician.email,
            createdAt: new Date(),
        };
        mockClinicians.push(clinicianRecord);

        // Create draft order
        const order = {
            id: `order-${Date.now()}`,
            patientId: patientRecord.id,
            clinicianId: clinicianRecord.id,
            createdById: session.user.id,
            assignedToId: session.user.id,
            isDraft: true,
            status: 'pending_approval',
            createdAt: new Date(),
            updatedAt: new Date(),
            payerType: 'self_pay',
            payerId: null,
        } as any;

        mockOrders.push(order);

        // Audit event
        mockAuditEvents.push({
            id: `audit-${Date.now()}`,
            orderId: order.id,
            actorUserId: session.user.id,
            eventType: 'ORDER_CREATED',
            eventPayload: { note: 'Order created as draft' } as any,
            createdAt: new Date(),
        });

        const returnedOrder = {
            ...order,
            patient: patientRecord,
            clinician: clinicianRecord,
            createdBy: { id: session.user.id, name: 'Demo User', email: '' },
        };

        return NextResponse.json(returnedOrder, { status: 201 });
    } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
