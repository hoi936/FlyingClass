# 🎓 Flying Class - Hệ Thống Quản Lý Lớp Học Trực Tuyến

Chào mừng bạn đến với dự án **Flying Class**! Đây là một hệ thống quản lý học tập (LMS) toàn diện, thông minh và hiện đại bao gồm:
- **Backend:** Xây dựng bằng Frappe Framework (Python v16 / PostgreSQL).
- **Frontend:** Xây dựng bằng React.js, TypeScript, Vite, TailwindCSS và Lucide Icons.

---

## 🚀 Các Tính Năng Nổi Bật

### 👨‍🏫 Dành Cho Giáo Viên (Teacher)
- **Quản lý lớp học:** Tạo lớp học mới, tạo mã tham gia lớp học (Class Code), cập nhật/xóa lớp.
- **Quản lý học sinh:** Thêm/xóa học sinh bằng Email, tắt/mở chat của từng học sinh (Mute/Unmute), xem hồ sơ học sinh.
- **Quản lý bài thi:** Tạo đề thi thủ công hoặc tự động bằng AI, đặt thời lượng, thời gian mở/đóng bài thi và số lượt thi tối đa.
- **Bảng điểm tổng hợp (Gradebook) & Xuất CSV [MỚI]:** Xem bảng điểm ma trận của toàn bộ học sinh trong lớp cho tất cả các bài kiểm tra và xuất báo cáo CSV UTF-8 trực tiếp về máy.
- **Quản lý tài liệu:** Tổ chức bài giảng, tài liệu theo thư mục, hỗ trợ nhúng tài liệu trực quan (Iframe).
- **Thống kê giáo viên:** Xem biểu đồ trực quan về điểm số trung bình, tỷ lệ đỗ và kết quả của các bài kiểm tra.

### 🧑‍🎓 Dành Cho Học Sinh (Student)
- **Dashboard Học Tập:** Xem số lượng lớp học đang tham gia, học phí đã đầu tư, bài thi hoàn thành và biểu đồ tăng trưởng điểm số.
- **Phòng thi chống gian lận:** Môi trường làm bài thi nghiêm ngặt, cảnh báo vi phạm khi học sinh chuyển tab/giảm tiêu điểm màn hình.
- **AI Tự Luyện Đề [MỚI]:** Luyện thi thử trắc nghiệm bất cứ lúc nào bằng cách yêu cầu AI (Gemini) soạn đề theo chủ đề tự chọn, có đếm giờ và chấm điểm hiển thị đáp án chi tiết tức thì.
- **Trợ lý Tài liệu AI (AI Document Assistant) [MỚI]:** Khung chat AI (Gemini) thông minh tích hợp ngay bên cạnh tài liệu bài học, giúp giải đáp và tóm tắt kiến thức của file tài liệu đang xem.
- **Thảo luận lớp học:** Kênh chat nhóm thời gian thực (Realtime Chat) kết nối học sinh và giáo viên trong lớp học.

### 🔑 Dành Cho Quản Trị Viên (Admin)
- **Quản lý người dùng:** Duyệt hồ sơ KYC của Giáo viên (chấp nhận/từ chối kèm lý do cụ thể).
- **Cấu hình hệ thống:** Quản lý khóa API AI (Gemini/OpenAI), cài đặt bảo trì hệ thống và kiểm duyệt các gói thanh toán đăng ký AI qua cổng VNPAY.

---

## 🛠 Yêu Cầu Hệ Thống (Prerequisites)

Hãy đảm bảo máy tính của bạn (đặc biệt là môi trường WSL/Ubuntu) đã cài đặt sẵn các thành phần sau:
- **Node.js** (Khuyên dùng v20+ thông qua NVM)
- **Python** (v3.10 hoặc v3.11)
- **PostgreSQL** (Hệ quản trị cơ sở dữ liệu chính của dự án)
- **Redis Server** (Bắt buộc để chạy hàng đợi và cache cho Frappe)

---

## ⚙️ Hướng Dẫn Cài Đặt (Dành Cho Máy Mới)

### Bước 1: Clone dự án về máy
Mở Terminal và gõ:
```bash
git clone https://github.com/hoi936/FlyingClass.git
cd FlyingClass
```

### Bước 2: Thiết lập Backend (Frappe Bench)
Vì cơ sở dữ liệu PostgreSQL và môi trường ảo Python không được đẩy lên Github để bảo mật, bạn cần khôi phục chúng:

```bash
cd backend/v16-bench

# 1. Khôi phục môi trường ảo Python
bench setup env

# 2. Cài đặt lại các thư viện cần thiết cho Frappe & Flying Class
bench setup requirements

# 3. Tạo một Site mới
# Thay "postgres_root_password" bằng mật khẩu siêu quản trị (root/postgres) của PostgreSQL trên máy bạn
bench new-site flyingclass.localhost --db-root-password "postgres_root_password"

# 4. Cài đặt App Flying Class vào Site vừa tạo
bench --site flyingclass.localhost install-app flying_class

# 5. Chạy Script khởi tạo dữ liệu cốt lõi (Role, OAuth, DocTypes)
bench --site flyingclass.localhost execute flying_class.flying_class.setup_core.run

# 6. Thiết lập sử dụng site này làm mặc định
bench use flyingclass.localhost
```

### Bước 3: Thiết lập Frontend (React)
Mở một Terminal mới (giữ Terminal cũ để chạy Backend):
```bash
cd ~/FlyingClass/frontend

# Cài đặt các gói thư viện Node.js
npm install
```

### Bước 4: Cấu hình khóa API AI & Cổng Thanh Toán
1. Truy cập vào giao diện quản trị Frappe Desk: `http://flyingclass.localhost:8000/app`
2. Đăng nhập bằng tài khoản Administrator (Mật khẩu bạn đã đặt ở Bước 2 khi chạy `bench new-site`).
3. Truy cập tài liệu cấu hình của Frappe Desk hoặc chỉnh sửa trực tiếp file `sites/flyingclass.localhost/site_config.json` để thêm khóa `gemini_api_key` cho các tính năng AI.

---

## 🏃 Khởi Chạy Dự Án

Mỗi khi muốn code hoặc chạy thử dự án, bạn cần khởi động song song cả Backend và Frontend:

### 1. Khởi chạy Backend (Frappe):
```bash
# Đảm bảo Redis và Postgres đang chạy trên môi trường
sudo service redis-server start
sudo service postgresql start

# Chạy Bench
cd ~/FlyingClass/backend/v16-bench
bench start
```
*Backend sẽ hoạt động trên cổng `http://flyingclass.localhost:8000`*

### 2. Khởi chạy Frontend (React):
```bash
# Mở một Terminal khác
cd ~/FlyingClass/frontend
npm run dev
```
*Frontend sẽ chạy trên cổng `http://localhost:5173` (hoặc cổng khác tùy Vite).*

---

## 💡 Lưu Ý Quan Trọng
- **CORS:** Đảm bảo file `sites/flyingclass.localhost/site_config.json` chứa `"http://localhost:5173"` trong danh sách `cors` để tránh lỗi chặn API khi gọi từ Frontend React.
- **Tên miền:** Để truy cập bằng link `http://flyingclass.localhost:8000`, bạn hãy thêm dòng sau vào file hosts:
  - **Ubuntu/WSL:** `/etc/hosts` &rarr; `127.0.0.1 flyingclass.localhost`
  - **Windows:** `C:\Windows\System32\drivers\etc\hosts` &rarr; `127.0.0.1 flyingclass.localhost`

🎉 **Chúc bạn phát triển và vận hành thành công dự án Flying Class!**
