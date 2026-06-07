# VIBE CODE - NHẬT KÝ THAY ĐỔI & GIT PUSH

*File này được tạo tự động để ghi chú lại các thay đổi sau mỗi lần "vibe code" cùng AI. Lần sau nếu bạn mở phiên chat mới, chỉ cần đưa file này cho AI xem, nó sẽ biết phải commit và push những gì.*

---

## 📅 Phiên làm việc gần nhất: 07/06/2026

### 📝 Các thay đổi đã thực hiện:
- **Giao diện:** Sửa lỗi bảng danh sách học sinh bị ép khung, thêm `min-h-[300px]` và cuộn thoải mái (tại `TeacherDashboard.tsx`).
- **AI Token Dashboard:** Lấy dữ liệu token từ Database (`tabFC AI Token Usage`) và vẽ biểu đồ BarChart bằng `recharts` thay thế cho chữ "sắp ra mắt".
- **AI Fallback & Mock Data:** 
  - Cập nhật đúng tên model Gemini sang `models/gemini-2.0-flash`.
  - Tự động sinh Mock Data (đề thi giả lập và tin nhắn giả lập) khi API Key gặp lỗi quá tải 429 từ Google để quá trình test UI không bị gián đoạn.
- **Git Security:** Xóa các chuỗi API Key cứng (raw keys) bị lộ trong các file test `test_gemini_live.py` và `update_api_key.py`.

### 🚀 Lệnh Git Push mẫu (Dành cho AI hoặc người dùng):
```bash
git add .
git commit -m "Cập nhật chức năng Mock Data AI và fix lỗi giao diện"
git push
```
---

## 📅 Phiên làm việc tiếp theo: [YYYY-MM-DD]
*(Ghi chú các yêu cầu mới vào đây)*
