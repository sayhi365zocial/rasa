# PSARS Documentation Index

Complete technical documentation for Pharmacy Sales Audit & Reconciliation System

**Last Updated:** 12 February 2026
**Version:** 1.2

## 📚 Documentation Structure

### 1. Requirements & Design
- **[01-SRS-ORIGINAL.md](./01-SRS-ORIGINAL.md)** - Original Software Requirements Specification
- **[02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md)** - Complete Prisma schema with ERD
- **[03-BUSINESS-LOGIC.md](./03-BUSINESS-LOGIC.md)** - Calculations, validations, and formulas
- **[04-API-SPECIFICATION.md](./04-API-SPECIFICATION.md)** - REST API endpoints and examples

### 2. Architecture & Security
- **[05-WORKFLOW-STATE-MACHINE.md](./05-WORKFLOW-STATE-MACHINE.md)** - Status flow diagrams
- **[06-PERMISSION-MATRIX.md](./06-PERMISSION-MATRIX.md)** - Authentication & authorization

### 3. UI/UX Design
- **[07-WIREFRAMES.md](./07-WIREFRAMES.md)** - Screen mockups for all user roles

## 🎯 Quick Reference

### System Overview
- **Type:** Web Application (Next.js 14)
- **Users:** Store Staff, Auditor, Owner, Admin
- **Key Features:** OCR-powered daily closing, cash tracking, deposit verification

### Tech Stack
```
Frontend:  Next.js 14, React, TypeScript, Tailwind CSS
Backend:   Next.js API Routes, Prisma ORM
Database:  PostgreSQL (Railway)
Storage:   Cloudflare R2
AI/OCR:    Anthropic Claude 3.5 Sonnet
Auth:      JWT + HTTP-Only Cookies
```

### Core Modules
1. **Daily Closing** - Store staff submit sales with 3 image uploads
2. **Cash Collection** - Auditors receive and verify cash
3. **Deposit Tracking** - Bank deposit with slip verification
4. **Reporting** - Multi-branch analytics and audit trails
5. **Admin Panel** - Branch and user management

## 📊 Database Models

**8 Core Models:**
- `User` - Authentication & roles
- `Branch` - Pharmacy locations
- `DailyClosing` - Daily sales records (6 status states)
- `Deposit` - Bank deposit tracking
- `AuditLog` - Activity logging
- `SystemConfig` - App configuration

See [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) for complete schema.

## 🔄 Status Workflow

```
DRAFT → SUBMITTED → CASH_RECEIVED → DEPOSITED → COMPLETED
          ↓              ↓              ↓
       REJECTED ←―――――――┴――――――――――――┘
```

6 status states with defined transitions and permissions.
See [05-WORKFLOW-STATE-MACHINE.md](./05-WORKFLOW-STATE-MACHINE.md)

## 🔐 User Roles & Permissions

| Role | Key Permissions |
|------|----------------|
| **Store Staff** | Create/edit closings (own branch only) |
| **Auditor** | Receive cash, create deposits (all branches) |
| **Owner** | View all reports, reject closings |
| **Admin** | Full system access (CRUD all entities) |

See [06-PERMISSION-MATRIX.md](./06-PERMISSION-MATRIX.md)

## 📡 API Endpoints (Sample)

```
POST   /api/auth/login                 - User authentication
GET    /api/closings                   - List daily closings
POST   /api/closings                   - Create closing
POST   /api/closings/:id/submit        - Submit for review
POST   /api/closings/:id/receive-cash  - Auditor receive cash
POST   /api/deposits                   - Create deposit
GET    /api/reports/daily-summary      - Daily report
```

40+ endpoints documented in [04-API-SPECIFICATION.md](./04-API-SPECIFICATION.md)

## 🧮 Key Business Logic

### Net Cash Calculation
```
Net Cash = Actual Cash Count - Total Expenses
```

### Discrepancy Detection
```typescript
creditDiscrepancy = abs(posCreditAmount - edcTotalAmount)
if (creditDiscrepancy > THRESHOLD) {
  flagDiscrepancy()
}
```

### Validation Rules
- POS Credit vs EDC Settlement (±1% or ±50 THB)
- Total Sales balance check
- Deposit amount verification

See [03-BUSINESS-LOGIC.md](./03-BUSINESS-LOGIC.md)

## 🎨 UI Screens

**10 Key Screens Designed:**
1. Login Page
2. Store Staff Dashboard
3. Daily Closing Wizard (3 steps)
4. Auditor Dashboard
5. Cash Receive Form
6. Deposit Entry Form
7. Owner Executive Dashboard
8. Admin - Branch Management
9. Admin - User Management
10. Mobile Responsive Views

See [07-WIREFRAMES.md](./07-WIREFRAMES.md)

## 🚀 Development Phases

### Phase 1: Foundation (Week 1)
- Project setup
- Database schema
- Authentication system
- Basic UI components

### Phase 2: Core Features (Week 2-3)
- Daily closing module
- OCR integration
- Status workflow
- Cash receive module

### Phase 3: Advanced (Week 4)
- Deposit module
- Owner dashboard
- Reports
- Admin panel

### Phase 4: Testing & Deploy (Week 5)
- Unit & integration tests
- Deploy to Railway
- Production launch

## 📝 Development Setup

```bash
# Clone repository
git clone https://github.com/sayhi365zocial/rasa.git
cd rasa

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Database setup
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

## 🔧 Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - 32+ character secret key
- `CLOUDFLARE_R2_*` - R2 storage credentials
- `ANTHROPIC_API_KEY` - Claude API key

See `.env.example` for complete list.

## 📞 Support & Contact

- **Project Owner:** MerMed Pharma
- **GitHub:** [@sayhi365zocial](https://github.com/sayhi365zocial)
- **Repository:** https://github.com/sayhi365zocial/rasa

## 📄 License

Proprietary - MerMed Pharma © 2026

---

**Generated by:** Claude Code Analysis
**Documentation Complete:** ✅ All 7 documents ready for development
