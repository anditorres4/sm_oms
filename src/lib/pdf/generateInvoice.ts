import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface OrderForPDF {
    id: string;
    createdAt: Date;
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
    };
    lines: {
        product: { name: string; hcpcsCode: string };
        quantity: number;
        unitPrice: number | string | { toString(): string };
        lineTotal: number | string | { toString(): string };
    }[];
}

const NAVY = rgb(0.06, 0.18, 0.36);
const TEAL = rgb(0.08, 0.59, 0.65);
const DARK_GRAY = rgb(0.25, 0.25, 0.3);
const LIGHT_GRAY = rgb(0.95, 0.95, 0.96);
const BORDER_COLOR = rgb(0.85, 0.85, 0.88);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);

function toNum(val: any): number {
    if (typeof val === 'number') return val;
    return parseFloat(val?.toString() ?? '0') || 0;
}

function formatCurrency(val: any): string {
    return `$${toNum(val).toFixed(2)}`;
}

export async function generatePatientInvoicePDF(order: OrderForPDF): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    const margin = 48;
    let y = height - margin;

    // ─── Header Band ───────────────────────────────────────────
    page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: NAVY });

    page.drawText('MEDICAL SUPPLY OMS', { x: margin, y: height - 32, size: 18, font: helveticaBold, color: WHITE });
    page.drawText('PATIENT INVOICE', { x: margin, y: height - 52, size: 11, font: helvetica, color: rgb(0.7, 0.85, 0.95) });

    const orderId = `Order #${order.id.slice(-8).toUpperCase()}`;
    const orderIdWidth = helveticaBold.widthOfTextAtSize(orderId, 10);
    page.drawText(orderId, { x: width - margin - orderIdWidth, y: height - 32, size: 10, font: helveticaBold, color: WHITE });

    y = height - 110;

    // ─── Patient & Clinic Information ───────────────────────────
    // Two-column layout
    const col2X = margin + 260;

    // Patient Column
    page.drawText('BILL TO / PATIENT:', { x: margin, y, size: 9, font: helveticaBold, color: TEAL });
    let leftY = y - 16;
    page.drawText(`${order.patient.firstName} ${order.patient.lastName}`, { x: margin, y: leftY, size: 10, font: helveticaBold, color: BLACK }); leftY -= 14;
    page.drawText(order.patient.address, { x: margin, y: leftY, size: 9, font: helvetica, color: DARK_GRAY }); leftY -= 14;
    page.drawText(order.patient.phone, { x: margin, y: leftY, size: 9, font: helvetica, color: DARK_GRAY }); leftY -= 14;
    page.drawText(order.patient.email, { x: margin, y: leftY, size: 9, font: helvetica, color: DARK_GRAY });

    // Clinician Column
    if (order.clinician) {
        page.drawText('CLINIC / CLINICIAN:', { x: col2X, y, size: 9, font: helveticaBold, color: TEAL });
        let rightY = y - 16;
        page.drawText(order.clinician.clinicName, { x: col2X, y: rightY, size: 10, font: helveticaBold, color: BLACK }); rightY -= 14;
        page.drawText(`Dr. ${order.clinician.firstName} ${order.clinician.lastName}`, { x: col2X, y: rightY, size: 9, font: helvetica, color: DARK_GRAY }); rightY -= 14;
        page.drawText(order.clinician.clinicAddress, { x: col2X, y: rightY, size: 9, font: helvetica, color: DARK_GRAY }); rightY -= 14;
        page.drawText(order.clinician.phone, { x: col2X, y: rightY, size: 9, font: helvetica, color: DARK_GRAY });
    }

    y -= 85;

    // ─── Products Table ─────────────────────────────────────────
    page.drawText('LINE ITEMS:', { x: margin, y, size: 9, font: helveticaBold, color: TEAL });
    y -= 12;

    // Table Header
    page.drawRectangle({ x: margin, y: y - 16, width: width - margin * 2, height: 20, color: LIGHT_GRAY, borderColor: BORDER_COLOR, borderWidth: 1 });
    y -= 10;
    page.drawText('Product', { x: margin + 8, y, size: 8, font: helveticaBold, color: DARK_GRAY });
    page.drawText('HCPCS', { x: margin + 220, y, size: 8, font: helveticaBold, color: DARK_GRAY });
    page.drawText('Qty', { x: margin + 280, y, size: 8, font: helveticaBold, color: DARK_GRAY });
    page.drawText('Unit Price', { x: margin + 340, y, size: 8, font: helveticaBold, color: DARK_GRAY });
    page.drawText('Total', { x: margin + 420, y, size: 8, font: helveticaBold, color: DARK_GRAY });
    y -= 16;

    // Table Rows
    let orderTotal = 0;
    order.lines.forEach((line) => {
        const lineTotalNum = toNum(line.lineTotal);
        orderTotal += lineTotalNum;

        // Truncate product name if too long
        let pName = line.product.name;
        if (pName.length > 40) pName = pName.slice(0, 37) + '...';

        page.drawText(pName, { x: margin + 8, y, size: 8, font: helvetica, color: BLACK });
        page.drawText(line.product.hcpcsCode, { x: margin + 220, y, size: 8, font: helvetica, color: DARK_GRAY });
        page.drawText(line.quantity.toString(), { x: margin + 280, y, size: 8, font: helvetica, color: BLACK });
        page.drawText(formatCurrency(line.unitPrice), { x: margin + 340, y, size: 8, font: helvetica, color: BLACK });
        page.drawText(formatCurrency(lineTotalNum), { x: margin + 420, y, size: 8, font: helveticaBold, color: BLACK });

        y -= 6;
        page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: BORDER_COLOR });
        y -= 12;
    });

    y -= 10;

    // ─── Total ────────────────────────────────────────────────
    page.drawText('TOTAL DUE:', { x: margin + 340, y, size: 10, font: helveticaBold, color: NAVY });
    page.drawText(formatCurrency(orderTotal), { x: margin + 420, y, size: 10, font: helveticaBold, color: BLACK });

    y -= 60;

    // ─── Strapi Placeholder ─────────────────────────────────────
    page.drawRectangle({ x: margin, y: y - 48, width: width - margin * 2, height: 60, color: rgb(0.98, 0.95, 0.88), borderColor: rgb(0.9, 0.8, 0.6), borderWidth: 1 });
    page.drawText('STRAPI INTEGRATION PENDING', { x: margin + 12, y: y - 10, size: 10, font: helveticaBold, color: rgb(0.6, 0.5, 0.1) });
    page.drawText('Detailed invoice terms, payment instructions, and external pricing components will', { x: margin + 12, y: y - 26, size: 9, font: helveticaOblique, color: DARK_GRAY });
    page.drawText('be synced here in a future release via Strapi CMS.', { x: margin + 12, y: y - 38, size: 9, font: helveticaOblique, color: DARK_GRAY });

    // ─── Footer ──────────────────────────────────────────────────
    page.drawText(`Generated by Medical Supply OMS  •  Order ID: ${order.id}  •  ${new Date().toISOString()}`, {
        x: margin, y: 46, size: 7, font: helvetica, color: rgb(0.5, 0.5, 0.5)
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

