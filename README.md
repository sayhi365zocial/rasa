# Pharmacy Sales Audit & Reconciliation System (PSARS)

## Project Overview

**Version:** 1.2
**Type:** Web Application
**Last Updated:** 12 February 2026

A comprehensive web-based system for managing daily sales closing, cash reconciliation, and bank deposit tracking across multiple pharmacy branches.

## Key Features

- **Daily Sales Closing** - Store staff submit daily sales with OCR-powered data extraction
- **Cash Management** - Auditors receive and verify cash from branches
- **Bank Deposit Tracking** - Automated deposit verification with slip scanning
- **Multi-branch Dashboard** - Real-time overview for business owners
- **Audit Trail** - Complete logging of all financial transactions
- **Role-based Access Control** - 4 user roles with granular permissions

## Tech Stack

### Infrastructure
- **PaaS:** Railway (Deployment & Database)
- **Storage:** Cloudflare R2 (File storage)
- **AI/OCR:** Anthropic Claude 3.5 Sonnet API

### Application
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Frontend:** React, Tailwind CSS, Shadcn UI
- **Backend:** Next.js Server Actions / API Routes
- **Database:** PostgreSQL
- **ORM:** Prisma

### Authentication
- **Method:** JWT (JSON Web Token)
- **Storage:** HTTP-Only Cookies
- **Password:** bcrypt hashing (12 rounds)

## User Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Store Staff** | Front-line pharmacy staff | Create daily closings (own branch only) |
| **Auditor** | Cash collection & deposit manager | Receive cash, create deposits (all branches) |
| **Owner** | Business owner | View all reports, reject closings |
| **Admin** | System administrator | Full access to all features |

## Project Structure

```
rasa/
├── docs/                       # Documentation
│   ├── 01-database-schema.md   # Prisma schema & ERD
│   ├── 02-business-logic.md    # Calculations & validations
│   ├── 03-api-spec.md          # API endpoints & examples
│   ├── 04-workflow.md          # Status flow & state machine
│   ├── 05-permissions.md       # Access control matrix
│   └── 06-wireframes.md        # UI mockups
├── prisma/
│   └── schema.prisma           # Database schema
├── app/
│   ├── api/                    # API routes
│   ├── (auth)/                 # Auth pages
│   └── (dashboard)/            # Protected pages
├── lib/
│   ├── auth/                   # Auth utilities
│   ├── ocr/                    # Claude API integration
│   └── storage/                # Cloudflare R2 utilities
└── components/                 # React components
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/sayhi365zocial/rasa.git
cd rasa

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Setup database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Default Login Credentials (Development)

```
Store Staff:
Email: staff.rama9@mermed.com
Password: Staff@2026

Auditor:
Email: auditor@mermed.com
Password: Auditor@2026

Owner:
Email: owner@mermed.com
Password: Owner@2026
```

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/psars"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"

# Cloudflare R2
CLOUDFLARE_R2_ACCOUNT_ID="your-account-id"
CLOUDFLARE_R2_ACCESS_KEY="your-access-key"
CLOUDFLARE_R2_SECRET_KEY="your-secret-key"
CLOUDFLARE_R2_BUCKET_NAME="psars"

# Anthropic Claude API
ANTHROPIC_API_KEY="sk-ant-api03-..."

# App Configuration
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Development Roadmap

### Phase 1: Foundation (Week 1)
- [x] Project setup & documentation
- [ ] Database schema implementation
- [ ] Authentication system
- [ ] Basic UI components

### Phase 2: Core Features (Week 2-3)
- [ ] Daily closing module (Store Staff)
- [ ] File upload + OCR integration
- [ ] Status workflow implementation
- [ ] Cash receive module (Auditor)

### Phase 3: Advanced Features (Week 4)
- [ ] Bank deposit module
- [ ] Owner dashboard
- [ ] Multi-branch reports
- [ ] Admin panel (Branch & User management)

### Phase 4: Testing & Deployment (Week 5)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Deploy to Railway
- [ ] Production launch

## API Documentation

See [docs/03-api-spec.md](docs/03-api-spec.md) for complete API reference.

### Sample API Endpoints

```
POST   /api/auth/login                 - User login
GET    /api/closings                   - List daily closings
POST   /api/closings                   - Create new closing
POST   /api/closings/:id/submit        - Submit closing
POST   /api/closings/:id/receive-cash  - Auditor receive cash
POST   /api/deposits                   - Create deposit
GET    /api/reports/daily-summary      - Daily summary report
```

## Database Schema

Key Models:
- **User** - Authentication & roles
- **Branch** - Pharmacy locations
- **DailyClosing** - Daily sales records
- **Deposit** - Bank deposit tracking
- **AuditLog** - Activity logging

See [docs/01-database-schema.md](docs/01-database-schema.md) for complete schema.

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

Proprietary - MerMed Pharma © 2026

## Contact

Project Owner: MerMed Pharma
Email: owner@mermed.com
GitHub: [@sayhi365zocial](https://github.com/sayhi365zocial)

---

**Built with** Next.js, Prisma, Cloudflare R2, and Claude AI
