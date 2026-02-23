import { PrismaClient, Role, OrderStatus, PayerType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const userOE = await prisma.user.upsert({
    where: { email: 'order_entry@oms.com' },
    update: {},
    create: {
      name: 'Sarah Johnson',
      email: 'order_entry@oms.com',
      passwordHash,
      role: Role.order_entry,
    },
  });

  const userOps = await prisma.user.upsert({
    where: { email: 'ops@oms.com' },
    update: {},
    create: {
      name: 'Mike Torres',
      email: 'ops@oms.com',
      passwordHash,
      role: Role.ops,
    },
  });

  const userAdmin = await prisma.user.upsert({
    where: { email: 'admin@oms.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@oms.com',
      passwordHash,
      role: Role.admin,
    },
  });

  console.log('✅ Users seeded');

  // Vendors
  const vendor1 = await prisma.vendor.upsert({
    where: { id: 'vendor-1' },
    update: {},
    create: { id: 'vendor-1', name: 'Ossur Americas' },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { id: 'vendor-2' },
    update: {},
    create: { id: 'vendor-2', name: 'Ottobock' },
  });

  const vendor3 = await prisma.vendor.upsert({
    where: { id: 'vendor-3' },
    update: {},
    create: { id: 'vendor-3', name: 'Breg Inc.' },
  });

  console.log('✅ Vendors seeded');

  // Products
  const products = [
    {
      id: 'prod-1',
      name: 'Knee Brace - Hinged OA',
      hcpcsCode: 'L1851',
      vendorId: vendor1.id,
      unitCost: 180.0,
      msrp: 350.0,
      category: 'Orthopedic Bracing',
      measurementFormRequired: true,
    },
    {
      id: 'prod-2',
      name: 'Ankle Foot Orthosis (AFO)',
      hcpcsCode: 'L1906',
      vendorId: vendor1.id,
      unitCost: 120.0,
      msrp: 240.0,
      category: 'Orthopedic Bracing',
      measurementFormRequired: true,
    },
    {
      id: 'prod-3',
      name: 'Lumbar Support Belt',
      hcpcsCode: 'L0650',
      vendorId: vendor2.id,
      unitCost: 65.0,
      msrp: 140.0,
      category: 'Spinal Supports',
      measurementFormRequired: false,
    },
    {
      id: 'prod-4',
      name: 'Plantar Fasciitis Night Splint',
      hcpcsCode: 'L4396',
      vendorId: vendor3.id,
      unitCost: 45.0,
      msrp: 95.0,
      category: 'Foot Orthotics',
      measurementFormRequired: false,
    },
    {
      id: 'prod-5',
      name: 'Wrist Splint - Cock-up',
      hcpcsCode: 'L3908',
      vendorId: vendor3.id,
      unitCost: 35.0,
      msrp: 75.0,
      category: 'Upper Extremity',
      measurementFormRequired: false,
    },
    {
      id: 'prod-6',
      name: 'Shoulder Immobilizer Sling',
      hcpcsCode: 'L3675',
      vendorId: vendor2.id,
      unitCost: 28.0,
      msrp: 60.0,
      category: 'Upper Extremity',
      measurementFormRequired: false,
    },
    {
      id: 'prod-7',
      name: 'Cervical Collar - Soft',
      hcpcsCode: 'L0120',
      vendorId: vendor2.id,
      unitCost: 22.0,
      msrp: 48.0,
      category: 'Spinal Supports',
      measurementFormRequired: true,
    },
    {
      id: 'prod-8',
      name: 'TLSO - Custom Fit Thoracic',
      hcpcsCode: 'L0456',
      vendorId: vendor1.id,
      unitCost: 320.0,
      msrp: 680.0,
      category: 'Spinal Supports',
      measurementFormRequired: true,
    },
    {
      id: 'prod-9',
      name: 'Elbow Orthosis - Tennis Elbow',
      hcpcsCode: 'L3720',
      vendorId: vendor3.id,
      unitCost: 25.0,
      msrp: 55.0,
      category: 'Upper Extremity',
      measurementFormRequired: false,
    },
    {
      id: 'prod-10',
      name: 'Hip Abduction Orthosis',
      hcpcsCode: 'L1685',
      vendorId: vendor1.id,
      unitCost: 210.0,
      msrp: 420.0,
      category: 'Orthopedic Bracing',
      measurementFormRequired: true,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: {
        ...product,
        unitCost: product.unitCost,
        msrp: product.msrp,
      },
    });
  }

  console.log('✅ Products seeded');

  // Payers
  const payer1 = await prisma.payer.upsert({
    where: { id: 'payer-1' },
    update: {},
    create: { id: 'payer-1', name: 'Medicare' },
  });

  const payer2 = await prisma.payer.upsert({
    where: { id: 'payer-2' },
    update: {},
    create: { id: 'payer-2', name: 'Blue Cross Blue Shield' },
  });

  const payer3 = await prisma.payer.upsert({
    where: { id: 'payer-3' },
    update: {},
    create: { id: 'payer-3', name: 'Aetna' },
  });

  console.log('✅ Payers seeded');

  // Fee Schedules
  const feeSchedules = [
    // Medicare rates
    { payerId: payer1.id, hcpcsCode: 'L1851', rate: 280.0 },
    { payerId: payer1.id, hcpcsCode: 'L1906', rate: 185.0 },
    { payerId: payer1.id, hcpcsCode: 'L0650', rate: 98.0 },
    { payerId: payer1.id, hcpcsCode: 'L4396', rate: 72.0 },
    { payerId: payer1.id, hcpcsCode: 'L3908', rate: 55.0 },
    { payerId: payer1.id, hcpcsCode: 'L3675', rate: 44.0 },
    { payerId: payer1.id, hcpcsCode: 'L0120', rate: 38.0 },
    { payerId: payer1.id, hcpcsCode: 'L0456', rate: 520.0 },
    { payerId: payer1.id, hcpcsCode: 'L3720', rate: 40.0 },
    { payerId: payer1.id, hcpcsCode: 'L1685', rate: 340.0 },
    // BCBS rates
    { payerId: payer2.id, hcpcsCode: 'L1851', rate: 310.0 },
    { payerId: payer2.id, hcpcsCode: 'L1906', rate: 210.0 },
    { payerId: payer2.id, hcpcsCode: 'L0650', rate: 112.0 },
    { payerId: payer2.id, hcpcsCode: 'L4396', rate: 82.0 },
    { payerId: payer2.id, hcpcsCode: 'L3908', rate: 62.0 },
    { payerId: payer2.id, hcpcsCode: 'L0456', rate: 580.0 },
    { payerId: payer2.id, hcpcsCode: 'L1685', rate: 378.0 },
    // Aetna rates
    { payerId: payer3.id, hcpcsCode: 'L1851', rate: 295.0 },
    { payerId: payer3.id, hcpcsCode: 'L1906', rate: 198.0 },
    { payerId: payer3.id, hcpcsCode: 'L0650', rate: 105.0 },
    { payerId: payer3.id, hcpcsCode: 'L4396', rate: 78.0 },
    { payerId: payer3.id, hcpcsCode: 'L3908', rate: 58.0 },
    { payerId: payer3.id, hcpcsCode: 'L0456', rate: 555.0 },
    { payerId: payer3.id, hcpcsCode: 'L1685', rate: 360.0 },
  ];

  for (const fs of feeSchedules) {
    await prisma.feeSchedule.upsert({
      where: { payerId_hcpcsCode: { payerId: fs.payerId, hcpcsCode: fs.hcpcsCode } },
      update: {},
      create: fs,
    });
  }

  console.log('✅ Fee schedules seeded');

  // Sample Patient
  const patient1 = await prisma.patient.upsert({
    where: { id: 'patient-1' },
    update: {},
    create: {
      id: 'patient-1',
      firstName: 'Robert',
      lastName: 'Martinez',
      address: '123 Oak Street, Springfield, IL 62701',
      phone: '(217) 555-0142',
      email: 'robert.martinez@email.com',
    },
  });

  // Sample Clinician
  const clinician1 = await prisma.clinician.upsert({
    where: { id: 'clinician-1' },
    update: {},
    create: {
      id: 'clinician-1',
      firstName: 'Dr. Emily',
      lastName: 'Chen',
      clinicName: 'Springfield Orthopedic Associates',
      clinicAddress: '456 Medical Plaza, Suite 200, Springfield, IL 62702',
      phone: '(217) 555-0198',
      email: 'echen@springfieldortho.com',
    },
  });

  // Sample submitted order
  const order1 = await prisma.order.upsert({
    where: { id: 'order-1' },
    update: {},
    create: {
      id: 'order-1',
      patientId: patient1.id,
      clinicianId: clinician1.id,
      payerType: PayerType.insurance,
      payerId: payer1.id,
      status: OrderStatus.pending_approval,
      createdById: userOE.id,
      assignedToId: userOE.id,
      isDraft: false,
      submittedAt: new Date('2026-02-18T10:30:00Z'),
      insuranceChecklist: {
        activeCoverage: true,
        dmeBenefit: true,
        hcpcsCoveragePolicy: true,
        priorAuthTriggers: true,
        deductibleCoinsurance: true,
        documentationRequirements: true,
        payerGuidelinesChecked: true,
      },
      createdAt: new Date('2026-02-18T09:00:00Z'),
    },
  });

  // Order lines for sample order
  await prisma.orderLine.upsert({
    where: { id: 'line-1' },
    update: {},
    create: {
      id: 'line-1',
      orderId: order1.id,
      productId: 'prod-1',
      quantity: 1,
      unitPrice: 280.0,
      lineTotal: 280.0,
    },
  });

  // Audit events for sample order
  await prisma.auditEvent.upsert({
    where: { id: 'audit-1' },
    update: {},
    create: {
      id: 'audit-1',
      orderId: order1.id,
      actorUserId: userOE.id,
      eventType: 'ORDER_CREATED',
      eventPayload: { note: 'Order created as draft' },
      createdAt: new Date('2026-02-18T09:00:00Z'),
    },
  });

  await prisma.auditEvent.upsert({
    where: { id: 'audit-2' },
    update: {},
    create: {
      id: 'audit-2',
      orderId: order1.id,
      actorUserId: userOE.id,
      eventType: 'ORDER_SUBMITTED',
      eventPayload: { note: 'Order submitted with encounter form' },
      createdAt: new Date('2026-02-18T10:30:00Z'),
    },
  });

  // Sample draft order
  const patient2 = await prisma.patient.upsert({
    where: { id: 'patient-2' },
    update: {},
    create: {
      id: 'patient-2',
      firstName: 'Linda',
      lastName: 'Thompson',
      address: '789 Maple Ave, Chicago, IL 60601',
      phone: '(312) 555-0217',
      email: 'linda.thompson@email.com',
    },
  });

  const order2 = await prisma.order.upsert({
    where: { id: 'order-2' },
    update: {},
    create: {
      id: 'order-2',
      patientId: patient2.id,
      clinicianId: clinician1.id,
      payerType: PayerType.self_pay,
      status: OrderStatus.pending_approval,
      createdById: userOps.id,
      isDraft: true,
      createdAt: new Date('2026-02-20T08:00:00Z'),
    },
  });

  await prisma.orderLine.upsert({
    where: { id: 'line-2' },
    update: {},
    create: {
      id: 'line-2',
      orderId: order2.id,
      productId: 'prod-3',
      quantity: 2,
      unitPrice: 140.0,
      lineTotal: 280.0,
    },
  });

  await prisma.auditEvent.upsert({
    where: { id: 'audit-3' },
    update: {},
    create: {
      id: 'audit-3',
      orderId: order2.id,
      actorUserId: userOps.id,
      eventType: 'ORDER_CREATED',
      eventPayload: { note: 'Order created as draft' },
      createdAt: new Date('2026-02-20T08:00:00Z'),
    },
  });

  console.log('✅ Sample orders seeded');
  console.log('\n🎉 Database seeded successfully!');
  console.log('\nTest credentials:');
  console.log('  Admin:       admin@oms.com / password123');
  console.log('  Order Entry: order_entry@oms.com / password123');
  console.log('  Ops:         ops@oms.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
