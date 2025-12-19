# 🚀 QUICK TEST GUIDE - KPIs Management App

**Version:** 1.0 | **Date:** 19/12/2024

---

## 👥 TÀI KHOẢN ĐĂNG NHẬP

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@intersnack.com.vn` | `123456` |
| **Manager** | `manager@intersnack.com.vn` | `123456` |
| **Line Manager** | `linemanager@intersnack.com.vn` | `123456` |
| **Staff** | `staff@intersnack.com.vn` | `123456` |

---

## 📊 TỔNG QUAN TÍNH NĂNG

| Status | Số lượng | Note |
|--------|----------|------|
| ✅ **DONE** | 31 tính năng | Sẵn sàng test |
| ⏳ **PENDING** | 13 tính năng | UI có, backend chưa hoàn thiện |

---

## 🎯 HƯỚNG DẪN TEST NHANH

### 📌 TEST FLOW CHO TỪNG ROLE:

---

### 👤 STAFF
```
1. Login → Dashboard
2. My KPIs → Create New
3. Điền form (+AI Suggest nếu muốn)
4. Save Draft → Submit for Approval
5. Đợi approval notification
6. Xem Library để tham khảo
```

**Tính năng test:** Dashboard ✅ | My KPIs ✅ | AI Suggestions ✅ | Library ✅ | Notifications ✅

---

### 👔 LINE MANAGER
```
1. Login → Dashboard
2. Approvals → Xem KPIs chờ duyệt (WAITING_LINE_MGR)
3. Click KPI → Approve hoặc Reject
4. Có thể tạo KPI cá nhân (như Staff)
```

**Tính năng test:** Approvals ✅ | Approve/Reject ✅ | Comment ✅

---

### 👨‍💼 MANAGER (HEAD OF DEPT)
```
1. Login → Dashboard
2. Approvals → Xem KPIs đã qua Level 1 (WAITING_HOD)
3. Approve/Reject → Chuyển sang WAITING_ADMIN
```

**Tính năng test:** Level 2 Approval ✅

---

### 🛡️ ADMIN
```
📚 KPI LIBRARY:
1. Admin → KPI Library
2. Manual Templates: Create/Edit/Publish/Delete
3. Bulk Upload: Upload Excel → Preview → Confirm
4. Reference Documents: Upload PDF/Word

✅ FINAL APPROVAL:
1. Approvals → Filter WAITING_ADMIN
2. Final Approve → Status = ACTIVE

📅 CYCLES:
1. Cycles → Create New → Activate
```

**Tính năng test:** KPI Library ✅ | Bulk Upload ✅ | Resources ✅ | Cycles ✅ | Proxy Approve ✅

---

## ⚡ QUICK CHECKLIST

### ✅ MUST TEST (Quan trọng nhất)

- [ ] Login/Logout tất cả roles
- [ ] Staff tạo KPI + Submit
- [ ] 3-level Approval (LM → HOD → Admin)
- [ ] Rejection flow (Reject → Staff sửa → Resubmit)
- [ ] Admin Bulk Upload Excel
- [ ] Admin tạo Template thủ công

### ⚠️ SHOULD TEST (Nên test)

- [ ] AI Suggestions hoạt động
- [ ] Weight validation (total = 100%)
- [ ] Notifications hiển thị đúng
- [ ] Cycles create/activate
- [ ] Resource upload/download

### ⏳ PENDDING (Ghi nhận, không cần test kỹ)

- [ ] Evaluation page (UI có, backend chưa xong)
- [ ] Reports page (Mock data)
- [ ] Admin User Management (Mock)

---

## 🐛 BÁO CÁO LỖI NHANH

**Format:**
```
Test Case: [tên]
Steps: [1. 2. 3.]
Expected: [...]
Actual: [...]
Screenshot: [đính kèm]
```

**Gửi về:** devteam@intersnack.com.vn

---

## 📱 HOTLINE HỖ TRỢ

Nếu cần support kỹ thuật trong quá trình test:
- 📧 devteam@intersnack.com.vn
- 💬 Teams/Slack: #kpi-app-testing

---

**Xem chi tiết đầy đủ:** `TESTING_CHECKLIST.md`
