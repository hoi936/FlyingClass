# Phân Tích Chức Năng: Học Sinh (FC Student)

Vai trò **FC Student** là đối tượng học tập chính của hệ thống. Trải nghiệm được thiết kế hướng tới sự đơn giản, tính tương tác cao (Gamification) và tập trung vào quá trình làm bài tập, thi cử.

---

## 1. Dashboard (Không Gian Học Tập Cá Nhân)

| Chức năng | Mô tả |
|-----------|-------|
| Danh sách Lớp học | Toàn bộ các lớp đang theo học, hiển thị dạng thẻ (Cards) trực quan |
| Radar Chart | Đánh giá năng lực theo các chủ điểm/môn học |
| Line Chart | Tiến trình điểm số thi cử qua thời gian |

---

## 2. Tham Gia Lớp Học

### 2.1 Quy trình tham gia

```
Nhập mã lớp → Trạng thái "Pending" → Giáo viên duyệt → Truy cập lớp
```

| Bước | Mô tả |
|------|-------|
| Nhập mã lớp | Học sinh nhập Class Code mà giáo viên cung cấp |
| Chờ duyệt (Pending) | Thẻ lớp hiện nhãn **"Chờ giáo viên duyệt"** màu cam, không thể bấm vào |
| Được duyệt (Approved) | Thẻ lớp trở lại bình thường, có thể bấm "Vào lớp học" |
| Bị từ chối | Thẻ lớp bị xóa khỏi danh sách |

### 2.2 Trạng thái hiển thị trên thẻ lớp

| Trạng thái | Giao diện | Hành động |
|-----------|----------|----------|
| Pending | Thẻ mờ + nhãn cam "Chờ giáo viên duyệt" + nút xám "Đang chờ duyệt..." | Không thể bấm vào |
| Approved | Thẻ bình thường + badge xanh "Active" + nút xanh "Vào lớp học →" | Bấm để truy cập lớp |

---

## 3. Hoạt Động Trong Lớp Học

### 3.1 Nội dung học tập

| Chức năng | Mô tả |
|-----------|-------|
| Lộ trình khóa học | Xem Course Outline và tải tài liệu môn học |
| Danh sách bài thi | Truy cập các bài thi/kiểm tra mà giáo viên giao |
| Bảng Xếp Hạng | Thấy vị trí của mình trong bảng vinh danh Top 3 (Vàng, Bạc, Đồng) |

### 3.2 Làm bài thi

| Chức năng | Mô tả |
|-----------|-------|
| Giao diện trắc nghiệm | Làm bài với đồng hồ đếm ngược theo thời lượng cấu hình |
| Kết quả tức thì | Điểm số và đáp án chi tiết hiển thị ngay sau khi nộp bài |
| Thi lại | Nếu giáo viên cho phép, hệ thống chỉ giữ lại điểm cao nhất |
| Lịch sử thi | Xem lại toàn bộ lịch sử bài thi đã làm |

### 3.3 Cách tính điểm Bảng Xếp Hạng

```
Tổng điểm = Σ (Điểm cao nhất mỗi bài thi trong lớp)
```

- Mỗi bài thi chỉ lấy **lần thi có điểm cao nhất**
- Cộng dồn tất cả bài thi trong lớp
- Sắp xếp giảm dần → Top 3 được vinh danh

---

## 4. Trợ Lý AI Cá Nhân

| Chức năng | Mô tả |
|-----------|-------|
| Token miễn phí | Mỗi học sinh được cấp **50.000 tokens miễn phí** |
| Gia sư ảo (Tutor) | Chatbot AI hỗ trợ giải đáp thắc mắc, tóm tắt bài giảng |
| Giới hạn sử dụng | Khi hết token, cần yêu cầu Admin cấp thêm hoặc chờ đợt cấp mới |

---

## 5. Tương Tác & Đánh Giá

| Chức năng | Mô tả |
|-----------|-------|
| Xem thông tin GV | Xem hồ sơ giáo viên phụ trách lớp |
| Đánh giá giáo viên | Rating & Review chất lượng giảng dạy (mỗi lớp chỉ được đánh giá 1 lần) |
| Chat trong lớp | Tương tác, hỏi đáp trong nhóm lớp học (nếu không bị Mute) |

---

## 6. Hồ Sơ Cá Nhân (Profile)

| Chức năng | Mô tả |
|-----------|-------|
| Thông tin cơ bản | Họ tên, email, giới tính, số điện thoại |
| Ảnh đại diện | Upload hoặc chọn ảnh đại diện cá nhân |

---

> **📝 Ghi chú:** Để tránh lạm dụng, hệ thống AI của học sinh được giới hạn lượng token nhất định. Token miễn phí (50K) đủ để phục vụ nhu cầu học tập cơ bản hàng ngày.
