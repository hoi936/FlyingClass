# Kế hoạch triển khai: Hệ thống thu học phí lớp học qua VNPAY

Mục tiêu: Xây dựng hệ thống cho phép học sinh thanh toán học phí trực tiếp cho giáo viên thông qua VNPAY. Hệ thống hỗ trợ đa dạng cấu hình lớp học (Miễn phí, Thanh toán trước, Học thử) và chu kỳ thu phí (Tháng/Một lần).

## Open Questions (Cần xác nhận trước khi làm)

> [!IMPORTANT]
> 1. **Dòng tiền VNPAY:** Hệ thống hiện tại có 1 cấu hình VNPAY chung (`_get_vnpay_config()`). Tiền học phí của học sinh sẽ chảy vào tài khoản VNPAY chung của hệ thống (Admin), sau đó Admin sẽ đối soát và thanh toán lại cho Giáo viên dựa trên trang "Doanh thu & KQ", đúng không?
> 2. **Chế độ thu học phí theo tháng (Recurring):** Đối với thu theo tháng, nếu hết tháng học sinh chưa đóng tiếp thì có tự động khóa truy cập vào bài học (tương tự như hết hạn học thử) không?

## Proposed Changes

### 1. Cập nhật Database (Doctypes)

#### [MODIFY] `FC Class` Doctype
Thêm các trường sau để cấu hình học phí:
- `tuition_type` (Select): `Free`, `Pay Before Joining`, `Trial Period`.
- `trial_days` (Int): Số ngày học thử (hiển thị khi chọn Trial Period).
- `is_recurring` (Check): Thu học phí theo tháng (Mặc định thu 1 lần).

#### [MODIFY] `FC Class Member` Doctype (Child Table)
Để quản lý trạng thái học phí của từng học sinh trong lớp:
- `paid_until` (Date): Hạn học. Nếu thu theo tháng, mỗi lần thanh toán sẽ cộng thêm 30 ngày.
- `is_manually_added` (Check): Đánh dấu học sinh được giáo viên thêm thủ công (Luôn được cấp quyền truy cập, bỏ qua chặn khóa học, nhưng vẫn hiển thị nút đóng tiền).

#### [NEW] `FC Tuition Order` Doctype
Theo dõi lịch sử giao dịch VNPAY của học sinh:
- `student` (Link -> User)
- `teacher` (Link -> User)
- `class_ref` (Link -> FC Class)
- `amount` (Currency)
- `status` (Select): `Pending`, `Paid`, `Failed`
- `payment_gateway` (Data): `VNPAY`
- `vnp_transaction_no` (Data)
- `payment_date` (Datetime)

---

### 2. Backend API (`api.py`)

#### [MODIFY] `get_course_outline`
Tích hợp logic kiểm tra quyền truy cập bài học dựa trên học phí:
- Bỏ qua khóa nếu học sinh là `is_manually_added = 1`.
- Nếu `tuition_type == Pay Before Joining` và chưa có hóa đơn `Paid`: Khóa tất cả bài học.
- Nếu `tuition_type == Trial Period`: Kiểm tra `join_date` + `trial_days`. Nếu quá hạn và chưa thanh toán: Khóa tất cả bài học.
- Trả về metadata cho Frontend biết học sinh đang ở trạng thái nào (Trial, Locked, Paid) để hiển thị UI thanh toán.

#### [NEW] `create_tuition_order` và `vnpay_tuition_return`
- API `create_tuition_order`: Sinh mã thanh toán VNPAY từ `price` của `FC Class`.
- API `vnpay_tuition_return`: Webhook xử lý callback từ VNPAY. Đánh dấu `FC Tuition Order` thành `Paid` và cập nhật `paid_until` cho `FC Class Member`.

#### [MODIFY] `add_student`
Khi giáo viên gõ email thêm thủ công, gán giá trị `is_manually_added = 1` và `join_status = "Approved"`.

---

### 3. Frontend (React)

#### [MODIFY] `TeacherDashboard.tsx`
- **Quản lý lớp học (Tạo/Sửa):** Bổ sung các radio button/input để thiết lập `Tuition Type`, `Price`, `Trial Days`, `Recurring Payment`.
- **Quản lý học sinh:** Bổ sung cột "Tình trạng học phí" (Đã nộp / Chưa nộp / Hết hạn). Thêm nút "Nhắc nhở nộp phí" hoặc chức năng thay đổi trạng thái thủ công (nếu học sinh nộp tiền mặt).
- **Trang Doanh thu & KQ:** Thêm biểu đồ/thống kê doanh thu từ Học phí (dựa trên `FC Tuition Order`), tách biệt với chi phí AI.

#### [MODIFY] `CourseOutlineManager.tsx` (Giao diện Học Sinh)
- Hiển thị Banner thanh toán: "Bạn đang trong thời gian học thử. Còn X ngày để thanh toán" hoặc "Khóa học đã bị khóa do chưa thanh toán".
- Nút "Thanh toán qua VNPAY" sẽ gọi `create_tuition_order` và chuyển hướng.
