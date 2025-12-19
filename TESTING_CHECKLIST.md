# 📋 CHECKLIST TEST - KPIs MANAGEMENT APP

**Phiên bản:** 1.0  
**Ngày cập nhật:** 19/12/2024  
**Mục đích:** Hướng dẫn testing deployment cho tất cả người dùng

---

## 📌 MỤC LỤC

1. [Tổng quan hệ thống](#-tổng-quan-hệ-thống)
2. [Tài khoản test theo Role](#-tài-khoản-test-theo-role)
3. [Tính năng đã hoàn thiện (DONE ✅)](#-tính-năng-đã-hoàn-thiện-done-)
4. [Tính năng đang phát triển (PENDING ⏳)](#-tính-năng-đang-phát-triển-pending-)
5. [Hướng dẫn test theo Role](#-hướng-dẫn-test-theo-role)
6. [Checklist chi tiết](#-checklist-chi-tiết)
7. [Báo cáo lỗi](#-báo-cáo-lỗi)

---

## 🎯 TỔNG QUAN HỆ THỐNG

### Mô tả App
KPIs Management App là hệ thống quản lý KPI (Key Performance Indicators) cho doanh nghiệp, hỗ trợ:
- Tạo và quản lý KPI cá nhân
- Quy trình phê duyệt 3 cấp
- AI gợi ý KPI thông minh
- Thư viện KPI template
- Theo dõi và đánh giá hiệu suất

### URL Test
```
🌐 Production: [Sẽ cập nhật sau khi deploy]
🖥️ Local: http://localhost:3000
```

---

## 👥 TÀI KHOẢN TEST THEO ROLE

| Role | Email | Password | Mô tả chức năng |
|------|-------|----------|-----------------|
| **Admin** | `admin@intersnack.com.vn` | `123456` | Quản trị hệ thống, quản lý KPI Library, Bulk Upload, duyệt cuối cùng |
| **Manager (HOD)** | `manager@intersnack.com.vn` | `123456` | Trưởng bộ phận, duyệt cấp 2 |
| **Line Manager** | `linemanager@intersnack.com.vn` | `123456` | Quản lý trực tiếp, duyệt cấp 1 |
| **Staff** | `staff@intersnack.com.vn` | `123456` | Nhân viên tạo KPI |

> 💡 **Lưu ý:** Mật khẩu mặc định là `123456`. Hệ thống hỗ trợ auto-provisioning - user mới sẽ được tạo tự động khi đăng nhập lần đầu.

---

## ✅ TÍNH NĂNG ĐÃ HOÀN THIỆN (DONE)

### PHASE 1: Core System Setup

| # | Tính năng | Mô tả | Status |
|---|-----------|-------|--------|
| 1 | **Đăng nhập / Đăng ký** | Login với email/password, auto-provisioning user mới | ✅ DONE |
| 2 | **Dashboard** | Trang tổng quan với thống kê KPI, notifications, active cycle | ✅ DONE |
| 3 | **Navigation Sidebar** | Menu điều hướng với logo Intersnack, support tất cả roles | ✅ DONE |
| 4 | **Role-based Access Control** | Phân quyền theo 4 roles: STAFF, LINE_MANAGER, MANAGER, ADMIN | ✅ DONE |

### PHASE 2: KPI Management

| # | Tính năng | Mô tả | Status |
|---|-----------|-------|--------|
| 5 | **Tạo KPI mới** | Form tạo KPI với đầy đủ fields: Title, Description, Target, Weight, Unit, Category | ✅ DONE |
| 6 | **Danh sách My KPIs** | Xem, filter, search, export KPIs cá nhân | ✅ DONE |
| 7 | **Xem chi tiết KPI** | View full KPI details với approval history | ✅ DONE |
| 8 | **Chỉnh sửa KPI** | Edit KPI khi ở trạng thái DRAFT | ✅ DONE |
| 9 | **Xóa KPI** | Delete KPI với confirmation dialog | ✅ DONE |
| 10 | **Submit for Approval** | Gửi KPI để phê duyệt | ✅ DONE |
| 11 | **AI Suggestions** | AI gợi ý KPI dựa trên context (RAG-powered) | ✅ DONE |
| 12 | **Weight Validation** | Kiểm tra total weight = 100%, individual 5-40% | ✅ DONE |

### PHASE 2: Approval Workflow (3 cấp)

| # | Tính năng | Mô tả | Status |
|---|-----------|-------|--------|
| 13 | **Approval Page** | Danh sách KPIs chờ duyệt theo cấp | ✅ DONE |
| 14 | **Level 1: Line Manager Approval** | Duyệt/Reject với comment | ✅ DONE |
| 15 | **Level 2: Head of Dept Approval** | Duyệt/Reject với comment | ✅ DONE |
| 16 | **Level 3: Admin Final Approval** | Duyệt cuối cùng → ACTIVE | ✅ DONE |
| 17 | **Rejection Flow** | Reject → Quay về DRAFT → Staff sửa và resubmit | ✅ DONE |
| 18 | **Admin Proxy Actions** | Admin duyệt thay Manager khi cần | ✅ DONE |

### PHASE 2: Admin - KPI Library

| # | Tính năng | Mô tả | Status |
|---|-----------|-------|--------|
| 19 | **KPI Library Dashboard** | Thống kê templates, resources, uploads | ✅ DONE |
| 20 | **Manual Template Creation** | Tạo KPI template thủ công với form | ✅ DONE |
| 21 | **Template Management** | View, Edit, Delete, Publish/Unpublish templates | ✅ DONE |
| 22 | **Bulk Upload Excel** | Upload file Excel chứa nhiều KPI templates | ✅ DONE |
| 23 | **Excel Preview & Confirm** | Xem trước data từ Excel trước khi import | ✅ DONE |
| 24 | **Resource Upload** | Upload PDF, Word, Excel tài liệu tham khảo | ✅ DONE |
| 25 | **Resource Management** | View, Download, Delete resources | ✅ DONE |
| 26 | **Export Templates** | Export templates ra file CSV | ✅ DONE |

### PHASE 2: Other Features

| # | Tính năng | Mô tả | Status |
|---|-----------|-------|--------|
| 27 | **Notifications** | Thông báo approve/reject/new submissions | ✅ DONE |
| 28 | **View Notifications Page** | Xem tất cả notifications với filter read/unread | ✅ DONE |
| 29 | **Mark as Read** | Đánh dấu notification đã đọc | ✅ DONE |
| 30 | **Cycles Management** | Tạo/View/Activate/Close performance cycles | ✅ DONE |
| 31 | **Library Page (Staff)** | Staff xem templates và resources để tham khảo | ✅ DONE |

---

## ⏳ TÍNH NĂNG ĐANG PHÁT TRIỂN (PENDING)

### PHASE 3: Evaluation & Tracking

| # | Tính năng | Mô tả | Status | Ghi chú |
|---|-----------|-------|--------|---------|
| 32 | **Submit Actual Results** | Staff nhập kết quả thực tế theo tháng | ⏳ PENDING | UI có, logic backend chưa hoàn thiện |
| 33 | **Score Calculation** | Tính điểm dựa trên Target vs Actual | ⏳ PENDING | Formula có, cần test kỹ |
| 34 | **Manager Review Actuals** | Manager review và confirm kết quả | ⏳ PENDING | Chưa implement |
| 35 | **Monthly Tracking** | Theo dõi progress theo từng tháng | ⏳ PENDING | Backend chưa hoàn thiện |
| 36 | **Evidence Upload** | Upload file chứng minh kết quả | ⏳ PENDING | UI có, backend pending |

### PHASE 4: Reports & Analytics

| # | Tính năng | Mô tả | Status | Ghi chú |
|---|-----------|-------|--------|---------|
| 37 | **Reports Dashboard** | Trang báo cáo tổng hợp | ⏳ PENDING | UI skeleton có, data mock |
| 38 | **Department Reports** | Báo cáo theo phòng ban | ⏳ PENDING | Chưa implement |
| 39 | **Export Report Excel** | Xuất báo cáo ra Excel | ⏳ PENDING | Mock function |
| 40 | **Performance Charts** | Biểu đồ performance | ⏳ PENDING | Chưa có data thực |

### PHASE 5: Admin System Settings

| # | Tính năng | Mô tả | Status | Ghi chú |
|---|-----------|-------|--------|---------|
| 41 | **User Management** | CRUD users | ⏳ PENDING | UI mock data |
| 42 | **Organization Units** | Quản lý cơ cấu tổ chức | ⏳ PENDING | UI mock data |
| 43 | **Permission Management** | Cấu hình quyền chi tiết | ⏳ PENDING | Coming soon |
| 44 | **System Settings** | Cài đặt hệ thống (SMTP, Company name) | ⏳ PENDING | UI có, không lưu |

---

## 🔍 HƯỚNG DẪN TEST THEO ROLE

---

### 👤 ROLE: STAFF (Nhân viên)

**Đăng nhập:** `staff@intersnack.com.vn` / `123456`

#### Luồng test chính:

```
1. Đăng nhập → Dashboard
2. Xem Dashboard (thống kê, notifications, active cycle)
3. Tạo KPI mới (My KPIs → Create New)
4. Apply AI Suggestions (nút "AI Suggest")
5. Save Draft
6. Submit for Approval
7. Theo dõi trạng thái phê duyệt
8. Xem Library để tham khảo templates
9. Xem Notifications
```

#### Các trang có thể truy cập:
- ✅ Dashboard
- ✅ My KPIs (Xem, Tạo, Sửa, Xóa, Submit)
- ✅ Library (Xem templates, resources)
- ✅ Notifications
- ⚠️ Evaluation (UI có nhưng tính năng chưa hoàn thiện)
- ⚠️ Reports (UI skeleton, data mock)

---

### 👔 ROLE: LINE MANAGER (Quản lý trực tiếp)

**Đăng nhập:** `linemanager@intersnack.com.vn` / `123456`

#### Luồng test chính:

```
1. Đăng nhập → Dashboard
2. Xem Approvals (danh sách KPI chờ duyệt)
3. Click vào KPI item để xem chi tiết
4. Approve hoặc Reject với comment
5. Kiểm tra status chuyển sang WAITING_HOD
6. Cũng có thể tạo KPI cá nhân như Staff
7. Xem Library, Notifications
```

#### Các trang có thể truy cập:
- ✅ Dashboard
- ✅ My KPIs (tạo KPI cá nhân)
- ✅ **Approvals** (duyệt cấp 1)
- ✅ Library
- ✅ Notifications
- ⚠️ Evaluation, Reports (pending)

---

### 👨‍💼 ROLE: MANAGER / HEAD OF DEPT (Trưởng bộ phận)

**Đăng nhập:** `manager@intersnack.com.vn` / `123456`

#### Luồng test chính:

```
1. Đăng nhập → Dashboard
2. Xem Approvals (KPIs đã qua Line Manager - status WAITING_HOD)
3. Approve/Reject với comment
4. Kiểm tra status chuyển sang WAITING_ADMIN
5. Có thể tạo KPI cá nhân
6. Xem tổng quan team performance
```

#### Các trang có thể truy cập:
- ✅ Dashboard
- ✅ My KPIs
- ✅ **Approvals** (duyệt cấp 2)
- ✅ Library
- ✅ Notifications
- ⚠️ Reports (có filter by department - pending)

---

### 🛡️ ROLE: ADMIN (Quản trị viên)

**Đăng nhập:** `admin@intersnack.com.vn` / `123456`

#### Luồng test chính:

```
📌 QUẢN LÝ KPI LIBRARY:
1. Đăng nhập → Dashboard
2. Vào Admin → KPI Library
3. Tab "Manual Templates":
   - Tạo template mới (Create Template button)
   - Điền form: KPI Name, Description, Category, etc.
   - Save → Template ở status DRAFT
   - Click "Publish" để chuyển sang ACTIVE
   - Edit, Delete template
   - Export to CSV

4. Tab "Bulk Upload":
   - Click "Choose File" → Chọn file Excel
   - Click "Upload & Parse" → Xem preview data
   - Kiểm tra validation errors (nếu có)
   - Click "Confirm Upload" để import

5. Tab "Reference Documents":
   - Upload PDF, Word, Excel
   - Điền Title, Category, Department
   - Download, Delete resource

📌 APPROVAL (DUYỆT CUỐI CÙNG):
6. Vào Approvals
7. Filter: WAITING_ADMIN
8. Approve/Reject → Status chuyển ACTIVE

📌 PROXY ACTIONS:
9. Trong Approvals page → Nếu Manager đi vắng
10. Admin có thể "Approve as Manager" (duyệt thay)

📌 CYCLES MANAGEMENT:
11. Vào Cycles
12. Tạo mới: Create New Cycle
13. Điền: Name, Type, Period dates
14. Save → DRAFT → Activate

📌 SYSTEM ADMIN (UI có, tính năng pending):
15. Vào Admin page
16. Tab Users, Org Units, Permissions, Settings
```

#### Các trang ADMIN được truy cập:
- ✅ Dashboard
- ✅ **Admin → KPI Library** (Templates, Bulk Upload, Resources)
- ✅ **Approvals** (duyệt cấp 3 + Proxy Actions)
- ✅ **Cycles** (quản lý chu kỳ đánh giá)
- ✅ Library (view public templates)
- ✅ Notifications
- ⚠️ Admin → Users/Org Units/Permissions/Settings (UI mock)
- ⚠️ Reports (pending full data)

---

## 📝 CHECKLIST CHI TIẾT

### CHECKLIST 1: AUTHENTICATION & NAVIGATION

| # | Test Case | Bước thực hiện | Kết quả mong đợi | Pass/Fail |
|---|-----------|----------------|------------------|-----------|
| 1.1 | Đăng nhập thành công | 1. Mở trang login<br>2. Nhập email/password<br>3. Click Login | Chuyển đến Dashboard | ☐ |
| 1.2 | Đăng nhập sai | 1. Nhập sai password<br>2. Click Login | Hiển thị error message | ☐ |
| 1.3 | Auto-provisioning | 1. Đăng nhập với email mới<br>2. Sử dụng pattern role | User được tạo với đúng role | ☐ |
| 1.4 | Sidebar Navigation | 1. Click các menu items<br>2. Kiểm tra active state | Chuyển đúng trang, highlight menu | ☐ |
| 1.5 | Role-based Menu | 1. Login với từng role<br>2. Check menu items | Hiển thị menu phù hợp với role | ☐ |
| 1.6 | Logo branding | 1. Xem sidebar | Logo Intersnack hiển thị đúng | ☐ |

---

### CHECKLIST 2: STAFF - KPI CREATION

| # | Test Case | Bước thực hiện | Kết quả mong đợi | Pass/Fail |
|---|-----------|----------------|------------------|-----------|
| 2.1 | Tạo KPI mới | 1. My KPIs → Create New<br>2. Điền form<br>3. Save Draft | KPI được tạo với status DRAFT | ☐ |
| 2.2 | AI Suggestions | 1. Trong form → Click "AI Suggest"<br>2. Chọn options<br>3. Generate | Hiển thị 5-8 gợi ý KPI | ☐ |
| 2.3 | Apply Suggestion | 1. Chọn AI suggestion<br>2. Click Apply | Form được fill với data gợi ý | ☐ |
| 2.4 | Weight Validation | 1. Thử tạo KPI với total weight ≠ 100% | Error message hiển thị | ☐ |
| 2.5 | Weight Range | 1. Tạo KPI với weight < 5% hoặc > 40% | Error: "Weight must be 5-40%" | ☐ |
| 2.6 | Edit KPI | 1. Click Edit trên DRAFT KPI<br>2. Sửa thông tin<br>3. Save | KPI được cập nhật | ☐ |
| 2.7 | Delete KPI | 1. Click Delete<br>2. Confirm | KPI bị xóa khỏi list | ☐ |
| 2.8 | Submit for Approval | 1. Có KPI DRAFT<br>2. Click Submit | Status → WAITING_LINE_MGR | ☐ |
| 2.9 | Cannot edit after submit | 1. Submit KPI<br>2. Thử Edit | Không cho phép edit | ☐ |
| 2.10 | View KPI Details | 1. Click vào KPI card<br>2. Xem full details | Hiển thị đầy đủ thông tin | ☐ |
| 2.11 | Export KPIs | 1. Click Export button<br>2. Download file | CSV file với KPI data | ☐ |
| 2.12 | Filter KPIs | 1. Chọn filter (status/category)<br>2. Search text | List được filter đúng | ☐ |

---

### CHECKLIST 3: APPROVAL WORKFLOW

| # | Test Case | Bước thực hiện | Kết quả mong đợi | Pass/Fail |
|---|-----------|----------------|------------------|-----------|
| 3.1 | Line Manager sees pending | 1. Login Line Manager<br>2. Vào Approvals | Thấy KPIs có status WAITING_LINE_MGR | ☐ |
| 3.2 | LM Approve | 1. Click KPI<br>2. Click Approve<br>3. Nhập comment | Status → WAITING_HOD | ☐ |
| 3.3 | LM Reject | 1. Click Reject<br>2. Nhập comment (required) | Status → DRAFT, Staff thấy rejection reason | ☐ |
| 3.4 | HOD sees pending | 1. Login Manager<br>2. Vào Approvals | Thấy KPIs có status WAITING_HOD | ☐ |
| 3.5 | HOD Approve | 1. Approve KPI | Status → WAITING_ADMIN | ☐ |
| 3.6 | Admin Final Approve | 1. Login Admin<br>2. Approve WAITING_ADMIN KPI | Status → ACTIVE | ☐ |
| 3.7 | Rejection → Resubmit | 1. Staff bị reject<br>2. Sửa KPI<br>3. Submit lại | Restart workflow từ Level 1 | ☐ |
| 3.8 | Admin Proxy Approve | 1. Admin → Approvals<br>2. Approve thay cho Manager | Status chuyển đúng + Audit log | ☐ |
| 3.9 | Notification on Approve | 1. Approve KPI | Owner nhận notification | ☐ |
| 3.10 | Notification on Reject | 1. Reject KPI | Owner nhận notification với reason | ☐ |

---

### CHECKLIST 4: ADMIN - KPI LIBRARY

| # | Test Case | Bước thực hiện | Kết quả mong đợi | Pass/Fail |
|---|-----------|----------------|------------------|-----------|
| 4.1 | View Templates | 1. Admin → KPI Library<br>2. Tab "Manual Templates" | Hiển thị list templates | ☐ |
| 4.2 | Create Template | 1. Click "Create Template"<br>2. Fill form<br>3. Save | Template được tạo (DRAFT) | ☐ |
| 4.3 | Publish Template | 1. Click "Publish" trên DRAFT template | Status → ACTIVE, hiển thị trong Library | ☐ |
| 4.4 | Unpublish Template | 1. Click "Deactivate" trên ACTIVE | Status → DRAFT | ☐ |
| 4.5 | Edit Template | 1. Click Edit<br>2. Sửa<br>3. Save | Template updated | ☐ |
| 4.6 | Delete Template | 1. Click Delete<br>2. Confirm | Template removed | ☐ |
| 4.7 | Search Templates | 1. Nhập search text | Filter templates by name/dept | ☐ |
| 4.8 | Filter by Category | 1. Chọn category filter | Show templates by category | ☐ |
| 4.9 | Export Templates | 1. Click Export | Download CSV file | ☐ |

---

### CHECKLIST 5: ADMIN - BULK UPLOAD

| # | Test Case | Bước thực hiện | Kết quả mong đợi | Pass/Fail |
|---|-----------|----------------|------------------|-----------|
| 5.1 | Upload Excel | 1. Tab "Bulk Upload"<br>2. Choose file (.xlsx/.xls)<br>3. Upload & Parse | Preview data hiển thị | ☐ |
| 5.2 | Preview Validation | 1. Upload file có lỗi | Hiển thị errors (row + message) | ☐ |
| 5.3 | Confirm Upload | 1. Preview OK<br>2. Click Confirm | Templates được import | ☐ |
| 5.4 | Invalid file type | 1. Upload .pdf hoặc .doc | Error: "Invalid file type" | ☐ |
| 5.5 | View Upload History | 1. Scroll xuống Upload History | Thấy list previous uploads | ☐ |
| 5.6 | Template Detection | 1. Upload file từ format cũ | Parser tự detect template format | ☐ |

---

### CHECKLIST 6: ADMIN - RESOURCES

| # | Test Case | Bước thực hiện | Kết quả mong đợi | Pass/Fail |
|---|-----------|----------------|------------------|-----------|
| 6.1 | Upload Resource | 1. Tab "Reference Documents"<br>2. Choose file<br>3. Fill title, category<br>4. Upload | Resource added to list | ☐ |
| 6.2 | Download Resource | 1. Click Download button | File được download | ☐ |
| 6.3 | Delete Resource | 1. Click Delete<br>2. Confirm | Resource removed | ☐ |
| 6.4 | Filter Resources | 1. Search/filter by category | List filtered | ☐ |
| 6.5 | Staff views Library | 1. Login Staff<br>2. Library page | Thấy public resources | ☐ |

---

### CHECKLIST 7: CYCLES MANAGEMENT

| # | Test Case | Bước thực hiện | Kết quả mong đợi | Pass/Fail |
|---|-----------|----------------|------------------|-----------|
| 7.1 | View Cycles | 1. Admin → Cycles | List các cycles | ☐ |
| 7.2 | Create Cycle | 1. Create New<br>2. Fill form<br>3. Save | Cycle created (DRAFT) | ☐ |
| 7.3 | Activate Cycle | 1. Click Activate | Status → ACTIVE | ☐ |
| 7.4 | Close Cycle | 1. Click Close | Status → CLOSED | ☐ |
| 7.5 | Select Cycle khi Create KPI | 1. Staff → Create KPI<br>2. Select Cycle dropdown | Active cycles available | ☐ |

---

### CHECKLIST 8: NOTIFICATIONS

| # | Test Case | Bước thực hiện | Kết quả mong đợi | Pass/Fail |
|---|-----------|----------------|------------------|-----------|
| 8.1 | View Notifications | 1. Click bell icon hoặc vào Notifications page | List notifications | ☐ |
| 8.2 | Unread Badge | 1. Có notifications mới | Badge hiển thị count | ☐ |
| 8.3 | Mark as Read | 1. Click notification | Mark as read, style change | ☐ |
| 8.4 | Mark All Read | 1. Click "Mark All as Read" | Tất cả notifications read | ☐ |
| 8.5 | Action Navigation | 1. Click notification có action | Chuyển đến đúng page (Approvals, KPIs) | ☐ |

---

### CHECKLIST 9: UI/UX GENERAL

| # | Test Case | Bước thực hiện | Kết quả mong đợi | Pass/Fail |
|---|-----------|----------------|------------------|-----------|
| 9.1 | Responsive Layout | 1. Resize browser | Layout adapt đúng | ☐ |
| 9.2 | Loading States | 1. Chờ load data | Skeleton/spinner hiển thị | ☐ |
| 9.3 | Error Handling | 1. Network error simulation | Error message thân thiện | ☐ |
| 9.4 | Toast Notifications | 1. Perform actions | Toast confirm thành công/thất bại | ☐ |
| 9.5 | Form Validation | 1. Submit empty required fields | Validation errors highlight | ☐ |
| 9.6 | Breadcrumb/Back | 1. Navigate deep<br>2. Use back button | Navigate correctly | ☐ |

---

## 🐛 BÁO CÁO LỖI

Khi gặp lỗi trong quá trình test, vui lòng báo cáo theo format sau:

### Template báo cáo lỗi:

```markdown
## BÁO CÁO LỖI #[số]

**Người test:** [Tên]
**Ngày:** [dd/mm/yyyy]
**Device/Browser:** [Chrome/Firefox/Edge + version]

### Test Case:
[Tên test case từ checklist, ví dụ: 2.4 Weight Validation]

### Bước thực hiện:
1. Login với tài khoản ...
2. Vào trang ...
3. Click ...
4. Nhập ...

### Kết quả mong đợi:
[Mô tả kết quả đúng]

### Kết quả thực tế:
[Mô tả lỗi gặp phải]

### Screenshot:
[Đính kèm screenshot nếu có]

### Console Errors:
[Copy lỗi từ browser console nếu có - F12 → Console tab]

### Mức độ nghiêm trọng:
- [ ] Critical (không thể sử dụng tính năng chính)
- [ ] Major (ảnh hưởng workflow)
- [ ] Minor (UI issue, không ảnh hưởng chức năng)
```

### Gửi báo cáo về:
📧 Email: devteam@intersnack.com.vn  
💬 Teams/Slack: #kpi-app-testing

---

## 📌 GHI CHÚ QUAN TRỌNG

### ⚠️ Những điều cần lưu ý khi test:

1. **Database:** App đang chạy trên TiDB Cloud (production database) - dữ liệu test sẽ được lưu thực sự.

2. **Bulk Upload Excel:**
   - Hỗ trợ 2 format: "Legacy Target Setting" và "Personal KPI Setting"
   - Một số file Excel phức tạp có thể cần điều chỉnh định dạng

3. **AI Suggestions:**
   - Cần có API key (OpenAI/Anthropic) để AI hoạt động fully
   - Không có key → Sử dụng mock suggestions

4. **Evaluation Page:**
   - UI đã có nhưng tính năng submit actual results chưa hoàn thiện
   - Nên test nhưng đánh dấu là pending nếu có lỗi

5. **Reports Page:**
   - Đang hiển thị mock data
   - Export Excel chưa functional

---

## 📅 TIMELINE TEST

| Giai đoạn | Thời gian | Nội dung |
|-----------|-----------|----------|
| **Round 1** | Day 1-2 | Authentication, Navigation, Basic KPI CRUD |
| **Round 2** | Day 3-4 | Approval Workflow (3 cấp) |
| **Round 3** | Day 5 | Admin features (Library, Bulk Upload, Resources) |
| **Round 4** | Day 6 | Edge cases, các tính năng pending |
| **Final Review** | Day 7 | Tổng hợp bugs, confirm fixes |

---

## 🎉 KẾT LUẬN

**Tính năng DONE (sẵn sàng để test):**
- ✅ 31 tính năng core hoàn thiện
- ✅ Phase 1 (System Setup) - 100%
- ✅ Phase 2 (KPI Management + Approval + Library) - 100%

**Tính năng PENDING (đang phát triển):**
- ⏳ 13 tính năng còn lại
- ⏳ Phase 3 (Evaluation) - ~30%
- ⏳ Phase 4 (Reports) - ~20%
- ⏳ Phase 5 (System Admin) - UI done, backend pending

**Recommend Focus:**
1. **Ưu tiên test** các tính năng ✅ DONE
2. **Ghi nhận issues** cho tính năng ⏳ PENDING
3. **Báo cáo** theo template chuẩn

---

**Cảm ơn bạn đã tham gia testing! 🚀**
