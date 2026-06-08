# Phân Tích Chức Năng: Quản Trị Viên Hệ Thống (FC Admin)

Vai trò **FC Admin** là cấp quyền cao nhất trong nền tảng Flying Class, chịu trách nhiệm vận hành, giám sát tài chính, bảo mật hệ thống và cấu hình các dịch vụ lõi (đặc biệt là trí tuệ nhân tạo).

---

## 1. Quản Lý Tổng Quan (Dashboard)

| Chức năng | Mô tả |
|-----------|-------|
| Thống kê toàn cục | Xem các chỉ số vĩ mô theo thời gian thực: Tổng doanh thu, số giáo viên, số học sinh, số lớp học, số bài thi |
| Biểu đồ tăng trưởng | Theo dõi biểu đồ số lượng đăng ký mới và xu hướng doanh thu theo tháng |

---

## 2. Quản Lý Người Dùng (Users Management)

| Chức năng | Mô tả |
|-----------|-------|
| Danh sách người dùng | Tra cứu thông tin tất cả tài khoản trên hệ thống (Giáo viên & Học sinh) |
| Phân loại vai trò | Hiển thị tag phân biệt "FC Teacher" và "FC Student" |
| Kiểm soát Gói AI & Token | Theo dõi dung lượng Token (đã dùng / tổng giới hạn), gói cước đang dùng (Thường, Pro, Token Lẻ, Free) |
| Trạng thái hoạt động | Nắm được tình trạng Active / Inactive của từng tài khoản |
| Tác vụ quản trị | Khóa (Deactivate) hoặc xóa tài khoản vi phạm chính sách nền tảng |

---

## 3. Quản Lý Gói Dịch Vụ & Tài Chính (Financial & Subscriptions)

### 3.1 Xét duyệt đơn hàng mua gói AI

| Chức năng | Mô tả |
|-----------|-------|
| Nhận yêu cầu nâng cấp | Quản lý các yêu cầu mua gói AI từ giáo viên (Gói Thường, Gói Pro, Token Lẻ) |
| Duyệt / Từ chối | Thực hiện hành động Duyệt hoặc Từ chối giao dịch |
| Tự động cộng dồn | Khi duyệt, hệ thống tự cộng dồn token hoặc cập nhật thời hạn gói tương ứng |

### 3.2 Báo cáo Tài chính Đối soát

| Chức năng | Mô tả |
|-----------|-------|
| Thống kê theo gói cước | Doanh thu chia theo Gói 1 Tháng, Gói Pro, Gói Token Lẻ |
| Biểu đồ Bar Chart | Doanh thu và số lượng đơn hàng theo thời gian |
| Lịch sử giao dịch | Transaction History chi tiết phục vụ kế toán |

### 3.3 Logic chặn mua gói trùng

| Trạng thái hiện tại | Gói Thường | Gói Pro | Token Lẻ |
|---------------------|-----------|---------|----------|
| Chưa có gói | ✅ Cho phép | ✅ Cho phép | ✅ Cho phép |
| Đang dùng Gói Thường | ❌ Chặn (hiện "Bạn đang có gói Thường") | ✅ Nâng cấp lên Pro | ✅ Cho phép |
| Đang dùng Gói Pro | ❌ Chặn | ❌ Chặn (hiện "Chỉ có thể mua Token Lẻ") | ✅ Cho phép |

---

## 4. Quản Lý Hệ Thống AI (AI Config & Security)

| Chức năng | Mô tả |
|-----------|-------|
| Cấu hình Model AI | Chọn mô hình AI chính cho hệ thống (gemini-1.5-flash, gpt-4o, v.v.) |
| Quản lý API Key | Cập nhật khóa API kết nối nhà cung cấp AI |
| Bảo mật 2 lớp (OTP) | Khi xem/thay đổi API Key, hệ thống gửi OTP xác thực để chống lộ lọt khóa |

---

## 5. Quản Lý Thư Viện Kho Đề (Exam Bank)

| Chức năng | Mô tả |
|-----------|-------|
| Kiểm duyệt nội dung | Quản lý ngân hàng đề thi chung, gỡ bỏ đề vi phạm hoặc không đạt chất lượng |
| Phân tích sử dụng | Xem báo cáo mức độ sử dụng kho đề chung của giáo viên |

---

> **⚠️ Lưu ý bảo mật:** Vai trò FC Admin can thiệp sâu vào dữ liệu người dùng và API key hệ thống. Chỉ cấp quyền này cho nhân sự quản lý cấp cao để phòng ngừa rủi ro rò rỉ dữ liệu giáo dục.
