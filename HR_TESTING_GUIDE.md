# 📋 HƯỚNG DẪN TEST CHO HR - KPIs MANAGEMENT APP

## 🎯 MỤC TIÊU TEST

App đã hoàn thiện 100% PHASE 1 & 2, bao gồm:
- ✅ Upload tài liệu KPI template
- ✅ AI tự động gợi ý KPI
- ✅ Quy trình phê duyệt 3 cấp: Line Manager → Head of Dept → Admin
- ✅ Quản lý thư viện KPI

---

## 🔐 BƯỚC 1: ĐĂNG NHẬP VÀ AUTO-PROVISIONING

### Test Case 1.1: Đăng nhập lần đầu (User tự động được tạo)

**Các loại tài khoản để test:**

```bash
# ADMIN
Email: admin@intersnack.com.vn
Password: admin123

# MANAGER / HEAD OF DEPT
Email: manager.production@intersnack.com.vn
Password: manager123

# LINE MANAGER (Trưởng phòng/Giám sát)
Email: lm.production@intersnack.com.vn
Password: lm123

# STAFF (Nhân viên)
Email: ngan.ngo@intersnack.com.vn
Password: staff123
```

**Bước test:**
1. Mở trình duyệt → `http://localhost:3000`
2. Nhập email & password
3. Click "Login"

**Kết quả mong đợi:**
- ✅ Lần đầu đăng nhập → Tự động tạo user trong database
- ✅ Role được gán tự động dựa trên email:
  - `admin@...` → ADMIN
  - `manager.*@...` → MANAGER
  - `lm.*@...` → LINE_MANAGER
  - Email thông thường → STAFF
- ✅ Chuyển đến trang Dashboard

---

## 📚 BƯỚC 2: ADMIN - UPLOAD TÀI LIỆU KPI TEMPLATE

### Test Case 2.1: Upload file Excel chứa KPI templates

**Yêu cầu:**
- Đăng nhập với tài khoản ADMIN
- Chuẩn bị file Excel có format:
  - Dòng 1-6: Header
  - Dòng 7+: Dữ liệu KPI (STT, OGSM Target, Department, Job Title, KPI Name, Type, Unit, etc.)

**Bước test:**
1. Login as Admin
2. Vào menu: **Admin → KPI Library**
3. Tab "Bulk Upload"
4. Click "Choose File" → Chọn file Excel
5. Click "Upload & Parse"
6. Xem preview data
7. Click "Confirm Upload"

**Kết quả mong đợi:**
- ✅ File được parse thành công
- ✅ Hiển thị số lượng: Total entries, Valid entries, Invalid entries
- ✅ Nếu có lỗi → Hiển thị danh sách lỗi (row number + error message)
- ✅ Status = "PENDING" (chờ admin review)
- ✅ Sau khi approve → Templates xuất hiện trong Library

**File Excel mẫu:**

| STT | OGSM Target | Department | Job Title | KPI Name | Type | Unit | Data Source | Yearly Target | Quarterly Target |
|-----|-------------|------------|-----------|----------|------|------|-------------|---------------|------------------|
| 1 | Revenue Growth | Sales | Sales Manager | Monthly Revenue | I | VND | CRM System | 12B | 3B |
| 2 | Cost Reduction | Production | Production Manager | Defect Rate | II | % | QA System | <2% | <2.5% |

---

### Test Case 2.2: Upload PDF/Word documents

**Bước test:**
1. Vào **Admin → KPI Library**
2. Tab "Resources"
3. Click "Upload Resource"
4. Chọn file PDF hoặc Word (VD: "KPI_Guidelines_2025.pdf")
5. Điền thông tin:
   - Title: "KPI Guidelines 2025"
   - Category: GUIDE
   - Department: All
6. Click "Upload"

**Kết quả mong đợi:**
- ✅ File được upload thành công
- ✅ Document parser tự động extract text
- ✅ AI indexing được trigger (check `aiIndexed = true`)
- ✅ File có thể download lại

---

### Test Case 2.3: Trigger Auto-Indexing (Đưa documents vào AI Knowledge Base)

**Bước test:**
1. Login as Admin
2. Vào **Admin → KPI Library**
3. Tab "AI Indexing"
4. Click "Index All Documents"
5. Chờ process hoàn thành (5-30s tùy số lượng)

**Kết quả mong đợi:**
- ✅ Hiển thị progress bar hoặc loading indicator
- ✅ Thông báo: "Indexed 45 documents, 2 failed"
- ✅ Nếu có lỗi → Hiển thị chi tiết lỗi
- ✅ Check database: `aiIndexed = true`, `vectorId` có giá trị

**API Test (Optional):**
```bash
# Trigger indexing
curl -X POST http://localhost:3000/api/admin/index-documents \
  -H "Authorization: Bearer {admin-token}"

# Check status
curl -X GET http://localhost:3000/api/admin/index-documents \
  -H "Authorization: Bearer {admin-token}"
```

---

## 🎯 BƯỚC 3: TẠO CHU KỲ ĐÁNH GIÁ (CYCLE)

### Test Case 3.1: Admin tạo cycle mới cho Q1 2025

**Bước test:**
1. Login as Admin
2. Vào **Admin → Cycles** (hoặc menu Cycles)
3. Click "Create New Cycle"
4. Điền form:
   ```
   Name: Q1 2025 Performance Review
   Type: QUARTERLY
   Period Start: 2025-01-01
   Period End: 2025-03-31

   Setting Phase:
     - Start: 2024-12-15
     - End: 2025-01-15

   Tracking Phase:
     - Start: 2025-01-16
     - End: 2025-03-15

   Evaluation Phase:
     - Start: 2025-03-16
     - End: 2025-03-31
   ```
5. Click "Create Cycle"
6. Status = DRAFT → Click "Activate Cycle"

**Kết quả mong đợi:**
- ✅ Cycle được tạo với status = DRAFT
- ✅ Sau khi activate → Status = ACTIVE
- ✅ Staff có thể chọn cycle này khi tạo KPI
- ✅ Timeline được enforce (không thể submit KPI ngoài Setting phase)

---

## 📝 BƯỚC 4: STAFF - TẠO KPI VỚI AI SUGGESTIONS

### Test Case 4.1: Tạo KPI thủ công

**Bước test:**
1. Login as **STAFF** (ngan.ngo@intersnack.com.vn)
2. Vào **KPIs → Create New**
3. Chọn Cycle: "Q1 2025 Performance Review"
4. Click "Add KPI" (tạo 5 KPIs)

**KPI #1: Revenue Target**
```
Title: Monthly Revenue Target
Description: Achieve monthly revenue goal
Type: QUANT_HIGHER_BETTER
Unit: VND
Target: 1,000,000,000
Weight: 30%
Category: Business Objective
Priority: HIGH
Data Source: CRM System
```

**KPI #2-5:** Tương tự, đảm bảo **Total Weight = 100%**

5. Click "Save as Draft"

**Kết quả mong đợi:**
- ✅ Validation weight: Nếu total ≠ 100% → Hiển thị lỗi
- ✅ Validation individual weight: 5% ≤ weight ≤ 40%
- ✅ KPIs được lưu với status = DRAFT

---

### Test Case 4.2: Sử dụng AI Suggestions (RAG-powered)

**Bước test:**
1. Login as STAFF
2. Vào **KPIs → Create New**
3. Click **"Get AI Suggestions"** button
4. Popup hiển thị → Chọn:
   - Cycle: Q1 2025
   - Department: Production (hoặc department của user)
   - Include Historical Data: ✅ Yes
5. Click "Generate Suggestions"
6. Chờ 3-5 giây

**Kết quả mong đợi:**
- ✅ AI trả về 6-8 KPI suggestions
- ✅ Mỗi suggestion có:
  - Title, Description
  - Type, Unit, Target
  - Weight (tổng = 100%)
  - Category (Business / Development / Core Values)
  - Rationale (Lý do AI gợi ý KPI này)
  - SMART Score (80-100)
- ✅ **RAG Context:** Suggestions dựa trên:
  - Historical performance của user
  - KPI templates đã upload (từ Excel/PDF)
  - Department context
  - Peer benchmarks

**Kiểm tra RAG hoạt động:**
- Nếu đã upload "KPI Guidelines 2025.pdf" → AI suggestions phải reference nội dung trong PDF
- Console log sẽ hiển thị: `[RAG] Retrieving context for: "KPIs for ..."`

7. Click "Apply Suggestions" → KPIs tự động điền vào form
8. Review và edit nếu cần
9. Click "Save as Draft"

---

### Test Case 4.3: Submit KPIs for Approval

**Bước test:**
1. Sau khi tạo KPIs (draft)
2. Click "Submit for Approval"
3. Confirm dialog → "Yes, Submit"

**Kết quả mong đợi:**
- ✅ Status thay đổi: DRAFT → **WAITING_LINE_MGR**
- ✅ Notification gửi đến Line Manager (N+1)
- ✅ Staff không thể edit KPIs sau khi submit (unless rejected)

---

## ✅ BƯỚC 5: APPROVAL WORKFLOW (3 LEVELS)

### Test Case 5.1: Level 1 - Line Manager Approval

**Bước test:**
1. Login as **LINE MANAGER** (lm.production@intersnack.com.vn)
2. Vào **Approvals** (menu)
3. Xem danh sách KPIs chờ duyệt
4. Click vào KPI → Xem chi tiết:
   - Staff name
   - KPI details
   - Target, Weight, Category
5. **Option A: Approve**
   - Click "Approve"
   - Nhập comment (optional): "Goals are well-aligned with department objectives"
   - Click "Confirm Approve"
6. **Option B: Reject**
   - Click "Reject"
   - Nhập comment (REQUIRED): "Please reduce revenue target to realistic level"
   - Click "Confirm Reject"

**Kết quả mong đợi (Approve):**
- ✅ Status: WAITING_LINE_MGR → **WAITING_HOD**
- ✅ Approval record: Level 1 = APPROVED
- ✅ Notification gửi đến **Head of Department** (Level 2)
- ✅ Audit log ghi nhận action

**Kết quả mong đợi (Reject):**
- ✅ Status: WAITING_LINE_MGR → **DRAFT**
- ✅ Approval record: Level 1 = REJECTED
- ✅ Rejection comment hiển thị cho Staff
- ✅ Staff có thể revise và resubmit

---

### Test Case 5.2: Level 2 - Head of Department Approval

**Bước test:**
1. Login as **MANAGER** (manager.production@intersnack.com.vn)
   - Hoặc user có role = HEAD_OF_DEPT
2. Vào **Approvals**
3. Xem KPIs đã được Line Manager approve (status = WAITING_HOD)
4. Review KPIs
5. Click "Approve" với comment: "Approved for Production Department"

**Kết quả mong đợi:**
- ✅ Status: WAITING_HOD → **WAITING_ADMIN**
- ✅ Approval record: Level 2 = APPROVED
- ✅ Notification gửi đến **Admin** (Level 3)

---

### Test Case 5.3: Level 3 - Admin Final Approval

**Bước test:**
1. Login as **ADMIN** (admin@intersnack.com.vn)
2. Vào **Approvals**
3. Xem KPIs đã qua 2 level (status = WAITING_ADMIN)
4. Final review:
   - Check tổng weight = 100%
   - Check alignment với company goals
   - Check data quality
5. Click "Approve" với comment: "Final approval granted. KPI activated."

**Kết quả mong đợi:**
- ✅ Status: WAITING_ADMIN → **ACTIVE**
- ✅ Approval record: Level 3 = APPROVED
- ✅ KPI officially activated for tracking
- ✅ Notification gửi đến Staff: "Your KPIs are approved and active!"
- ✅ Staff có thể bắt đầu track monthly actuals

---

### Test Case 5.4: Full Rejection Flow

**Bước test:**
1. Staff submit KPIs
2. Line Manager **REJECT** với comment: "Targets too ambitious"
3. Check status → Quay về DRAFT
4. Staff login → Xem rejection reason
5. Edit KPIs (reduce targets)
6. Resubmit
7. Line Manager approve → WAITING_HOD
8. HOD approve → WAITING_ADMIN
9. Admin approve → ACTIVE

**Kết quả mong đợi:**
- ✅ Rejection ở bất kỳ level nào → KPI quay về DRAFT
- ✅ Comment rejection hiển thị cho Staff
- ✅ Staff có thể edit và resubmit
- ✅ Approval process restart từ Level 1

---

## 🔧 BƯỚC 6: ADMIN PROXY ACTIONS

### Test Case 6.1: Admin approve thay cho Manager (Manager đi vắng)

**Bước test:**
1. Có KPI đang ở status = WAITING_HOD
2. Manager đi công tác, không thể approve
3. Admin login → Vào **Admin → Proxy Actions**
4. Tìm KPI cần approve
5. Click "Approve as Manager"
6. Điền:
   - Level: 2 (Head of Department)
   - Reason: "Manager on business trip"
   - Comment: "Approved on behalf of Production Manager"
7. Click "Execute Proxy Action"

**Kết quả mong đợi:**
- ✅ KPI status: WAITING_HOD → WAITING_ADMIN
- ✅ Approval record: Level 2 = APPROVED, approvedBy = Admin ID
- ✅ Proxy action logged:
  ```json
  {
    "actionType": "APPROVE_AS_MANAGER",
    "performedBy": "admin@intersnack.com.vn",
    "level": 2,
    "reason": "Manager on business trip",
    "timestamp": "2025-01-15T10:30:00Z"
  }
  ```
- ✅ Audit trail đầy đủ

---

### Test Case 6.2: Reassign Approver (Gán lại người duyệt)

**Bước test:**
1. KPI đang ở WAITING_LINE_MGR
2. Line Manager resign/chuyển phòng
3. Admin vào **Proxy Actions**
4. Click "Reassign Approver"
5. Chọn:
   - Current Approver: lm.production@intersnack.com.vn
   - New Approver: lm2.production@intersnack.com.vn
   - Reason: "Line Manager resigned"
6. Click "Reassign"

**Kết quả mong đợi:**
- ✅ Approval record updated: approverId = new manager
- ✅ Notification gửi đến new manager
- ✅ Proxy action logged

---

## 📊 BƯỚC 7: DASHBOARD & REPORTS

### Test Case 7.1: View Dashboard

**Bước test:**
1. Login as Staff/Manager/Admin
2. Vào **Dashboard**

**Kết quả mong đợi:**
- ✅ **Stats Cards:**
  - Total KPIs
  - Approved KPIs
  - Pending Approvals
  - Completion Rate
- ✅ **Recent KPIs List:**
  - Title, Status, Progress
  - Color-coded badges (ACTIVE=green, PENDING=yellow, DRAFT=gray)
- ✅ **Active Cycle Info:**
  - Cycle name, period
  - Current phase (Setting/Tracking/Evaluation)
- ✅ **Notifications:**
  - Approval requests
  - Status changes

---

## 🧪 EDGE CASES & ERROR HANDLING

### Test Case 8.1: Weight Validation Errors

**Test:**
1. Tạo 3 KPIs:
   - KPI 1: 40%
   - KPI 2: 40%
   - KPI 3: 30%
   - **Total = 110%** ❌
2. Click "Save"

**Kết quả mong đợi:**
- ✅ Error message: "Total weight must equal 100%. Current: 110%"
- ✅ Highlight fields with errors
- ✅ Cannot submit

---

### Test Case 8.2: Individual Weight Out of Range

**Test:**
1. Tạo KPI với weight = 50% (> 40%)
2. Click "Save"

**Kết quả mong đợi:**
- ✅ Error: "Weight must be between 5% and 40%"

---

### Test Case 8.3: Duplicate Approver

**Test:**
1. Staff submit KPI
2. Line Manager = Staff's manager
3. Head of Dept = Same person as Line Manager (edge case)
4. System auto-detects và skip level

**Kết quả mong đợi:**
- ✅ Không tạo duplicate approval
- ✅ Skip level nếu approver trùng nhau

---

### Test Case 8.4: Timeline Enforcement

**Test:**
1. Cycle có Setting Phase: 2024-12-15 → 2025-01-15
2. Hôm nay: 2025-01-20 (ngoài setting phase)
3. Staff cố gắng submit KPI

**Kết quả mong đợi:**
- ✅ Error: "Cannot submit KPI. Setting phase ended on 2025-01-15"
- ✅ Hoặc: Warning + Force submit cho Admin

---

## 📝 CHECKLIST TỔNG HỢP

### ✅ PHASE 1: System Setup
- [ ] Admin login thành công
- [ ] Upload Excel file (10+ templates)
- [ ] Upload PDF document
- [ ] Trigger auto-indexing
- [ ] Check `aiIndexed = true` trong database
- [ ] Create cycle với timeline

### ✅ PHASE 2: KPI Registration
- [ ] Staff auto-provisioning khi login lần đầu
- [ ] Create KPI thủ công (5 KPIs, total weight = 100%)
- [ ] Get AI Suggestions (RAG-powered)
- [ ] Apply suggestions và edit
- [ ] Submit for approval (DRAFT → WAITING_LINE_MGR)

### ✅ PHASE 2: Approval Workflow
- [ ] Line Manager approve → WAITING_HOD
- [ ] Head of Dept approve → WAITING_ADMIN
- [ ] Admin approve → ACTIVE
- [ ] Rejection flow (any level → DRAFT)
- [ ] Staff revise và resubmit

### ✅ Admin Features
- [ ] Proxy approve as manager
- [ ] Reassign approver
- [ ] View audit logs
- [ ] Manage cycles

### ✅ Edge Cases
- [ ] Weight validation errors
- [ ] Timeline enforcement
- [ ] Duplicate approver handling
- [ ] No approver available (fallback logic)

---

## 🐛 BÁO CÁO LỖI

Nếu gặp lỗi trong quá trình test, vui lòng báo cáo theo format:

```
**Test Case:** [Tên test case]
**Steps to Reproduce:**
1. Login as ...
2. Go to ...
3. Click ...

**Expected Result:** ...
**Actual Result:** ...
**Screenshot:** [Attach nếu có]
**Console Errors:** [Copy từ browser console]
```

Gửi báo cáo đến: devteam@intersnack.com.vn

---

## 📞 HỖ TRỢ

**Technical Support:**
- Email: devteam@intersnack.com.vn
- Phone: 0909.xxx.xxx (nếu có)

**Test Environment:**
- URL: http://localhost:3000 (local)
- Database: TiDB Cloud (Production-ready)

**Office Hours:**
- Monday - Friday: 8:00 - 17:00
- Saturday: 8:00 - 12:00

---

## 🎉 KẾT LUẬN

App đã sẵn sàng cho HR test với **100% PHASE 1 & 2** hoàn thiện:
- ✅ AI Knowledge Base with RAG
- ✅ 3-Level Approval Workflow
- ✅ Template Library Management
- ✅ Auto-Provisioning & RBAC

**Thời gian test dự kiến:** 2-3 ngày
**Target Go-Live:** Q1 2025

Chúc HR team test thành công! 🚀
