# Medical Supply Order Management System (Phase 1)

An internal web application for managing medical supply orders, replacing an Excel-based workflow. Built with Next.js, TypeScript, Prisma, and PostgreSQL.

## Features (Phase 1)

- **Order Intake** — 6-step wizard with autosave drafts
- **Product Selection** — Search with auto-populated HCPCS codes, vendor info, pricing
- **Measurement Form Upload** — Per-line file upload when required (PDF/JPG/PNG)
- **Insurance Verification** — 7-point checklist with validation
- **PDF Generation** — Encounter Form PDF creation and storage
- **Status Tracking** — Timeline/audit trail with event logging
- **Role-Based Access** — `order_entry` and `ops` roles with secure auth

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js v5 (Credentials provider, JWT)
- **PDF:** pdf-lib
- **Styling:** Custom CSS design system (Inter font, navy/teal palette)

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL running locally

### Setup

```bash
# 1. Clone and install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/ms_oms"

# 3. Create database
# In psql: CREATE DATABASE ms_oms;

# 4. Run migrations and generate Prisma client
npx prisma migrate dev --name init

# 5. Seed the database
npx prisma db seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Order Entry | order_entry@oms.com | password123 |
| Operations | ops@oms.com | password123 |

## Seed Data

- **2 Users** — Sarah Johnson (order_entry), Mike Torres (ops)
- **3 Vendors** — Ossur Americas, Ottobock, Breg Inc.
- **10 Products** — Knee braces, AFOs, lumbar supports, splints, etc.
- **3 Payers** — Medicare, BCBS, Aetna
- **24 Fee Schedule Entries** — Rates per HCPCS per payer
- **2 Sample Orders** — 1 submitted, 1 draft

## Main Flows

### Create an Order
1. Log in → Dashboard
2. Click **New Order**
3. Step 1: Enter patient info
4. Step 2: Enter clinician info
5. Step 3: Search/add products, upload measurement forms if required
6. Step 4: Select payer type (Insurance or Self-Pay), review pricing
7. Step 5: Complete insurance verification checklist
8. Step 6: Review and click **Submit Order**

### Track Orders
- Dashboard shows all orders with status filters
- Click any order → Detail page with 3 tabs:
  - **Details** — Patient, clinician, product lines, pricing
  - **Documents** — Download encounter form PDF
  - **Timeline** — Full audit trail of all events
- Use **Change Status** to update order status (logs an audit event)

## Project Structure

```
src/
├── app/
│   ├── (authenticated)/       # Protected routes
│   │   ├── dashboard/         # Orders table + filters
│   │   └── orders/
│   │       ├── new/           # 6-step order wizard
│   │       └── [id]/          # Order detail page
│   ├── api/                   # API routes
│   │   ├── auth/              # NextAuth
│   │   ├── orders/            # CRUD + status + submit + PDF
│   │   ├── products/          # Product search
│   │   ├── payers/            # Payer list
│   │   └── upload/            # File upload
│   └── login/                 # Login page
├── components/                # Shared components
├── lib/
│   ├── auth.ts                # NextAuth configuration
│   ├── prisma.ts              # Prisma client singleton
│   └── pdf/                   # PDF generation
└── middleware.ts              # Auth middleware
```
