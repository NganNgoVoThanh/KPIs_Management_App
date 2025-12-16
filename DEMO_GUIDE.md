# Hướng dẫn Kiểm thử & Chạy Demo Ứng dụng Quản lý KPI

Tài liệu này hướng dẫn chi tiết các bước để kiểm thử quy trình nghiệp vụ hoàn chỉnh của ứng dụng, từ nạp kiến thức AI, tạo KPI, cho đến quy trình phê duyệt.

## 1. Chuẩn bị Môi trường

**Khởi chạy ứng dụng:**
Mở terminal và chạy lệnh:
```bash
npm run dev
```
Truy cập: [http://localhost:3000](http://localhost:3000)

**Tài khoản Demo (mật khẩu mặc định: `123456`):**
| Vai trò | Email (Tên đăng nhập) | Vai trò hệ thống | Ghi chú |
|---------|-----------------------|------------------|---------|
| **Admin** | `admin@intersnack.com.vn` | ADMIN | Quản trị, Upload tài liệu |
| **Nhân viên** | `staff@intersnack.com.vn` | STAFF | Tạo KPI |
| **Quản lý (N+1)** | `linemanager@intersnack.com.vn` | LINE_MANAGER | Duyệt cấp 1 |
| **Giám đốc (N+2)** | `manager@intersnack.com.vn` | MANAGER | Duyệt cấp 2 |

---

## 2. Kịch bản Demo Chi tiết

### Giai đoạn 1: Nạp Kiến thức cho AI (Admin thực hiện)
*Mục đích: Dạy cho AI hiểu về chính sách và mẫu KPI của công ty.*

1.  Đăng nhập bằng tài khoản **Admin** (`admin@intersnack.com.vn`).
2.  Truy cập menu **KPI Library**.
3.  Chọn tab **Reference Documents** (Tài liệu tham khảo).
4.  Nhấn **Upload Document**.
5.  Upload một file mẫu (ví dụ: `KPI_Policy_2025.pdf` hoặc `Safety_Guidelines.docx`).
    *   *Lưu ý: Bạn có thể tạo một file Word đơn giản chứa nội dung: "Mục tiêu An toàn 2025: Giảm tai nạn lao động xuống dưới 2 vụ/năm."*
6.  Sau khi upload thành công, hệ thống sẽ hiển thị thông báo "AI indexing started in background".
7.  **Kiểm tra:** AI sẽ tự động đọc file và lưu vào bộ nhớ. (Bước này chạy ngầm).

### Giai đoạn 2: Tạo KPI với Trợ lý AI (Nhân viên thực hiện)
*Mục đích: Trải nghiệm tính năng AI gợi ý KPI dựa trên kiến thức đã nạp.*

1.  Đăng nhập bằng tài khoản **Staff** (`staff@intersnack.com.vn`).
2.  Vào menu **My KPIs** -> Nhấn **Create New KPI**.
3.  Tại form tạo KPI, nhập tiêu đề ngắn gọn, ví dụ: "Safety".
4.  Nhấn nút **"AI Suggest"** (hoặc biểu tượng bóng đèn).
5.  **Kết quả mong đợi:**
    *   AI sẽ hiển thị gợi ý chi tiết: "Safety Incident Rate Reduction".
    *   Mô tả và Chỉ tiêu (Target) sẽ được lấy từ tài liệu bạn vừa upload ở Giai đoạn 1 (ví dụ: Target < 2).
    *   AI cũng sẽ tự động điền các trường: Đơn vị tính, Trọng số đề xuất.
6.  Chọn một gợi ý và nhấn **Apply**.
7.  Hoàn tất các trường còn thiếu và nhấn **Save Draft**.

### Giai đoạn 3: Quy trình Phê duyệt (Workflow)
*Mục đích: Kiểm thử luồng đi của dữ liệu từ Nhân viên -> Quản lý.*

**Bước 1: Gửi duyệt (Nhân viên)**
1.  Tại danh sách **My KPIs** (tài khoản Staff), tìm KPI vừa tạo (trạng thái `DRAFT`).
2.  Nhấn nút **Submit for Approval**.
3.  Trạng thái KPI chuyển sang `WAITING_APPROVAL`.

**Bước 2: Phê duyệt (Quản lý)**
1.  Đăng xuất Staff, đăng nhập bằng tài khoản **Line Manager** (`linemanager@intersnack.com.vn`).
2.  Vào menu **Approvals** (hoặc kiểm tra thông báo hình quả chuông).
3.  Bạn sẽ thấy yêu cầu phê duyệt KPI từ nhân viên "Ngo Vo Thanh Ngan".
4.  Nhấn vào yêu cầu để xem chi tiết.
5.  Nhấn **Approve** (Đồng ý) hoặc **Reject** (Từ chối) kèm nhận xét.
6.  Nếu chọn **Approve**, trạng thái KPI của nhân viên sẽ chuyển thành `ACTIVE`.

### Giai đoạn 4: Kiểm tra Kết quả
1.  Đăng nhập lại bằng tài khoản **Staff**.
2.  Kiểm tra KPI vừa được duyệt.
3.  Trạng thái bây giờ là `ACTIVE` (Màu xanh lá).
4.  Quy trình hoàn tất.

---

## 3. Các tính năng mở rộng khác để Test
*   **KPI Library (Thư viện):** Admin có thể tạo template chuẩn, Nhân viên có thể chọn "Add from Library" thay vì tạo mới.
*   **Tracking:** Nhân viên nhập kết quả thực tế (Actual) hàng tháng -> Hệ thống tự tính Score.
*   **Excel Import (Legacy Data):**
    *   **Quy trình:** Admin vào tab **Import Legacy Data** -> Upload file Excel.
    *   **Review & Publish:** Hệ thống hiển thị bản xem trước (Preview) để Admin kiểm tra tính đúng đắn của dữ liệu.
    *   **Import:** Sau khi kiểm tra, Admin nhấn **Import to Library** (hoặc Approve) để chính thức lưu vào hệ thống.
    *   **Kết quả:** Các dòng trong file Excel được chuyển đổi thành **KPI Template** và sẵn sàng cho nhân viên sử dụng.
    *   *Lưu ý:* Đây là bước kiểm tra kỹ thuật để đảm bảo file upload không bị lỗi trước khi public cho toàn công ty.

## 4. Troubleshooting (Gỡ lỗi)
*   Nếu không thấy dữ liệu: Chạy lệnh `npm run seed` để reset lại dữ liệu mẫu.
*   Nếu AI không trả lời: Kiểm tra key OpenAI/Anthropic trong file `.env.local`. (Hiện đang dùng chế độ giả lập nếu không có Key).
