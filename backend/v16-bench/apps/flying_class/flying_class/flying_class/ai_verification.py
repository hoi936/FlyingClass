import os
import numpy as np
import frappe
from PIL import Image

# Gracefully import torch and cv2 to avoid crash if not installed
HAS_DEPENDENCIES = False
try:
    import torch
    import torch.nn as nn
    import cv2
    HAS_DEPENDENCIES = True
except ImportError:
    pass

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
        # Convert RGB to Gray using OpenCV
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        noise = cv2.filter2D(gray, cv2.CV_32F, self.kernel)
        noise = np.clip(noise, -127, 127)
        noise_norm = (noise + 127.0) / 254.0
        return torch.tensor(noise_norm, dtype=torch.float32).unsqueeze(0)


if HAS_DEPENDENCIES:
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
else:
    class NoiseAwareCNN:
        pass


class ROICrop:
    def __call__(self, img):
        try:
            return img.crop((600, 450, 1112, 962))
        except Exception:
            return img.resize((512, 512))


def get_absolute_path(file_url: str) -> str:
    """
    Resolves a Frappe file URL into its absolute filesystem path.
    """
    if not file_url:
        return ""
    
    # If it is already an absolute path
    if os.path.isabs(file_url) and os.path.exists(file_url):
        return file_url

    # Relative URLs from Frappe DB
    clean_url = file_url.lstrip("/")
    
    # public files
    if clean_url.startswith("files/"):
        abs_path = frappe.get_site_path("public", clean_url)
        if os.path.exists(abs_path):
            return abs_path
            
    # private files
    if clean_url.startswith("private/files/"):
        abs_path = frappe.get_site_path(clean_url)
        if os.path.exists(abs_path):
            return abs_path

    # Fallback search inside sites directory
    fallback_path = frappe.get_site_path("public", "files", os.path.basename(file_url))
    if os.path.exists(fallback_path):
        return fallback_path
        
    return ""


def predict_certificate(file_path: str) -> dict:
    """
    Predicts if the certificate at the given file_path is authentic or forged.
    Returns:
        {
            "success": bool,
            "status": "Authentic" | "Forged" | "Error",
            "confidence": float,  # percentage
            "message": str
        }
    """
    if not HAS_DEPENDENCIES:
        return {
            "success": False,
            "status": "Error",
            "confidence": 0.0,
            "message": "Thiếu thư viện torch hoặc opencv-python. Vui lòng cài đặt."
        }

    # Locate weights file in standard location: /home/user/Flying_Class/AI/model_srm_weights.pth
    weights_path = "/home/user/Flying_Class/AI/model_srm_weights.pth"
    if not os.path.exists(weights_path):
        # Fallback relative to the root of the project
        project_root = os.path.abspath(os.path.join(frappe.get_app_path("flying_class"), "..", "..", "..", ".."))
        weights_path = os.path.join(project_root, "AI", "model_srm_weights.pth")
        if not os.path.exists(weights_path):
            return {
                "success": False,
                "status": "Error",
                "confidence": 0.0,
                "message": "Không tìm thấy file trọng số model_srm_weights.pth tại /home/user/Flying_Class/AI/"
            }

    if not file_path or not os.path.exists(file_path):
        return {
            "success": False,
            "status": "Error",
            "confidence": 0.0,
            "message": f"Không tìm thấy file ảnh chứng chỉ tại {file_path}"
        }

    try:
        # Load image
        img_pil = Image.open(file_path).convert("RGB")
        
        # Preprocess
        crop_tool = ROICrop()
        srm_tool = PureSRMFilter()
        img_cropped = crop_tool(img_pil)
        input_tensor = srm_tool(img_cropped)
        
        # Model configuration
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = NoiseAwareCNN(in_channels=1).to(device)
        model.load_state_dict(torch.load(weights_path, map_location=device))
        model.eval()
        
        # Inference
        input_device = input_tensor.unsqueeze(0).to(device)
        with torch.no_grad():
            output = model(input_device).squeeze()
            prob = torch.sigmoid(output).item()
            
        if prob > 0.5:
            return {
                "success": True,
                "status": "Forged",
                "confidence": round(prob * 100, 2),
                "message": "Phát hiện bất thường trong phân bố nhiễu tại vùng nội dung chứng chỉ."
            }
        else:
            return {
                "success": True,
                "status": "Authentic",
                "confidence": round((1 - prob) * 100, 2),
                "message": "Cấu trúc nhiễu bề mặt đồng nhất, chứng chỉ hợp lệ."
            }
            
    except Exception as e:
        import traceback
        frappe.logger().error(f"Lỗi phân tích chứng chỉ AI: {str(e)}\n{traceback.format_exc()}")
        return {
            "success": False,
            "status": "Error",
            "confidence": 0.0,
            "message": f"Lỗi trong quá trình xử lý: {str(e)}"
        }
