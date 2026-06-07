import streamlit as st
import torch
import torch.nn as nn
import numpy as np
import cv2
from PIL import Image

# ==========================================
# CẤU HÌNH GIAO DIỆN WEB
# ==========================================
st.set_page_config(
    page_title="Hệ thống Phát hiện Giả mạo Chứng chỉ", page_icon="🕵️", layout="wide"
)

st.title("🕵️ Hệ thống Phân tích & Phát hiện Chứng chỉ Giả mạo")
st.markdown(
    "**Đề tài NCKH** | Ứng dụng công nghệ lõi SRM (Spatial Rich Model) và mạng tích chập NoiseAwareCNN."
)
st.markdown("---")


# ==========================================
# 1. TÁI ĐỊNH NGHĨA KIẾN TRÚC MÔ HÌNH
# ==========================================
class PureSRMFilter:
    def __init__(self):
        self.kernel = np.array(
            [
                [-1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1],
                [-1, -1, 24, -1, -1],
                [-1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1],
            ],
            dtype=np.float32,
        )

    def __call__(self, img_pil):
        img_np = np.array(img_pil)
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        noise = cv2.filter2D(gray, cv2.CV_32F, self.kernel)
        noise = np.clip(noise, -127, 127)
        noise_norm = (noise + 127.0) / 254.0
        return torch.tensor(noise_norm, dtype=torch.float32).unsqueeze(0)


class NoiseAwareCNN(nn.Module):
    def __init__(self, in_channels=1):
        super(NoiseAwareCNN, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(in_channels, 32, 3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(64, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((4, 4)),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 4 * 4, 256),
            nn.ReLU(),
            nn.Dropout(0.6),
            nn.Linear(256, 1),
        )

    def forward(self, x):
        return self.classifier(self.features(x))


class ROICrop:
    def __call__(self, img):
        # Cố gắng crop đúng tọa độ, nếu ảnh nhỏ quá thì resize thẳng về 512x512
        try:
            return img.crop((600, 450, 1112, 962))
        except:
            return img.resize((512, 512))


# ==========================================
# 2. HÀM LOAD MODEL (CACHE ĐỂ KHÔNG BỊ LOAD LẠI LIÊN TỤC)
# ==========================================
@st.cache_resource
def load_model():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = NoiseAwareCNN(in_channels=1).to(device)

    # THAY ĐỔI TÊN FILE NẾU CẦN
    model_path = ".\\notebook_output\\model_srm_weights.pth"

    try:
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.eval()
        return model, device
    except Exception as e:
        st.error(
            f"❌ Không tìm thấy file trọng số '{model_path}'. Vui lòng kiểm tra lại!"
        )
        return None, None


model, device = load_model()

# ==========================================
# 3. GIAO DIỆN UPLOAD & XỬ LÝ
# ==========================================
uploaded_file = st.file_uploader(
    "📥 Tải ảnh chứng chỉ cần kiểm định lên đây (JPG, PNG, JPEG)",
    type=["png", "jpg", "jpeg"],
)

if uploaded_file is not None and model is not None:
    # Nạp ảnh
    img_pil = Image.open(uploaded_file).convert("RGB")

    st.markdown("### 📊 Tiến trình phân tích")
    col1, col2, col3 = st.columns(3)

    # Xử lý
    crop_tool = ROICrop()
    srm_tool = PureSRMFilter()

    img_cropped = crop_tool(img_pil)
    input_tensor = srm_tool(img_cropped)

    # Hiển thị Ảnh gốc
    with col1:
        st.image(img_pil, caption="1. Ảnh Gốc tải lên", use_container_width=True)

    # Hiển thị vùng ROI
    with col2:
        st.image(
            img_cropped, caption="2. Vùng kiểm tra (ROI)", use_container_width=True
        )

    # Hiển thị Nhiễu SRM
    with col3:
        # Chuyển tensor về numpy array để hiển thị
        noise_display = input_tensor.squeeze().numpy()
        st.image(
            noise_display,
            caption="3. Đặc trưng Nhiễu vi mô (SRM)",
            clamp=True,
            use_container_width=True,
        )

    # Nút bấm dự đoán
    st.markdown("---")
    if st.button("🚀 BẮT ĐẦU KIỂM ĐỊNH", use_container_width=True):
        with st.spinner("Mạng nơ-ron đang phân tích cấu trúc nhiễu..."):
            input_device = input_tensor.unsqueeze(0).to(device)
            with torch.no_grad():
                output = model(input_device).squeeze()
                prob = torch.sigmoid(output).item()

            # Đưa ra kết luận
            st.markdown("### 🎯 Kết luận từ Hệ thống")
            if prob > 0.5:
                st.error(f"🚨 CẢNH BÁO GIẢ MẠO (FORGED)!")
                st.warning(f"Độ tin cậy mô hình: **{prob:.2%}**")
                st.info(
                    "Phát hiện bất thường trong phân bố nhiễu tại vùng nội dung chứng chỉ. Có dấu hiệu bị chỉnh sửa (Splicing/Copy-Move)."
                )
            else:
                st.success(f"✅ CHỨNG CHỈ HỢP LỆ (AUTHENTIC)!")
                st.info(f"Độ tin cậy mô hình: **{(1 - prob):.2%}**")
                st.write(
                    "Cấu trúc nhiễu bề mặt đồng nhất, không phát hiện dấu vết cắt ghép can thiệp."
                )
