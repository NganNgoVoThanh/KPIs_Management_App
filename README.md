# 🎯 KPI Management System

> Enterprise-grade Performance Management Platform built with Next.js 14, TypeScript, Prisma & MySQL

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.16-2D3748?logo=prisma)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?logo=mysql)](https://www.mysql.com/)

## ✨ Features

### 🎯 Core Functionality
- **4 KPI Types Support**
  - Type I: Quantitative (Higher is Better)
  - Type II: Quantitative (Lower is Better)
  - Type III: Boolean (Pass/Fail)
  - Type IV: Milestone with Custom Scoring Scale

- **2-Level Approval Workflow**
  - Level 1: Line Manager (N+1)
  - Level 2: Manager (N+2)
  - Automatic notifications and status tracking

- **Comprehensive KPI Management**
  - Create, Edit, Submit, Approve, Reject KPIs
  - Batch KPI creation (3-5 KPIs per cycle)
  - Automatic weight validation (Total = 100%)
  - Individual weight constraints (5-40% each)

- **KPI Library**
  - Pre-defined KPI templates by department & job title
  - OGSM alignment tracking
  - Data source specification
  - Import from library to personal KPIs

### 📊 Performance Tracking
- **Actuals Entry**: Staff input actual performance values
- **Scoring Engine**: Automatic score calculation based on KPI type
- **Performance Reports**: Real-time dashboards for all roles
- **Historical Data**: Track performance trends over time

### 🔐 Role-Based Access Control
- **ADMIN**: Full system management
- **MANAGER**: Team oversight & Level 2 approvals
- **LINE_MANAGER**: Direct reports management & Level 1 approvals
- **STAFF**: Personal KPI management

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.x
- MySQL >= 8.0
- npm or yarn

### Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd KPIs_Management_App

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Edit .env with your MySQL database credentials
DATABASE_URL="mysql://user:password@host:3306/tripsmgm_kpi"

# 4. Initialize database
npx prisma generate
npx prisma migrate deploy

# 5. Seed database with sample data
npx prisma db seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Users

| Role | Email | Description |
|------|-------|-------------|
| Admin | admin@intersnack.com.vn | System administrator |
| Manager | manager@intersnack.com.vn | Department manager (N+2) |
| Line Manager | linemanager@intersnack.com.vn | Team leader (N+1) |
| Staff | staff@intersnack.com.vn | Employee |

## 📚 Documentation

- **[Complete Setup Guide](./SETUP_GUIDE.md)** - Detailed installation instructions for MySQL
- **[KPI Backend Setup](./docs/KPI_BACKEND_SETUP.md)** - API documentation
- **[Database Schema](./prisma/schema.prisma)** - Data model reference

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Chart.js** - Data visualization

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Modern ORM for database access
- **MySQL 8.0** - Relational database

## 📂 Project Structure

```
├── app/
│   ├── api/                 # API routes
│   │   ├── kpi/            # KPI CRUD
│   │   ├── cycles/         # Cycle management
│   │   ├── users/          # User management
│   │   ├── approvals/      # Approval workflow
│   │   ├── notifications/  # Notifications
│   │   └── dashboard/      # Dashboard stats
│   ├── kpis/               # KPI pages
│   └── layout.tsx          # Root layout
├── components/
│   ├── kpi/                # KPI components
│   └── ui/                 # UI components
├── lib/
│   ├── db.ts               # Database service
│   ├── auth-service.ts     # Authentication
│   └── kpi-validation.ts   # Validation logic
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Seed data
│   └── migrations/         # SQL migrations
└── docs/                   # Documentation
```

## 📈 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **KPIs** |||
| GET | `/api/kpi` | Get KPIs list |
| POST | `/api/kpi` | Create KPIs (batch) |
| GET | `/api/kpi/[id]` | Get KPI details |
| PUT | `/api/kpi/[id]` | Update KPI |
| POST | `/api/kpi/[id]/submit` | Submit for approval |
| POST | `/api/kpi/[id]/approve` | Approve KPI |
| **Cycles** |||
| GET | `/api/cycles` | Get all cycles |
| POST | `/api/cycles` | Create cycle (Admin) |
| POST | `/api/cycles/[id]/actions` | Open/Close cycle |
| **Dashboard** |||
| GET | `/api/dashboard` | Get dashboard stats |

## 🔒 Security Features

- ✅ Role-based access control (RBAC)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ Authentication & authorization
- ✅ Audit logging for all actions
- ✅ Secure password handling

## 📦 Build & Deploy

```bash
# Production build
npm run build

# Start production server
npm start
```

## 📊 Database Schema

16 tables with full referential integrity:

- `users` - User accounts & profiles
- `org_units` - Organizational hierarchy
- `cycles` - KPI cycles & periods
- `kpi_definitions` - KPI goals
- `kpi_actuals` - Performance data
- `approvals` - Approval workflow
- `notifications` - System notifications
- And more...

## 🆘 Support

For issues and questions:
- Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for troubleshooting
- Review [KPI_BACKEND_SETUP.md](./docs/KPI_BACKEND_SETUP.md) for API details
- Create an issue in this repository

---

**Made with ❤️ by KPI Management Team**

**Version**: 1.0.0
**Last Updated**: 2025-10-23
