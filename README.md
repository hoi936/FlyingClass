# 🎓 Flying Class - Hệ Thống Quản Lý Lớp Học Trực Tuyến

Chào mừng bạn đến với dự án **Flying Class**! Đây là một hệ thống quản lý học tập (LMS) toàn diện bao gồm:
- **Backend:** Xây dựng bằng Frappe Framework (Python/MariaDB).
- **Frontend:** Xây dựng bằng React.js, TypeScript, Vite và TailwindCSS.

Dưới đây là hướng dẫn chi tiết từng bước để clone và chạy dự án này trên môi trường Local (WSL/Ubuntu).

---

## 🛠 Yêu Cầu Hệ Thống (Prerequisites)

Hãy đảm bảo máy tính của bạn (đặc biệt là môi trường WSL/Ubuntu) đã cài đặt sẵn các thành phần sau:
- **Node.js** (Khuyên dùng v20+ thông qua NVM)
- **Python** (v3.10 trở lên)
- **MariaDB** (hoặc MySQL)
- **Redis Server** (Bắt buộc cho Frappe)
- **wkhtmltopdf** (Dành cho việc xuất PDF nếu cần)

---

## 🚀 Hướng Dẫn Cài Đặt (Dành Cho Máy Mới)

### Bước 1: Clone dự án về máy
Mở Terminal và gõ:
```bash
git clone https://github.com/hoi936/FlyingClass.git
cd FlyingClass
```

### Bước 2: Thiết lập Backend (Frappe Bench)

Vì dự án đã chứa sẵn thư mục `backend/v16-bench`, nhưng các file môi trường ảo (`env/`) và Database không được đẩy lên Github để bảo mật, bạn cần khôi phục chúng:

```bash
cd backend/v16-bench

# 1. Khôi phục môi trường ảo Python (Virtual Environment)
bench setup env

# 2. Cài đặt lại các thư viện cần thiết cho Frappe & Flying Class
bench setup requirements

# 3. Tạo một Site mới (Cơ sở dữ liệu)
# Thay "root_password" bằng mật khẩu root thực tế của MariaDB trên máy bạn
bench new-site flyingclass.localhost --db-root-password "root_password"

# 4. Cài đặt App Flying Class vào Site vừa tạo
bench --site flyingclass.localhost install-app flying_class

# 5. Chạy Script khởi tạo dữ liệu cốt lõi (Role, OAuth, DocTypes)
bench --site flyingclass.localhost execute flying_class.flying_class.setup_core.run

# 6. Thiết lập sử dụng site này làm mặc định
bench use flyingclass.localhost
```

### Bước 3: Thiết lập Frontend (React)

Mở một Terminal mới (giữ Terminal cũ để lát chạy Backend):
```bash
cd ~/FlyingClass/frontend

# Cài đặt các gói thư viện Node.js
npm install
```

### Bước 4: Cấu hình đăng nhập bằng Google (Google OAuth)

Vì tính bảo mật, Client ID và Client Secret thực tế của Google không được lưu trong code. Để tính năng đăng nhập Google hoạt động:

1. Chạy Backend (xem Bước 5)
2. Truy cập vào giao diện quản trị Frappe Desk: `http://flyingclass.localhost:8000/app`
3. Đăng nhập bằng tài khoản Administrator (Mật khẩu bạn đã đặt ở Bước 2 khi chạy `bench new-site`).
4. Tìm kiếm mục **Social Login Key** trên thanh tìm kiếm.
5. Mở khóa **Google**, dán `Client ID` và `Client Secret` của bạn vào, sau đó ấn **Save**.

*(Nếu không có Client ID/Secret, bạn có thể tạo một cái mới trên [Google Cloud Console](https://console.cloud.google.com/)).*

---

## 🏃 Khởi Chạy Dự Án

Mỗi khi muốn code hoặc chạy thử dự án, bạn cần chạy song song cả Backend và Frontend.

**1. Khởi chạy Backend (Frappe):**
```bash
# Đảm bảo Redis và Postgres/MariaDB đang chạy
sudo service redis-server start
sudo service mariadb start

# Chạy Bench
cd ~/FlyingClass/backend/v16-bench
bench start
```
*Backend sẽ chạy trên cổng `http://flyingclass.localhost:8000`*

**2. Khởi chạy Frontend (React):**
```bash
# Mở một Terminal khác
cd ~/FlyingClass/frontend
npm run dev
```
*Frontend sẽ chạy trên cổng `http://localhost:5173` (hoặc cổng khác tuỳ Vite cấu hình).*

---

## 💡 Lưu Ý Quan Trọng
- **CORS:** Frontend Vite chạy ở `localhost:5173`. Nếu bị lỗi CORS khi gọi API xuống Frappe (`8000`), bạn hãy vào Frappe Desk -> **Site Config** (hoặc sửa file `sites/flyingclass.localhost/site_config.json`) và đảm bảo đã thêm `"http://localhost:5173"` vào mảng `cors`.
- **Tên miền:** Nếu bạn muốn dùng tên miền `flyingclass.localhost` trên trình duyệt, nhớ thêm dòng `127.0.0.1 flyingclass.localhost` vào file `/etc/hosts` (Ubuntu) và `C:\Windows\System32\drivers\etc\hosts` (Windows).

🎉 **Chúc bạn cài đặt thành công và trải nghiệm Flying Class!**
