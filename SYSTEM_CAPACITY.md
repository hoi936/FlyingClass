# Tài Liệu Phân Tích Hiệu Năng & Khả Năng Chịu Tải Hệ Thống (Flying Class)

Tài liệu này tóm tắt kết quả phân tích cấu trúc vận hành, hiệu năng và các giới hạn chịu tải vật lý của ứng dụng quản lý học tập **Flying Class** ở trạng thái hiện tại, cùng với phương án tối ưu hóa khi mở rộng quy mô.

---

## 1. Tổng Quan Cấu Trúc Công Nghệ (Technology Stack)
Hệ thống được xây dựng trên mô hình phân lớp vững chắc:
* **Frontend**: React + Vite + TypeScript (Tối ưu hóa bundle, chạy hoàn toàn ở phía client).
* **Backend**: Frappe Framework (Python / Gunicorn) đóng vai trò là RESTful API Server.
* **Cơ sở dữ liệu**: PostgreSQL (Lưu trữ quan hệ chính).
* **Bộ nhớ đệm & Xử lý hàng đợi**: Redis (Quản lý session, cache, hàng đợi gửi email/OTP).
* **Phương thức thời gian thực (Real-time)**: HTTP Polling (Chu kỳ 5 giây).

---

## 2. Khả Năng Chịu Tải Của Hệ Thống Chat

Hiện tại, hệ thống chat thảo luận lớp học (`ClassChat.tsx`) hoạt động dựa trên cơ chế **HTTP Polling** chu kỳ ngắn (5 giây):

### Khả năng chịu tải hiện tại (HTTP Polling)
* **Cách thức**: Trình duyệt của mỗi user online sẽ tự động gửi 1 yêu cầu HTTP GET lên server mỗi 5 giây để cập nhật tin nhắn mới.
* **Tính toán lý thuyết**:
  - Trung bình một yêu cầu lấy tin nhắn mất khoảng **50ms** để backend xử lý và truy vấn DB.
  - Một luồng xử lý (thread) của Python có thể xử lý tối đa `1s / 50ms = 20 requests/giây`.
  - Với chu kỳ polling 5 giây, **1 thread** có khả năng đáp ứng cho khoảng `20 * 5 = 100 người dùng chat đồng thời`.
  - Cấu hình server chạy Gunicorn với **16 threads** (ví dụ 4 workers x 4 threads) có thể phục vụ mượt mà cho **1.600 - 2.000 người dùng chat đồng thời**.

### Đề xuất tối ưu hóa (WebSockets)
* Khi số lượng người dùng đồng thời vượt quá 2.000, việc gửi hàng nghìn HTTP request mỗi giây sẽ gây áp lực lớn lên CPU và DB.
* **Giải pháp**: Chuyển đổi sang sử dụng **Socket.io / WebSockets** được tích hợp sẵn trong Frappe (cổng `9000`). WebSockets duy trì kết nối qua cổng TCP/RAM giúp 1GB RAM máy chủ có thể giữ kết nối trực tiếp cho **10.000 - 20.000 clients** đồng thời mà không tạo gánh nặng CPU.

---

## 3. Khả Năng Chịu Tải Toàn Hệ Thống

Khả năng chịu tải tổng thể của Flying Class phụ thuộc vào tài nguyên của máy chủ lưu trữ (Gunicorn + PostgreSQL + Redis):

### Cấu hình máy chủ cơ bản (2 Cores CPU, 4GB RAM)
* **Concurrent Users (Truy cập đồng thời liên tục)**: Đạt khoảng **500 - 1.000 người dùng** (thực hiện click, gửi biểu mẫu, làm bài thi đồng thời).
* **Online/Idle Users (Đọc tài liệu, treo tab)**: Đạt từ **5.000 - 10.000 người dùng** do giao diện React chạy hoàn toàn trên trình duyệt của client, không tiêu tốn tài nguyên xử lý của CPU máy chủ.

### Các điểm nghẽn tiềm ẩn & Giải pháp nâng cấp

#### A. Bộ vi xử lý (CPU) & Gunicorn Workers
* **Điểm nghẽn**: Khi có quá nhiều request gửi lên cùng lúc, số lượng Gunicorn workers bị quá tải khiến request bị xếp hàng (Latency tăng cao).
* **Giải pháp**: 
  - Điều chỉnh cấu hình worker của Gunicorn theo công thức chuẩn: `Workers = (2 * Số Cores CPU) + 1`.
  - Khi lượng truy cập tăng, tăng số lượng CPU cores của VPS/Server để tăng worker xử lý song song.

#### B. Kết nối Cơ sở dữ liệu (PostgreSQL Connection Pool)
* **Điểm nghẽn**: PostgreSQL mặc định giới hạn tối đa 100 kết nối trực tiếp. Khi số worker Gunicorn vượt quá số lượng này, hệ thống sẽ báo lỗi nghẽn DB.
* **Giải pháp**:
  - Sử dụng **PgBouncer** để tạo Connection Pooler trung gian, giúp tái sử dụng kết nối nhanh chóng và nâng giới hạn lên 5.000+ kết nối ảo.
  - Thiết lập chỉ mục (Indexes) cho các trường tìm kiếm chính như `creation`, `status`, `class_id` trong database.

#### C. Tải tĩnh Frontend (Vite Build Assets)
* **Điểm nghẽn**: Server backend phải tốn băng thông để truyền tải các file JS/CSS nặng của giao diện cho trình duyệt người dùng.
* **Giải pháp**:
  - Đưa toàn bộ thư mục build `frontend/dist` lên các nền tảng phân phối nội dung như **Cloudflare CDN** hoặc chạy riêng bằng **Nginx static server**. Điều này giúp giảm tải 100% băng thông tải file tĩnh cho máy chủ backend.
