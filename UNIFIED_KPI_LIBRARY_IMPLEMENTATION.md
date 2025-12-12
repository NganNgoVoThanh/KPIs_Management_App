# Unified KPI Library - Implementation Summary

## Overview

Tài liệu này mô tả chi tiết việc triển khai **Unified KPI Library System** - một hệ thống tích hợp và mở rộng để quản lý KPI Templates, Resources và BI Dashboards.

## Mục tiêu

### Vấn đề cũ
- **2 hệ thống riêng biệt** gây nhầm lẫn:
  - `/templates` - Quản lý form-based KPI templates (chỉ ADMIN)
  - `/admin/kpi-library` - Upload Excel + Resources (ADMIN)
- Chức năng **trùng lặp** về quản lý KPI templates
- **Giới hạn** upload chỉ Excel files
- Không hỗ trợ BI Dashboards integration

### Giải pháp mới
✅ **Unified KPI Library** - Một hệ thống duy nhất với:
- **KPI Templates** - Cả manual create VÀ Excel upload
- **Multi-format Resources** - PDF, Word, Excel, Images, Videos, etc.
- **BI Dashboard Integration** - Power BI, Fabric, Tableau, Looker
- **External Links** - Link đến tài nguyên bên ngoài
- **Approval Workflow** - Quản lý chất lượng thống nhất

---

## Phase 1: Database Schema ✅ COMPLETED

### 1.1. Enhanced KpiTemplate Model

**File**: `prisma/schema.prisma` (lines 110-177)

**Thay đổi chính**:
```prisma
model KpiTemplate {
  // NEW: Structured KPI details instead of JSON fields
  kpiType        String   // QUANTITATIVE, QUALITATIVE
  unit           String?
  formula        String?
  dataSource     String?
  targetValue    Float?
  weight         Float?

  // NEW: Metadata
  tags           Json?
  ogsmAlignment  String?
  frequency      String?
  priority       String?

  // NEW: Source tracking
  source         String   @default("MANUAL") // MANUAL, EXCEL_UPLOAD, CLONED
  uploadId       String?  // Link to KpiLibraryUpload
  clonedFromId   String?

  // NEW: Approval workflow
  status         String   @default("DRAFT") // DRAFT, PENDING, APPROVED, REJECTED
  submittedBy    String?
  reviewedBy     String?
  reviewComment  String?
  rejectionReason String?

  // NEW: Usage statistics
  usageCount     Int      @default(0)
  lastUsedAt     DateTime?
}
```

**Benefits**:
- ✅ Hỗ trợ cả manual create VÀ Excel upload
- ✅ Approval workflow thống nhất
- ✅ Track usage để biết template nào phổ biến
- ✅ Version control

### 1.2. New KpiLibraryUpload Model

**File**: `prisma/schema.prisma` (lines 416-453)

**Mục đích**: Track Excel file uploads với approval workflow

```prisma
model KpiLibraryUpload {
  fileName        String
  fileSize        Int
  rawData         Json      // Original Excel data
  totalEntries    Int
  validEntries    Int
  invalidEntries  Int
  parseErrors     Json?     // Validation errors

  // Approval workflow
  status          String    @default("PENDING")
  reviewedBy      String?
  reviewComment   String?
  rejectionReason String?

  // Processing
  processedAt     DateTime?
  processedCount  Int       @default(0)
}
```

**Benefits**:
- ✅ Audit trail cho mọi Excel upload
- ✅ Validation trước khi approve
- ✅ Track processing status

### 1.3. Enhanced KpiResource Model

**File**: `prisma/schema.prisma` (lines 487-556)

**Thay đổi chính**:
```prisma
model KpiResource {
  // NEW: Resource type
  resourceType    String    @default("FILE")
  // FILE, BI_DASHBOARD, LINK, EMBEDDED

  // For FILE type (nullable now)
  fileName        String?
  fileType        String?   // pdf, xlsx, docx, jpg, png, etc.
  fileSize        Int?
  mimeType        String?
  storageProvider String?   // M365, LOCAL, AZURE_BLOB, S3

  // NEW: BI Dashboard fields
  dashboardUrl    String?
  dashboardType   String?   // POWER_BI, FABRIC, TABLEAU, LOOKER
  embedUrl        String?   // For iframe embedding
  workspaceId     String?
  reportId        String?
  datasetId       String?
  requiresAuth    Boolean   @default(false)
  authConfig      Json?     // Authentication configuration

  // NEW: External link
  externalUrl     String?

  // NEW: Enhanced metadata
  isFeatured      Boolean   @default(false)
  version         Int       @default(1)
  lastSyncedAt    DateTime? // For BI dashboards
}
```

**Benefits**:
- ✅ Hỗ trợ **tất cả loại file** (không chỉ Excel)
- ✅ **BI Dashboard integration** với Power BI, Fabric, Tableau
- ✅ **External links** để reference tài nguyên bên ngoài
- ✅ **Featured resources** để highlight nội dung quan trọng
- ✅ **Versioning** và sync tracking

---

## Phase 2: TypeScript Types ✅ COMPLETED

### 2.1. Enhanced Template Types

**File**: `lib/types.ts` (lines 91-167)

```typescript
export type TemplateSource = 'MANUAL' | 'EXCEL_UPLOAD' | 'CLONED' | 'IMPORTED'
export type TemplateStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'

export interface KpiTemplate {
  // Full structured data instead of JSON fields
  kpiType: string
  unit?: string
  formula?: string
  dataSource?: string
  targetValue?: number
  weight?: number

  // Metadata
  tags?: string[]
  ogsmAlignment?: string
  frequency?: string
  priority?: string

  // Source tracking
  source: TemplateSource
  uploadId?: string
  clonedFromId?: string

  // Approval workflow
  status: TemplateStatus
  submittedBy?: string
  reviewedBy?: string
  reviewComment?: string

  // Usage statistics
  usageCount: number
  lastUsedAt?: string
}
```

### 2.2. Enhanced Resource Types

**File**: `lib/types.ts` (lines 745-853)

```typescript
export type KpiResourceType = 'FILE' | 'BI_DASHBOARD' | 'LINK' | 'EMBEDDED'
export type BiDashboardType = 'POWER_BI' | 'FABRIC' | 'TABLEAU' | 'LOOKER' | 'CUSTOM'

export interface KpiResource {
  resourceType: KpiResourceType

  // File information (optional)
  fileName?: string
  fileType?: string

  // BI Dashboard specific
  dashboardUrl?: string
  dashboardType?: BiDashboardType
  embedUrl?: string
  workspaceId?: string
  reportId?: string
  datasetId?: string
  requiresAuth?: boolean
  authConfig?: {
    type: 'AZURE_AD' | 'SERVICE_PRINCIPAL' | 'API_KEY' | 'OAUTH'
    tenantId?: string
    clientId?: string
    scopes?: string[]
  }

  // External link
  externalUrl?: string

  // Enhanced metadata
  isFeatured?: boolean
  version?: number
  lastSyncedAt?: string
}
```

---

## Phase 3: Backend Services ✅ COMPLETED

### 3.1. KPI Template Service

**File**: `lib/kpi-template-service.ts`

**Chức năng chính**:
- ✅ `createTemplate()` - Tạo template mới (manual hoặc từ Excel)
- ✅ `getTemplates(filters)` - Lấy templates với filters
- ✅ `submitForReview()` - Submit để duyệt
- ✅ `approveTemplate()` / `rejectTemplate()` - Approval workflow
- ✅ `cloneTemplate()` - Clone template có sẵn
- ✅ `incrementUsage()` - Track usage statistics
- ✅ `getStatistics()` - Thống kê templates

**Example Usage**:
```typescript
// Create manual template
const template = await kpiTemplateService.createTemplate({
  name: "Revenue Growth",
  department: "Sales",
  kpiType: "QUANTITATIVE",
  unit: "%",
  targetValue: 15,
  weight: 0.3,
  source: "MANUAL",
  createdBy: userId
})

// Submit for review
await kpiTemplateService.submitForReview(template.id, userId)

// Approve
await kpiTemplateService.approveTemplate(template.id, adminId, "Looks good!")

// Clone
const cloned = await kpiTemplateService.cloneTemplate(template.id, userId, {
  name: "Revenue Growth Q2"
})
```

### 3.2. KPI Library Upload Service

**File**: `lib/kpi-library-upload-service.ts`

**Chức năng chính**:
- ✅ `createUpload()` - Upload Excel và validate data
- ✅ `approveUpload()` - Approve và process entries vào KpiLibraryEntry
- ✅ `rejectUpload()` - Reject với lý do
- ✅ `validateExcelData()` - Validate dữ liệu Excel
- ✅ `processValidEntries()` - Xử lý entries sau approve

**Excel Structure Expected**:
```
Row 1-6: Headers
Row 7+: Data
Columns: [STT, OGSM Target, Department, Job Title, KPI Name, Type (I/II/III/IV), Unit, Data Source, ...]
```

**Example Usage**:
```typescript
// Upload Excel
const upload = await kpiLibraryUploadService.createUpload({
  fileName: "KPI_Templates_Q1_2024.xlsx",
  fileSize: 45000,
  mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  rawData: excelData,
  uploadedBy: userId
})
// Returns: { totalEntries: 50, validEntries: 48, invalidEntries: 2, parseErrors: [...] }

// Review and approve
await kpiLibraryUploadService.approveUpload(upload.id, adminId, "Data validated")
// This will create 48 KpiLibraryEntry records
```

### 3.3. Enhanced KPI Resource Service

**File**: `lib/kpi-resource-service-db.ts`

**Chức năng chính**:
- ✅ `createResource()` - Upload FILE, BI_DASHBOARD, hoặc LINK
- ✅ `getResources(filters)` - Filter by type, category, department
- ✅ `approveResource()` / `rejectResource()` - Approval workflow
- ✅ `getBIDashboards()` - Lấy danh sách BI dashboards
- ✅ `syncBIDashboard()` - Update sync timestamp
- ✅ `getFeaturedResources()` - Lấy featured resources
- ✅ `getPopularResources()` - Most downloaded

**Example Usage**:

**Upload PDF**:
```typescript
await kpiResourceServiceDb.createResource({
  title: "KPI Guidelines 2024",
  description: "Comprehensive guide for creating effective KPIs",
  category: "GUIDE",
  department: "HR",
  tags: ["guide", "2024", "best-practices"],
  resourceType: "FILE",
  fileName: "KPI_Guidelines_2024.pdf",
  fileType: "pdf",
  fileSize: 2500000,
  mimeType: "application/pdf",
  storageProvider: "M365",
  storageUrl: "https://...",
  uploadedBy: userId,
  isPublic: true,
  isFeatured: true
})
```

**Add Power BI Dashboard**:
```typescript
await kpiResourceServiceDb.createResource({
  title: "Sales Performance Dashboard",
  description: "Real-time sales metrics and KPI tracking",
  category: "DASHBOARD",
  department: "Sales",
  tags: ["sales", "real-time", "powerbi"],
  resourceType: "BI_DASHBOARD",
  dashboardType: "POWER_BI",
  dashboardUrl: "https://app.powerbi.com/...",
  embedUrl: "https://app.powerbi.com/embed/...",
  workspaceId: "workspace-guid",
  reportId: "report-guid",
  datasetId: "dataset-guid",
  requiresAuth: true,
  authConfig: {
    type: "AZURE_AD",
    tenantId: "tenant-guid",
    clientId: "client-guid",
    scopes: ["https://analysis.windows.net/powerbi/api/.default"]
  },
  uploadedBy: userId,
  isPublic: true,
  isFeatured: true
})
```

**Add External Link**:
```typescript
await kpiResourceServiceDb.createResource({
  title: "OKR Framework Guide",
  description: "External resource on OKR implementation",
  category: "GUIDE",
  resourceType: "LINK",
  externalUrl: "https://www.atlassian.com/okr",
  tags: ["okr", "external", "guide"],
  uploadedBy: userId
})
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   UNIFIED KPI LIBRARY                            │
│                   /admin/kpi-library                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────┴────────────┐
                    │                        │
        ┌───────────▼────────┐   ┌──────────▼──────────┐
        │   KPI TEMPLATES    │   │   KPI RESOURCES     │
        │                    │   │                      │
        ├────────────────────┤   ├──────────────────────┤
        │ 📝 Manual Create   │   │ 📄 Files (PDF, Word) │
        │ 📤 Excel Upload    │   │ 📊 BI Dashboards     │
        │ 📋 Clone Existing  │   │ 🔗 External Links    │
        │                    │   │ 🖼️ Images, Videos    │
        ├────────────────────┤   ├──────────────────────┤
        │ ✅ Approval Flow   │   │ ✅ Approval Flow     │
        │ 📊 Usage Stats     │   │ 📈 View/Download     │
        │ 🏷️ Tags & Filter   │   │ ⭐ Featured Items    │
        └────────────────────┘   └──────────────────────┘
```

---

## User Workflows

### Workflow 1: Create Manual KPI Template (ADMIN)

```
1. Go to KPI Library → Templates tab
2. Click "Create Template"
3. Fill in form:
   - Name, Description
   - Department, Job Title
   - KPI Type, Unit, Formula
   - Target Value, Weight
   - Tags, OGSM Alignment
4. Click "Save as Draft" or "Submit for Review"
5. If submitted → Waits for approval
6. If approved → Available for all users
```

### Workflow 2: Upload Excel Templates (ADMIN)

```
1. Go to KPI Library → Templates tab
2. Click "Upload Excel"
3. Select Excel file (.xlsx, .xls)
4. System validates data:
   - Shows preview
   - Highlights errors
   - Shows valid/invalid count
5. Click "Upload"
6. Review Queue:
   - Admin reviews upload
   - Can see all entries
   - Approve or Reject
7. If approved → All entries added to KPI Library
```

### Workflow 3: Upload Resource Document (ADMIN)

```
1. Go to KPI Library → Resources tab
2. Click "Upload Resource"
3. Select resource type:
   a. FILE:
      - Upload PDF, Word, Excel, Image, etc.
      - Add title, description, tags
   b. BI DASHBOARD:
      - Enter Power BI/Fabric URL
      - Configure embed URL
      - Set authentication
   c. EXTERNAL LINK:
      - Enter URL
      - Add description
4. Set metadata:
   - Category (TEMPLATE, GUIDE, REPORT, etc.)
   - Department
   - Tags
   - Featured status
5. Submit → Waits for approval
6. If approved → Available for users
```

### Workflow 4: Use Template (ALL USERS)

```
1. Go to Create KPI
2. Click "Browse KPI Library"
3. Search/filter templates:
   - By department
   - By category
   - By tags
4. Select template
5. KPI form auto-fills
6. Customize if needed
7. Submit KPI
8. System tracks template usage
```

### Workflow 5: Access BI Dashboard (ALL USERS)

```
1. Go to KPI Library → Resources tab
2. Filter by "Dashboards"
3. Select dashboard
4. Options:
   a. View embedded (iframe)
   b. Open in new tab
   c. Download report
5. System tracks view count
```

---

## Next Steps

### Phase 4: API Endpoints (PENDING)

Cần tạo các API routes:
- `POST /api/kpi-templates` - Create template
- `GET /api/kpi-templates` - List templates
- `POST /api/kpi-templates/[id]/submit` - Submit for review
- `POST /api/kpi-templates/[id]/approve` - Approve
- `POST /api/kpi-templates/[id]/reject` - Reject
- `POST /api/kpi-library/upload` - Upload Excel
- `POST /api/kpi-library/uploads/[id]/approve` - Approve upload
- `POST /api/kpi-resources` - Create resource (multi-format)
- `GET /api/kpi-resources` - List resources
- `GET /api/kpi-resources/dashboards` - List BI dashboards

### Phase 5: UI Refactoring (PENDING)

- ✅ Merge `/templates` into `/admin/kpi-library`
- ✅ Add "Create Template" dialog with form builder
- ✅ Enhance upload UI to support multiple file types
- ✅ Add BI Dashboard preview/embed component
- ✅ Add file type icons and previews
- ✅ Update sidebar menu

### Phase 6: Data Migration (PENDING)

- ✅ Migrate existing templates from `kpiTemplates` in `kpi-utils.ts` to database
- ✅ Run Prisma migration to update database schema
- ✅ Seed data if needed

---

## Benefits Summary

### For Administrators
✅ **Single place** to manage all KPI resources
✅ **Approval workflow** đảm bảo chất lượng
✅ **Track usage** để biết template nào hữu ích
✅ **Flexible upload** - Manual, Excel, hoặc bulk import
✅ **BI Integration** - Embed Power BI, Fabric dashboards

### For Users
✅ **Easy access** to approved templates và resources
✅ **Rich content** - Documents, dashboards, guides
✅ **Search & filter** dễ dàng tìm kiếm
✅ **Featured content** highlight tài liệu quan trọng
✅ **One-click apply** template vào KPI mới

### Technical
✅ **Scalable** architecture với database
✅ **Type-safe** với TypeScript
✅ **Audit trail** cho mọi thay đổi
✅ **Extensible** - Dễ thêm loại resource mới
✅ **Modern** stack - Prisma, Next.js, React

---

## Support Matrix

### File Types Supported

| Category       | Extensions                                    |
|---------------|-----------------------------------------------|
| Documents     | PDF, DOC, DOCX, TXT, RTF                     |
| Spreadsheets  | XLSX, XLS, CSV                               |
| Presentations | PPT, PPTX                                    |
| Images        | JPG, JPEG, PNG, GIF, BMP, SVG, WEBP          |
| Archives      | ZIP, RAR, 7Z                                 |
| Data          | JSON, XML, SQL                               |

### BI Platforms Supported

| Platform      | Features                                      |
|--------------|-----------------------------------------------|
| Power BI     | Embed, Authentication, Workspace/Report IDs   |
| Fabric       | Full support (same as Power BI)              |
| Tableau      | URL embedding                                 |
| Looker       | URL embedding                                 |
| Custom       | Any iframe-embeddable dashboard              |

---

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL="mysql://..."

# Microsoft 365 (for file storage)
MICROSOFT_TENANT_ID="..."
MICROSOFT_CLIENT_ID="..."
MICROSOFT_CLIENT_SECRET="..."

# Power BI / Fabric
POWERBI_TENANT_ID="..."
POWERBI_CLIENT_ID="..."
POWERBI_CLIENT_SECRET="..."

# File Upload Limits
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_TYPES="pdf,docx,xlsx,jpg,png,..."
```

---

## Conclusion

Hệ thống **Unified KPI Library** mới:
- ✅ **Consolidates** 2 hệ thống cũ thành 1
- ✅ **Extends** để hỗ trợ multi-format files
- ✅ **Integrates** với BI platforms
- ✅ **Improves** user experience với approval workflow
- ✅ **Enables** better governance và quality control

Ready for Phase 4 (API Endpoints) implementation!
