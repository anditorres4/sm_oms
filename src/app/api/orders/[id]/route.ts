import { NextRequest, NextResponse } from 'next/server';
import { mockOrders, mockPatients, mockClinicians, mockPayers, mockOrderLines, mockDocuments, mockAuditEvents, mockProducts, mockVendors } from '@/lib/mockData';
import { auth } from '@/lib/auth';
import { PayerType } from '@prisma/client';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const orderObj = mockOrders.find(o => o.id === id);
    if (!orderObj) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const patient = mockPatients.find(p => p.id === orderObj.patientId) || null;
    const clinician = mockClinicians.find(c => c.id === orderObj.clinicianId) || null;
    const payer = mockPayers.find(p => p.id === orderObj.payerId) || null;
    const lines = mockOrderLines.filter(l => l.orderId === id).map(l => ({
        ...l,
        product: { ...mockProducts.find(p => p.id === l.productId), vendor: mockVendors.find(v => v.id === mockProducts.find(p => p.id === l.productId)?.vendorId) }
    }));
    const documents = mockDocuments.filter(d => d.orderId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const auditEvents = mockAuditEvents.filter(a => a.orderId === id).map(a => ({
        ...a,
        actor: { id: a.actorUserId, name: 'Demo User', email: '' }
    })).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const order = {
        ...orderObj,
        patient,
        clinician,
        payer,
        createdBy: { id: orderObj.createdById, name: 'Demo User', email: '' },
        assignedTo: { id: orderObj.assignedToId, name: 'Demo User', email: '' },
        lines,
        documents,
        auditEvents
    };

    return NextResponse.json(order);
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    try {
        const orderIndex = mockOrders.findIndex(o => o.id === id);
        if (orderIndex === -1) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

        const existingOrder = mockOrders[orderIndex];

        if (!existingOrder.isDraft) {
            // Submitted orders only allow status changes
            return NextResponse.json({ error: 'Order is submitted and cannot be edited' }, { status: 400 });
        }

        const { patient, clinician, lines, payerType, payerId, insuranceChecklist } = body;

        // Update patient
        if (patient && existingOrder.patientId) {
            const pIdx = mockPatients.findIndex(p => p.id === existingOrder.patientId);
            if (pIdx > -1) mockPatients[pIdx] = { ...mockPatients[pIdx], ...patient };
        }

        // Update clinician
        if (clinician && existingOrder.clinicianId) {
            const cIdx = mockClinicians.findIndex(c => c.id === existingOrder.clinicianId);
            if (cIdx > -1) mockClinicians[cIdx] = { ...mockClinicians[cIdx], ...clinician };
        }

        // Replace order lines if provided
        if (lines !== undefined) {
            // Remove old lines
            const linesToKeep = mockOrderLines.filter(l => l.orderId !== id);
            mockOrderLines.length = 0;
            mockOrderLines.push(...linesToKeep);

            // Add new
            if (lines.length > 0) {
                for (const l of lines) {
                    mockOrderLines.push({
                        id: `line-${Date.now()}-${Math.random()}`,
                        orderId: id,
                        productId: l.productId,
                        quantity: l.quantity,
                        unitCost: 0 as any, // Mocks unit cost generically
                        unitPrice: l.unitPrice,
                        lineTotal: l.lineTotal,
                        measurementFormUrl: l.measurementFormUrl || null,
                        createdAt: new Date()
                    } as any);
                }
            }
        }

        mockOrders[orderIndex] = {
            ...mockOrders[orderIndex],
            ...(payerType !== undefined ? { payerType: payerType as PayerType } : {}),
            ...(payerId !== undefined ? { payerId: payerId || null } : {}),
            ...(insuranceChecklist !== undefined ? { insuranceChecklist } : {}),
        };

        // Audit event
        mockAuditEvents.push({
            id: `audit-${Date.now()}`,
            orderId: id,
            actorUserId: session.user.id,
            eventType: 'ORDER_UPDATED',
            eventPayload: { fields: Object.keys(body) } as any,
            createdAt: new Date(),
        });

        // Quick refetch to respond properly...
        const updatedOrderObj = mockOrders[orderIndex];
        const updatedLines = mockOrderLines.filter(l => l.orderId === id).map(l => ({
            ...l,
            product: { ...mockProducts.find(p => p.id === l.productId), vendor: mockVendors.find(v => v.id === mockProducts.find(p => p.id === l.productId)?.vendorId) }
        }));

        const updatedOrder = {
            ...updatedOrderObj,
            patient: mockPatients.find(p => p.id === updatedOrderObj.patientId),
            clinician: mockClinicians.find(c => c.id === updatedOrderObj.clinicianId),
            payer: mockPayers.find(p => p.id === updatedOrderObj.payerId),
            lines: updatedLines,
            documents: mockDocuments.filter(d => d.orderId === id)
        };

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
