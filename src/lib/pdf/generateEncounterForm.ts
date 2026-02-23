import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

interface OrderForPDF {
    id: string;
    createdAt: Date;
    submittedAt?: Date | null;
    payerType: string;
    insuranceChecklist?: Record<string, boolean> | null;
    patient: {
        firstName: string;
        lastName: string;
        address: string;
        phone: string;
        email: string;
    };
    clinician?: {
        firstName: string;
        lastName: string;
        clinicName: string;
        clinicAddress: string;
        phone: string;
        email: string;
    } | null;
    payer?: { name: string } | null;
    lines: {
        product: {
            name: string;
            hcpcsCode: string;
            vendor: { name: string };
        };
        quantity: number;
        unitPrice: number | string | { toString(): string };
        lineTotal: number | string | { toString(): string };
    }[];
}

const NAVY = rgb(0.06, 0.18, 0.36);
const TEAL = rgb(0.09, 0.53, 0.49);
const LIGHT_GRAY = rgb(0.94, 0.95, 0.97);
const DARK_GRAY = rgb(0.25, 0.25, 0.3);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);

function toNum(val: any): number {
    if (typeof val === 'number') return val;
    return parseFloat(val?.toString() ?? '0') || 0;
}

function formatCurrency(val: any): string {
    return `$${toNum(val).toFixed(2)}`;
}

function formatDate(d: Date | string | null | undefined): string {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export async function generateEncounterFormPDF(order: OrderForPDF): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    const margin = 48;
    let y = height - margin;

    // ─── Header Band ───────────────────────────────────────────
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY });

    page.drawText('MEDICAL SUPPLY OMS', {
        x: margin,
        y: height - 32,
        size: 18,
        font: helveticaBold,
        color: WHITE,
    });

    page.drawText('ENCOUNTER FORM', {
        x: margin,
        y: height - 52,
        size: 11,
        font: helvetica,
        color: rgb(0.7, 0.85, 0.95),
    });

    // Order meta on right
    const orderId = `Order #${order.id.slice(-8).toUpperCase()}`;
    const orderIdWidth = helveticaBold.widthOfTextAtSize(orderId, 10);
    page.drawText(orderId, {
        x: width - margin - orderIdWidth,
        y: height - 32,
        size: 10,
        font: helveticaBold,
        color: WHITE,
    });

    const dateText = `Created: ${formatDate(order.createdAt)}`;
    const dateWidth = helvetica.widthOfTextAtSize(dateText, 8);
    page.drawText(dateText, {
        x: width - margin - dateWidth,
        y: height - 48,
        size: 8,
        font: helvetica,
        color: rgb(0.7, 0.85, 0.95),
    });

    if (order.submittedAt) {
        const submitText = `Submitted: ${formatDate(order.submittedAt)}`;
        const submitWidth = helvetica.widthOfTextAtSize(submitText, 8);
        page.drawText(submitText, {
            x: width - margin - submitWidth,
            y: height - 60,
            size: 8,
            font: helvetica,
            color: rgb(0.7, 0.85, 0.95),
        });
    }

    y = height - 96;

    // ─── Helper functions ───────────────────────────────────────
    function drawSectionHeader(label: string) {
        page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 22, color: TEAL });
        page.drawText(label.toUpperCase(), {
            x: margin + 8,
            y: y + 4,
            size: 9,
            font: helveticaBold,
            color: WHITE,
        });
        y -= 26;
    }

    function drawField(label: string, value: string, colX: number, colWidth: number) {
        page.drawText(label + ':', {
            x: colX,
            y,
            size: 7.5,
            font: helveticaBold,
            color: DARK_GRAY,
        });
        page.drawText(value || '—', {
            x: colX + 90,
            y,
            size: 7.5,
            font: helvetica,
            color: BLACK,
        });
    }

    function drawTwoCol(leftLabel: string, leftVal: string, rightLabel: string, rightVal: string) {
        const halfW = (width - margin * 2) / 2;
        drawField(leftLabel, leftVal, margin + 8, halfW - 16);
        drawField(rightLabel, rightVal, margin + halfW + 8, halfW - 16);
        y -= 14;
    }

    function drawOneRow(label: string, value: string) {
        drawField(label, value, margin + 8, width - margin * 2 - 16);
        y -= 14;
    }

    // ─── Patient Section ────────────────────────────────────────
    drawSectionHeader('Patient Information');
    y -= 4;
    drawTwoCol('First Name', order.patient.firstName, 'Last Name', order.patient.lastName);
    drawOneRow('Address', order.patient.address);
    drawTwoCol('Phone', order.patient.phone, 'Email', order.patient.email);
    y -= 8;

    // ─── Clinician Section ──────────────────────────────────────
    if (order.clinician) {
        drawSectionHeader('Clinician / Clinic Information');
        y -= 4;
        drawTwoCol('Clinician', `${order.clinician.firstName} ${order.clinician.lastName}`, 'Clinic', order.clinician.clinicName);
        drawOneRow('Clinic Address', order.clinician.clinicAddress);
        drawTwoCol('Phone', order.clinician.phone, 'Email', order.clinician.email);
        y -= 8;
    }

    // ─── Payer Section ──────────────────────────────────────────
    drawSectionHeader('Payer Information');
    y -= 4;
    drawTwoCol(
        'Payer Type',
        order.payerType === 'insurance' ? 'Insurance' : 'Self-Pay',
        'Payer Name',
        order.payer?.name || (order.payerType === 'self_pay' ? 'Self-Pay' : '—')
    );
    y -= 8;

    // ─── Product Lines Table ─────────────────────────────────────
    drawSectionHeader('Product Lines');
    y -= 4;

    // Table header
    const colWidths = [180, 70, 90, 50, 70, 70];
    const colHeaders = ['Product Name', 'HCPCS Code', 'Vendor', 'Qty', 'Unit Price', 'Line Total'];
    const colX = [margin + 4, margin + 184, margin + 254, margin + 344, margin + 394, margin + 464];

    page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 18, color: LIGHT_GRAY });

    colHeaders.forEach((h, i) => {
        page.drawText(h, { x: colX[i], y: y + 2, size: 7.5, font: helveticaBold, color: DARK_GRAY });
    });
    y -= 20;

    let orderTotal = 0;
    order.lines.forEach((line, idx) => {
        if (idx % 2 === 0) {
            page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 16, color: rgb(0.98, 0.98, 1) });
        }
        const lineTotal = toNum(line.lineTotal);
        orderTotal += lineTotal;

        const rowData = [
            line.product.name,
            line.product.hcpcsCode,
            line.product.vendor.name,
            String(line.quantity),
            formatCurrency(line.unitPrice),
            formatCurrency(lineTotal),
        ];

        rowData.forEach((d, i) => {
            const truncated = d.length > 22 ? d.slice(0, 19) + '...' : d;
            page.drawText(truncated, { x: colX[i], y, size: 7.5, font: helvetica, color: BLACK });
        });
        y -= 16;
    });

    // Total row
    page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 18, color: NAVY });
    page.drawText('ORDER TOTAL', { x: colX[4], y: y + 2, size: 8, font: helveticaBold, color: WHITE });
    const totalStr = formatCurrency(orderTotal);
    page.drawText(totalStr, { x: colX[5], y: y + 2, size: 8, font: helveticaBold, color: WHITE });
    y -= 24;

    // ─── Insurance Checklist ─────────────────────────────────────
    y -= 4;
    drawSectionHeader('Insurance Verification Checklist');
    y -= 6;

    const checklist = order.insuranceChecklist as Record<string, boolean> | null;
    const items = [
        { key: 'activeCoverage', label: 'Active coverage and plan type confirmed' },
        { key: 'dmeBenefit', label: 'DME benefit and in-network requirement verified' },
        { key: 'hcpcsCoveragePolicy', label: 'HCPCS coverage policy and rental/purchase rule checked' },
        { key: 'priorAuthTriggers', label: 'Prior authorization / WOPD triggers reviewed' },
        { key: 'deductibleCoinsurance', label: 'Deductible, coinsurance, and secondary payer evaluated' },
        { key: 'documentationRequirements', label: 'Order and clinical documentation requirements verified (Medicare SWO/WOPD)' },
        { key: 'payerGuidelinesChecked', label: 'Payer guidelines checked and confirmed' },
    ];

    items.forEach((item) => {
        const checked = checklist?.[item.key] === true;
        const color = checked ? TEAL : rgb(0.6, 0.1, 0.1);

        // Draw checkbox square
        page.drawRectangle({
            x: margin + 8,
            y: y - 1,
            width: 10,
            height: 10,
            borderColor: color,
            borderWidth: 1,
            color: checked ? color : WHITE,
        });

        // Draw checkmark lines if checked
        if (checked) {
            page.drawLine({
                start: { x: margin + 10, y: y + 4 },
                end: { x: margin + 13, y: y + 2 },
                thickness: 1.5,
                color: WHITE,
            });
            page.drawLine({
                start: { x: margin + 13, y: y + 2 },
                end: { x: margin + 16, y: y + 7 },
                thickness: 1.5,
                color: WHITE,
            });
        }

        page.drawText(item.label, { x: margin + 26, y, size: 8, font: helvetica, color: BLACK });
        y -= 14;
    });

    // ─── Footer ──────────────────────────────────────────────────
    page.drawLine({ start: { x: margin, y: 60 }, end: { x: width - margin, y: 60 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    page.drawText(`Generated by Medical Supply OMS  •  Order ID: ${order.id}  •  ${new Date().toISOString()}`, {
        x: margin,
        y: 46,
        size: 7,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText('CONFIDENTIAL — FOR INTERNAL USE ONLY', {
        x: margin,
        y: 34,
        size: 7,
        font: helveticaBold,
        color: rgb(0.6, 0.1, 0.1),
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}
