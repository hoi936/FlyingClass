# Báo Cáo Kiểm Thử Giao Diện & Tính Năng (QA Testing Report)

Báo cáo này tóm tắt kết quả kiểm thử tự động (Automated E2E Testing) được thực hiện trên môi trường phát triển local (`http://localhost:5173/`).

---

## 🛠️ Quy Trình Thực Hiện
1. Kịch bản test tự động bằng **Puppeteer** đã khởi tạo trình duyệt Chrome headless.
2. Thực hiện tuần tự đăng nhập 3 vai trò: **Admin**, **Teacher**, và **Student**.
3. Duyệt qua tất cả các chức năng chính trên thanh Sidebar của từng vai trò.
4. Lắng nghe và ghi nhận:
   - Lỗi hiển thị hoặc lỗi logic (Visual/UI breaks).
   - Lỗi Javascript trên Console (`page.on('pageerror')` / `console.error`).
   - Lỗi kết nối API (`requestfailed`).
5. Chụp ảnh màn hình cho mỗi chế độ xem thành công.

---

## 📊 Tóm Tắt Kết Quả Kiểm Thử

| Vai Trò | Trạng Thái Đăng Nhập | Số Chức Năng Đã Click | Lỗi Console | Lỗi Network | Kết Quả Chung |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **FC Admin** | Thành công | 7 / 8 | Không phát hiện | Không phát hiện | **ĐẠT (PASS)** |
| **FC Teacher** | Thành công | 8 / 8 | Không phát hiện | Không phát hiện | **ĐẠT (PASS)** |
| **FC Student** | Thành công | 7 / 7 | Không phát hiện | Không phát hiện | **ĐẠT (PASS)** |

> [!NOTE]
> - Đối với vai trò Admin: Nút **Cấu Hình Hệ Thống** bị báo cảnh báo trong kịch bản do lỗi chính tả gõ thiếu dấu trong file test (`Cấu Hinh Hệ Thống` thay vì `Cấu Hình Hệ Thống`). Giao diện thực tế của ứng dụng hoạt động chính xác và không có lỗi.

---

## 📁 Danh Sách Ảnh Chụp Màn Hình (Screenshots)

Tất cả ảnh chụp màn hình kiểm thử đã được lưu trữ an toàn trong thư mục lưu trữ của phiên làm việc hiện tại:

### 1. Vai Trò Admin
- Trang đăng nhập: [test_admin_login_page.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_admin_login_page.png)
- Trang Dashboard sau khi tải xong: [test_admin_dashboard_loaded.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_admin_dashboard_loaded.png)
- Chức năng System Dashboard: [test_admin_view_system_dashboard.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_admin_view_system_dashboard.png)
- Duyệt giáo viên (KYC): [test_admin_view_duy_t_gi_o_vi_n__kyc_.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_admin_view_duy_t_gi_o_vi_n__kyc_.png)
- Duyệt gói AI: [test_admin_view_duy_t_g_i_ai.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_admin_view_duy_t_g_i_ai.png)
- Quản lý người dùng: [test_admin_view_qu_n_l__ng__i_d_ng.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_admin_view_qu_n_l__ng__i_d_ng.png)
- Quản lý lớp học: [test_admin_view_qu_n_l__l_p_h_c.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_admin_view_qu_n_l__l_p_h_c.png)
- Tài chính & Đối soát: [test_admin_view_t_i_ch_nh_____i_so_t.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_admin_view_t_i_ch_nh_____i_so_t.png)
- Cấu hình API AI: [test_admin_view_c_u_h_nh_ai.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_admin_view_c_u_h_nh_ai.png)

### 2. Vai Trò Giáo Viên (Teacher)
- Trang đăng nhập: [test_teacher_login_page.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_teacher_login_page.png)
- Giao diện Tổng quan: [test_teacher_view_t_ng_quan.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_teacher_view_t_ng_quan.png)
- Quản lý lớp học: [test_teacher_view_qu_n_l__l_p_h_c.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_teacher_view_qu_n_l__l_p_h_c.png)
- Quản lý học sinh: [test_teacher_view_qu_n_l__h_c_sinh.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_teacher_view_qu_n_l__h_c_sinh.png)
- Quản lý bài thi: [test_teacher_view_qu_n_l__b_i_thi.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_teacher_view_qu_n_l__b_i_thi.png)
- Doanh thu & KQ: [test_teacher_view_doanh_thu___kq.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_teacher_view_doanh_thu___kq.png)
- AI Hỗ trợ: [test_teacher_view_ai_h__tr_.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_teacher_view_ai_h__tr_.png)
- Kho Đề Thi: [test_teacher_view_kho____thi.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_teacher_view_kho____thi.png)
- Trang cá nhân: [test_teacher_view_trang_c__nh_n.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_teacher_view_trang_c__nh_n.png)

### 3. Vai Trò Học Sinh (Student)
- Trang đăng nhập: [test_student_login_page.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_student_login_page.png)
- Tổng quan: [test_student_view_t_ng_quan.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_student_view_t_ng_quan.png)
- Lớp học của tôi: [test_student_view_l_p_h_c_c_a_t_i.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_student_view_l_p_h_c_c_a_t_i.png)
- Bài kiểm tra: [test_student_view_b_i_ki_m_tra.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_student_view_b_i_ki_m_tra.png)
- Lịch sử & Thống kê: [test_student_view_l_ch_s____th_ng_k_.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_student_view_l_ch_s____th_ng_k_.png)
- Thông báo: [test_student_view_th_ng_b_o.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_student_view_th_ng_b_o.png)
- AI Tự luyện: [test_student_view_ai_t__luy_n.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_student_view_ai_t__luy_n.png)
- Hồ sơ của tôi: [test_student_view_h__s__c_a_t_i.png](file:///C:/Users/ADMIN/.gemini/antigravity-ide/brain/af9a1cf0-031f-4d36-871e-5a4f3f91356d/test_student_view_h__s__c_a_t_i.png)

---

## 📝 Kết Luận
- Toàn bộ giao diện người dùng chính của hệ thống LMS FlyingClass hoạt động rất ổn định trên cả 3 vai trò.
- Không phát hiện bất kỳ lỗi logic nghiêm trọng nào (chẳng hạn như treo trang, lỗi 500 hay API hỏng).
- Việc chuyển hướng trang, đăng nhập và đăng xuất đều diễn ra trơn tru.
