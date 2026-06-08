# Phân Tích Chức Năng: Giáo Viên (FC Teacher)

Vai trò **FC Teacher** là lực lượng nòng cốt tạo ra giá trị nội dung cho nền tảng. Chức năng của giáo viên tập trung vào quản lý lớp học, thiết kế bài giảng/đề thi, tương tác với học sinh và khai thác sức mạnh trợ lý AI.

---

## 1. Bảng Điều Khiển (Dashboard) & Thống Kê

| Chức năng | Mô tả |
|-----------|-------|
| Tổng quan nhanh | Nắm bắt số lớp đang mở, tổng số học sinh, số kỳ thi đang diễn ra |
| Thống kê năng lực | Biểu đồ điểm trung bình, phân loại học lực (Giỏi, Khá, Trung bình, Yếu) |
| Biểu đồ Token | Theo dõi lượng token AI đã dùng theo ngày (7 ngày gần nhất) |
| Trợ lý AI nhúng | Cửa sổ chat AI nổi bật trên Dashboard để hỏi đáp nhanh |

---

## 2. Quản Lý Lớp Học (Class Management)

### 2.1 Tạo & Cấu hình lớp

| Chức năng | Mô tả |
|-----------|-------|
| Tạo lớp mới | Đặt tên lớp, mã lớp, sỉ số tối đa, giá tiền (nếu có), ảnh đại diện |
| Mã lớp (Class Code) | Hệ thống tự động tạo mã để học sinh nhập tham gia |

### 2.2 Kiểm duyệt Học Sinh (Mới)

| Chức năng | Mô tả |
|-----------|-------|
| Danh sách chờ duyệt | Khi học sinh nhập mã lớp, họ sẽ ở trạng thái **Pending** chờ giáo viên duyệt |
| Nút Duyệt (Approve) | Bấm nút xanh → Học sinh chính thức vào lớp, có quyền xem bài tập và thi |
| Nút Từ chối (Reject) | Bấm nút đỏ → Xóa học sinh khỏi danh sách, học sinh không thể truy cập lớp |
| Giao diện tách biệt | Phần "Chờ duyệt" nằm trên cùng, tách rõ ràng khỏi danh sách chính thức bên dưới |

### 2.3 Quản lý Thành viên

| Chức năng | Mô tả |
|-----------|-------|
| Thêm thủ công | Thêm học sinh bằng email (tự động Approved) |
| Import CSV | Nhập hàng loạt học sinh từ file CSV |
| Export CSV | Xuất danh sách học sinh ra file CSV |
| Xem hồ sơ (Profile) | Xem chi tiết thông tin cá nhân từng học sinh |
| Chặn chat (Mute) | Tắt quyền chat trong lớp cho học sinh vi phạm |
| Kích xuất (Kick) | Xóa học sinh khỏi lớp hoàn toàn |

### 2.4 Bảng Xếp Hạng Lớp (Gamification)

| Chức năng | Mô tả |
|-----------|-------|
| Top 3 vinh danh | Hiển thị Vàng 🥇, Bạc 🥈, Đồng 🥉 dựa trên tổng điểm thi |
| Cách tính điểm | Lấy điểm cao nhất mỗi bài thi, cộng dồn tất cả bài thi trong lớp |
| Giao diện trực quan | Podium 3 bậc với hiệu ứng animation |

### 2.5 Lộ trình học (Course Outline)

| Chức năng | Mô tả |
|-----------|-------|
| Cây thư mục | Xây dựng giáo trình theo cấu trúc thư mục đa cấp |
| Tải tài liệu | Upload và gán tài liệu cho từng giai đoạn học |

---

## 3. Quản Lý Đề Thi & Chấm Điểm

### 3.1 Soạn Đề Thi

| Phương thức | Mô tả |
|------------|-------|
| Soạn thủ công | Tạo câu hỏi trắc nghiệm trực tiếp trên hệ thống |
| AI Quiz Builder | Tải PDF/Excel → AI tự động sinh bộ câu hỏi trắc nghiệm chuẩn |
| Ngân hàng đề | Lưu trữ đề vào kho để tái sử dụng nhiều lần |

### 3.2 Quản lý Kỳ Thi (Exams)

| Chức năng | Mô tả |
|-----------|-------|
| Giao bài cho lớp | Chọn đề từ ngân hàng và giao cho lớp cụ thể |
| Lên lịch mở/đóng | Cấu hình thời gian bắt đầu, kết thúc, thời lượng làm bài |
| Bật/tắt bài thi | Toggle trạng thái Active/Inactive cho từng bài |
| Đóng toàn bộ | Đóng tất cả bài thi đang mở cùng lúc |

### 3.3 Chấm Điểm

| Chức năng | Mô tả |
|-----------|-------|
| Xem bài nộp | Chi tiết từng bài làm của học sinh |
| Thống kê câu sai | Phân tích câu nào bị sai nhiều nhất |
| AI nhận xét | Dùng AI để nhận xét chi tiết từng bài làm |

---

## 4. Trợ Lý AI (AI Features)

| Chức năng | Mô tả |
|-----------|-------|
| Chat Sessions | Phân luồng cuộc trò chuyện thành các phiên riêng biệt |
| Đính kèm tài liệu | Upload file kèm theo câu hỏi để AI phân tích |
| Nâng cấp gói | Gói Thường (199K/tháng), Gói Pro (499K/tháng), Token Lẻ (linh hoạt) |
| Token cộng dồn | Mua Token Lẻ sẽ được cộng thêm vào tổng token hiện có |

---

## 5. Hồ Sơ & Xác Minh (KYC & Profile)

| Chức năng | Mô tả |
|-----------|-------|
| Cập nhật hồ sơ | Họ tên, ngày sinh, SĐT, ảnh đại diện |
| Chứng chỉ sư phạm | Upload ảnh chứng chỉ giảng dạy |
| CCCD / Căn cước | Upload ảnh giấy tờ tùy thân để xác minh danh tính |

---

> **💡 Mẹo:** Giáo viên nên tận dụng triệt để AI Quiz Builder và AI nhận xét bài nộp để giảm thiểu đến 70% thời gian chấm chữa bài thủ công.
