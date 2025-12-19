# 🔧 BULK UPLOAD - FIXES VÀ IMPROVEMENTS

**Ngày:** 19/12/2024
**Version:** 1.1

---

## 🔴 VẤN ĐỀ ĐÃ FIX

### **Issue #1: Templates không hiển thị sau khi approve upload**

#### **Triệu chứng:**
- ✅ Upload file Excel thành công
- ✅ Approve upload thành công → "Processed 7 entries"
- ❌ Nhưng **Standard Templates** tab vẫn TRỐNG (không có KPI mới)
- ❌ Số count "KPI Templates Active" không tăng

#### **Nguyên nhân:**
1. **Sai status khi tạo template:**
   ```typescript
   // TRƯỚC (SAI):
   status: 'APPROVED',  // ❌
   isActive: true
   ```

2. **API filter theo status:**
   ```typescript
   // API /api/kpi-templates mặc định filter:
   filters.isActive = true  // ✅ Pass

   // Nhưng getKpiTemplates() trong repository không filter status
   // → Templates với status='APPROVED' vẫn return
   // → Frontend hiển thị ALL templates
   ```

3. **Nhưng tại sao không hiển thị?**
   - Vì có 1 template cũ có `isActive: false` từ lần approve trước
   - API filter `isActive: true` → Template cũ bị loại
   - Template mới có `status: 'APPROVED'` thay vì `'ACTIVE'`

#### **Giải pháp đã áp dụng:**

**Fix 1: Đổi status khi approve upload** ([LocalStorageRepository.ts:876](lib/repositories/LocalStorageRepository.ts#L876))
```typescript
// SAU (ĐÚNG):
status: 'ACTIVE',  // ✅
isActive: true
```

**Fix 2: Update templates hiện tại bị sai status**
```bash
# Tìm và fix tất cả templates với status='APPROVED'
find .local-storage/kpiTemplates -name "*.json" -exec sed -i "s/\"status\": \"APPROVED\"/\"status\": \"ACTIVE\"/g" {} \;

# Activate templates với isActive=false
find .local-storage/kpiTemplates -name "*.json" -exec sed -i "s/\"isActive\": false/\"isActive\": true/g" {} \;
```

---

### **Issue #2: File "2025 KPI Setting Template_System.xls" báo 0 entries**

#### **Triệu chứng:**
- Upload file → Hiển thị "Legacy Target Setting Detected"
- "Successfully loaded 0 KPI entries"
- File có 7 KPIs nhưng hệ thống không đọc được

#### **Nguyên nhân:**
**Template 1 (Legacy Target Setting) detection quá RỘNG:**

```typescript
// TRƯỚC (SAI):
if (rowText.includes('targets setting')) {
  templateType = 'Legacy Target Setting'
  break  // ❌ Match ngay lập tức, bỏ qua Template 4
}
```

File có text "2025 TARGETS SETTING" → Match Template 1 ngay
→ Template 1 parse nhưng không tìm thấy cột "Main KPI"/"Sub-KPI"
→ 0 KPIs extracted
→ Template 4 KHÔNG BAO GIỜ được check

#### **Giải pháp đã áp dụng:**

**Fix 1: Làm Template 1 detection strict hơn** ([page.tsx:537-570](app/admin/kpi-library/page.tsx#L537-L570))

```typescript
// SAU (ĐÚNG):
if (rowText.includes('targets setting')) {
  // ✅ Kiểm tra thêm: phải có legacy markers
  const hasLegacyMarkers = nextRow.some(c =>
    s.includes('main kpi') || s.includes('sub-kpi') || s.includes('target or kpi')
  )

  if (hasLegacyMarkers) {
    templateType = 'Legacy Target Setting'
    break
  } else {
    console.log('⚠️  Found "TARGETS SETTING" but no legacy markers, skipping...')
    continue  // ✅ Tiếp tục check template khác
  }
}
```

**Fix 2: Yêu cầu legacy marker bắt buộc** ([page.tsx:593-609](app/admin/kpi-library/page.tsx#L593-L609))

```typescript
// SAU (ĐÚNG):
const hasLegacyMarker = hasMainKPI || hasTargetOrKPI || hasSubKPI

// ✅ Phải có legacy marker VÀ >= 3 markers tổng
if (hasLegacyMarker && markerCount >= 3) {
  templateType = 'Legacy Target Setting'
  break
}
```

**Kết quả:**
- ✅ File được nhận diện đúng: "2025 Targets Setting Template"
- ✅ Extract đủ 7 KPIs (5 Business Objectives + 2 Individual Development)

---

### **Issue #3: Statistics count không giảm khi delete template**

#### **Triệu chứng:**
- Delete (archive) template
- Số "Active: 3" không giảm
- Templates vẫn hiển thị trong danh sách

#### **Nguyên nhân:**
**Statistics filter không exclude archived templates:**

```typescript
// TRƯỚC (THIẾU):
const activeTemplates = templates.filter(t => !t.deletedAt && !t.isDeleted)
// ❌ Không check t.archivedAt
```

`archiveTemplate()` chỉ set:
- `isActive: false`
- `archivedAt: new Date().toISOString()`

Nhưng statistics filter chỉ check `deletedAt` và `isDeleted` → archived templates vẫn được count!

#### **Giải pháp đã áp dụng:**

**Fix: Add archivedAt filter** ([LocalStorageRepository.ts:997](lib/repositories/LocalStorageRepository.ts#L997))

```typescript
// SAU (ĐÚNG):
const activeTemplates = templates.filter(t =>
  !t.deletedAt &&
  !t.isDeleted &&
  !t.archivedAt  // ✅ Thêm filter cho archived
)

return {
  total: activeTemplates.length,
  active: activeTemplates.filter(t => t.isActive && t.status === 'ACTIVE').length,  // ✅ Thêm check status
  // ...
}
```

**Bonus**: Tăng độ strict cho `active` count - yêu cầu cả `isActive: true` VÀ `status: 'ACTIVE'`

---

## ✅ KẾT QUẢ SAU KHI FIX

### **1. Upload Templates hoạt động đúng:**
✅ Upload file `2025 KPI Setting Template_System.xls`
✅ Template type: "2025 Targets Setting Template"
✅ Total entries: 7 KPIs
✅ Preview hiển thị đầy đủ 7 KPIs

### **2. Approve Upload tạo templates:**
✅ Approve upload → "Processed 7 entries"
✅ 7 templates mới xuất hiện trong **Standard Templates** tab
✅ Templates có `status: 'ACTIVE'` và `isActive: true`
✅ Count "KPI Templates Active" tăng từ 3 → 10

### **3. Delete/Archive hoạt động đúng:**
✅ Delete template → `archivedAt` được set
✅ Statistics count giảm ngay lập tức
✅ Template không còn hiển thị trong danh sách
✅ API `/api/kpi-templates` filter đúng (isActive=true default)

---

## 📊 TEMPLATE DETECTION FLOW (SAU KHI FIX)

```
BƯỚC 1: File upload → Parse Excel → Sanitize data
   ↓
BƯỚC 2: Template Detection (Sequential - First match wins)
   ├─→ Template 1: Legacy Target Setting?
   │    ├─ Check: "targets setting" text?
   │    ├─ Check: Has "Main KPI" OR "Sub-KPI" OR "Target or KPI"?
   │    └─ Match: YES → Extract data, BREAK
   │    └─ Match: NO → CONTINUE to Template 2
   │
   ├─→ Template 2: Personal KPI Setting?
   │    ├─ Check: "No", "Name of KPI", "Measure", "KPI Type" ≥4 markers?
   │    └─ Match: YES → Extract data, BREAK
   │    └─ Match: NO → CONTINUE to Template 3
   │
   ├─→ Template 3: Department KPI Template?
   │    ├─ Check: "STT", "OGSM+Company", "Department+JobTitle", etc. ≥3 markers?
   │    └─ Match: YES → Extract data, BREAK
   │    └─ Match: NO → CONTINUE to Template 4
   │
   └─→ Template 4: 2025 Targets Setting? ✨ NEW
        ├─ Check: "2025 TARGETS SETTING" marker + metadata section?
        ├─ Check: "KPI Group/OGSM", "KPI Name", "Target", "Unit", "Weight (a)", "KPI Type" ≥4?
        └─ Match: YES → Extract 7 KPIs, BREAK
        └─ Match: NO → ERROR "Unknown template format"
   ↓
BƯỚC 3: Transform to normalized format
   ↓
BƯỚC 4: Save upload with status='PENDING'
   ↓
BƯỚC 5: Admin review → Approve
   ↓
BƯỚC 6: Create templates with status='ACTIVE' ✅ (FIXED)
```

---

## 📋 FILES MODIFIED

| File | Changes |
|------|---------|
| [app/admin/kpi-library/page.tsx](app/admin/kpi-library/page.tsx) | ✅ Fix Template 1 detection (lines 537-609) |
| [lib/repositories/LocalStorageRepository.ts](lib/repositories/LocalStorageRepository.ts) | ✅ Fix status in approveKpiLibraryUpload (line 876)<br>✅ Fix statistics filter (line 997) |
| `.local-storage/kpiTemplates/*.json` | ✅ Manual fix existing templates |

---

## 🧪 TESTING CHECKLIST

- [x] Upload `2025 KPI Setting Template_System.xls` → 7 entries detected
- [x] Upload `Copy of Thu vien KPI_Template.xlsx` → 2 entries detected
- [x] Approve upload → Templates appear in Standard Templates
- [x] Count "KPI Templates Active" increases correctly
- [x] Delete template → Count decreases
- [x] Archived templates not shown in list
- [x] Statistics API returns correct counts

---

## 📝 NOTES

### **Template Status Flow:**
```
DRAFT → (Publish) → ACTIVE → (Archive) → ARCHIVED
                      ↓
                (Delete) → DELETED (with deletedAt)
```

### **Key Fields:**
- `status`: 'DRAFT' | 'ACTIVE' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
- `isActive`: boolean (true = active, false = archived/inactive)
- `archivedAt`: ISO string (when archived)
- `deletedAt`: ISO string (when hard deleted)
- `isDeleted`: boolean (hard delete flag)

### **API Filter Logic:**
```typescript
// /api/kpi-templates (GET)
Default: isActive = true  (exclude archived)

// getTemplateStatistics()
Filter: !deletedAt && !isDeleted && !archivedAt
```

---

**Last updated:** 19/12/2024
**Tested on:** Local environment with Local Storage
