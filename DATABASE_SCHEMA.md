# 🗂️ Chi Tiết Cơ Sở Dữ Liệu Flying Class (Database Schema)

Dự án **Flying Class** được xây dựng trên nền tảng **Frappe Framework** kết hợp hệ quản trị cơ sở dữ liệu **PostgreSQL**. Toàn bộ dữ liệu nghiệp vụ được ánh xạ thông qua các lớp đối tượng dữ liệu tùy chỉnh (**DocTypes**).

Dưới đây là đặc tả chi tiết của tất cả các bảng dữ liệu tùy chỉnh (Custom DocTypes) trong hệ thống.

---

## 1. Hệ Thống Lớp Học & Bài Giảng (Class & Content)

### 🏫 FC Class (`tabFC Class`)
Lưu trữ thông tin chi tiết về từng lớp học trực tuyến.

*   **Loại DocType:** Standard DocType
*   **Quy tắc đặt tên (Autoname):** `CLS-{YYYY}-{####}`
*   **Danh sách các trường:**

| Fieldname | Label | Fieldtype | Options / Options Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `class_name` | Tên lớp học | Data | - | Bắt buộc (`reqd`) |
| `class_code` | Mã lớp | Data | - | Bắt buộc, Không trùng lặp (`unique`) |
| `teacher` | Giáo viên | Link | `User` | Liên kết đến bảng User của Frappe |
| `price` | Học phí | Currency | - | - |
| `max_students`| Số HS tối đa | Int | - | Mặc định: `50` |
| `image` | Ảnh lớp học | Attach Image | - | Đường dẫn ảnh đại diện lớp |
| `status` | Trạng thái | Select | `Active` (Hoạt động)<br>`Hidden` (Ẩn) | Mặc định: `Active` |
| `description` | Mô tả | Text Editor | - | - |
| `students` | Danh sách HS | Table | `FC Class Member` | Bảng con lưu thành viên |

---

### 🧑‍ học viên FC Class Member (`tabFC Class Member`)
Lưu trữ thông tin học sinh tham gia một lớp học cụ thể.

*   **Loại DocType:** Child Table DocType (Bảng con nằm trong `FC Class`)
*   **Danh sách các trường:**

| Fieldname | Label | Fieldtype | Options / Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `student` | Học sinh | Link | `User` | Liên kết đến tài khoản học sinh |
| `join_date` | Ngày tham gia | Date | - | Mặc định: Ngày hiện tại (`Today`) |
| `is_muted` | Bị chặn chat | Check / Int | - | `1` là bị mute không cho gửi tin nhắn |

---

### 📖 FC Lesson (`tabFC Lesson`)
Lưu trữ thông tin bài học và bài giảng số.

*   **Loại DocType:** Standard DocType
*   **Danh sách các trường:**

| Fieldname | Label | Fieldtype | Options / Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Tiêu đề | Data | - | Tên bài học |
| `class_ref` | Lớp học | Link | `FC Class` | Thuộc lớp học nào |
| `video_url` | Link bài giảng | Data | - | Link nhúng YouTube hoặc Google Drive |
| `description` | Chi tiết | Text | - | Mô tả bài học |

---

### 📂 FC Document (`tabFC Document`)
Lưu trữ cây thư mục tài liệu học tập của lớp học.

*   **Loại DocType:** Standard DocType
*   **Quy tắc đặt tên (Autoname):** `DOC-{YYYY}-{####}`
*   **Danh sách các trường:**

| Fieldname | Label | Fieldtype | Options / Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `document_name`| Tên tài liệu | Data | - | Bắt buộc |
| `class_ref` | Lớp học | Link | `FC Class` | Bắt buộc |
| `doc_type` | Loại | Select | `Folder` (Thư mục)<br>`Link` (Liên kết/Tệp) | Mặc định: `Link` |
| `parent_folder`| Thư mục cha | Link | `FC Document` | Tạo cấu trúc thư mục phân cấp |
| `link_url` | Đường dẫn (URL)| Data | - | Đường dẫn file hoặc link ngoài |
| `teacher` | Người đăng | Link | `User` | Giáo viên tải tài liệu lên |

---

## 2. Hệ Thống Thi & Đánh Giá (Exams & Submissions)

### 📝 FC Exam (`tabFC Exam`)
Lưu trữ cấu trúc đề thi chính thức do giáo viên tạo ra.

*   **Loại DocType:** Standard DocType
*   **Quy tắc đặt tên (Autoname):** `EXM-{YYYY}-{####}`
*   **Danh sách các trường:**

| Fieldname | Label | Fieldtype | Options / Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Tiêu đề đề thi | Data | - | Bắt buộc |
| `class_ref` | Thuộc lớp | Link | `FC Class` | Bắt buộc |
| `duration` | Thời lượng | Int | - | Đơn vị: Phút |
| `max_attempts` | Số lượt thi | Int | - | Số lần tối đa học sinh được làm lại |
| `status` | Trạng thái | Select | `Open` (Đang mở)<br>`Completed` (Đã đóng) | Giáo viên có thể đóng/mở bài thi |
| `start_time` | Giờ mở đề | Datetime | - | Thời gian bắt đầu làm đề |
| `end_time` | Giờ đóng đề | Datetime | - | Thời gian kết thúc nhận bài |
| `questions` | Bộ câu hỏi | Table | `FC Question` | Bảng con chứa danh sách câu hỏi |

---

### ❓ FC Question (`tabFC Question`)
Lưu trữ nội dung chi tiết từng câu hỏi trắc nghiệm.

*   **Loại DocType:** Child Table DocType (Bảng con nằm trong `FC Exam`)
*   **Danh sách các trường:**

| Fieldname | Label | Fieldtype | Options / Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `question_text`| Nội dung câu hỏi| Text | - | Hỗ trợ text hoặc HTML |
| `option_a` | Đáp án A | Data | - | - |
| `option_b` | Đáp án B | Data | - | - |
| `option_c` | Đáp án C | Data | - | - |
| `option_d` | Đáp án D | Data | - | - |
| `correct_option`| Đáp án đúng | Select | `A`<br>`B`<br>`C`<br>`D` | Đáp án chuẩn để chấm điểm tự động |

---

### 📤 FC Submission (`tabFC Submission`)
Lưu trữ kết quả và chi tiết bài làm đã nộp của học sinh.

*   **Loại DocType:** Standard DocType
*   **Quy tắc đặt tên (Autoname):** `SUB-{YYYY}-{####}`
*   **Danh sách các trường:**

| Fieldname | Label | Fieldtype | Options / Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `exam_ref` | Đề thi | Link | `FC Exam` | Bắt buộc |
| `student` | Học sinh làm | Link | `User` | Bắt buộc |
| `answers_json` | Đáp án đã chọn | Code (JSON) | - | Lưu dạng `{"Q01": "A", "Q02": "C"}` |
| `score` | Điểm số đạt được| Float | - | Thang điểm: 10 |
| `teacher_comment`| Nhận xét của GV | Text | - | Giáo viên nhận xét bài làm |
| `cheat_warnings`| Số lần vi phạm | Int | - | Ghi lại số lần chuyển tab khi thi |

---

## 3. Hệ Thống Trao Đổi & Hồ Sơ (Chat & KYC)

### 💬 FC Chat Message (`tabFC Chat Message`)
Lưu trữ các tin nhắn trò chuyện thời gian thực trong lớp học.

*   **Loại DocType:** Standard DocType
*   **Danh sách các trường:**

| Fieldname | Label | Fieldtype | Options / Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `class_ref` | Phòng học | Link | `FC Class` | Thuộc kênh chat lớp nào |
| `sender` | Người gửi | Link | `User` | - |
| `is_teacher` | Là giáo viên | Check / Int | - | Phân biệt tin nhắn giáo viên (1) |
| `message` | Nội dung | Text | - | Nội dung tin nhắn chat |

---

### 🛡️ FC Teacher Profile (`tabFC Teacher Profile`)
Lưu trữ hồ sơ thông tin của giáo viên để kiểm duyệt KYC.

*   **Loại DocType:** Standard DocType
*   **Danh sách các trường:**

| Fieldname | Label | Fieldtype | Options / Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `user` | Tài khoản User | Link | `User` | Liên kết đến User |
| `full_name` | Họ và tên | Data | - | - |
| `status` | Trạng thái KYC | Select | `Pending` (Chờ duyệt)<br>`Approved` (Đã duyệt)<br>`Rejected` (Từ chối) | Quyết định quyền tạo lớp học |
| `dob` | Ngày sinh | Date | - | - |
| `cccd_number` | Số CCCD | Data | - | Đúng định dạng 12 chữ số |
| `phone` | Số điện thoại | Data | - | - |
| `id_card_image` | Ảnh mặt trước CCCD| Attach Image | - | - |
| `certificate_image`| Ảnh bằng cấp sư phạm| Attach Image | - | - |
| `rejection_reason`| Lý do từ chối | Text | - | Lý do không duyệt hồ sơ từ Admin |

---

## 4. Phân Hệ Đăng Ký AI & Tiền Tệ (AI Subscriptions)

### 💳 FC AI Subscription Order (`tabFC AI Subscription Order`)
Quản lý các giao dịch đăng ký gia hạn sử dụng dịch vụ AI.

*   **Loại DocType:** Standard DocType
*   **Quy tắc đặt tên (Autoname):** `SUB-AI-{YYYY}-{####}`
*   **Danh sách các trường:**

| Fieldname | Label | Fieldtype | Options / Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `teacher` | Giáo viên mua | Link | `User` | Bắt buộc |
| `package_type` | Gói đăng ký | Select | `Monthly`<br>`Yearly`<br>`Pro_Monthly`<br>`Pro_Yearly` | Các gói cước AI |
| `amount` | Số tiền thanh toán| Currency | - | Bắt buộc |
| `status` | Trạng thái giao dịch| Select | `Pending`<br>`Paid`<br>`Failed`<br>`Approved`<br>`Rejected` | Mặc định: `Pending` |
| `order_code` | Mã đơn hàng | Data | - | Trùng khớp với ID đơn hàng |
| `payment_gateway`| Cổng thanh toán | Data | - | Ví dụ: `VNPAY`, `TEST_BANK` |
| `vnp_transaction_no`| Số giao dịch VNPAY| Data | - | Mã tham chiếu VNPAY |
| `vnp_response_code`| Mã phản hồi | Data | - | Phản hồi từ phía ngân hàng |
| `vnp_transaction_status`| Trạng thái GD VNPAY| Data | - | Xác thực giao dịch thành công |
| `paid_at` | Giờ thanh toán | Datetime | - | Ghi nhận lúc giao dịch hoàn tất |
| `payment_date` | Ngày thanh toán | Datetime | - | Đồng bộ với ngày thanh toán thực tế |

---

### 📊 FC AI Token Usage (`tabFC AI Token Usage`)
Ghi nhận lưu lượng và chi phí Token sử dụng qua API OpenAI / Gemini.

*   **Loại DocType:** Standard DocType
*   **Danh sách các trường:**

| Fieldname | Label | Fieldtype | Options / Link | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `model` | Mô hình sử dụng | Data | - | Ví dụ: `gemini-2.0-flash`, `gpt-4o` |
| `input_tokens` | Token đầu vào | Int | - | - |
| `output_tokens` | Token đầu ra | Int | - | - |
| `action` | Tác vụ thực hiện | Data | - | Ví dụ: `Quiz Gen`, `Doc Chat` |
| `user` | Người dùng gọi | Link | `User` | Liên kết đến người sử dụng |
