# Copyright (c) 2026, Your Organization and Contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase
from unittest.mock import patch

class IntegrationTestFCTeacherProfile(IntegrationTestCase):
    def setUp(self):
        super().setUp()
        frappe.set_user("Administrator")
        
        # Ensure we have a test user first
        if not frappe.db.exists("User", "test_teacher@example.com"):
            user = frappe.get_doc({
                "doctype": "User",
                "email": "test_teacher@example.com",
                "first_name": "Test",
                "last_name": "Teacher",
                "enabled": 1
            })
            user.insert(ignore_permissions=True)
        
        # Ensure we have a test teacher profile
        if not frappe.db.exists("FC Teacher Profile", {"user": "test_teacher@example.com"}):
            profile = frappe.get_doc({
                "doctype": "FC Teacher Profile",
                "user": "test_teacher@example.com",
                "full_name": "Test Teacher",
                "status": "Pending",
                "certificate_image": "/files/test_certificate.png"
            })
            profile.insert(ignore_permissions=True)
            
    def tearDown(self):
        profile_name = frappe.db.get_value("FC Teacher Profile", {"user": "test_teacher@example.com"}, "name")
        if profile_name:
            frappe.delete_doc("FC Teacher Profile", profile_name, ignore_permissions=True)
        if frappe.db.exists("User", "test_teacher@example.com"):
            frappe.delete_doc("User", "test_teacher@example.com", ignore_permissions=True)
        super().tearDown()

    def test_get_kyc_profiles_fields(self):
        """Test that get_kyc_profiles returns the newly added AI fields."""
        from flying_class.flying_class.api_admin import get_kyc_profiles
        
        profiles = get_kyc_profiles()
        self.assertTrue(isinstance(profiles, list))
        
        # Check if the AI fields are present in the returned list
        for p in profiles:
            self.assertIn("cert_ai_status", p)
            self.assertIn("cert_ai_confidence", p)
            self.assertIn("cert_ai_checked", p)

    @patch("flying_class.flying_class.ai_verification.predict_certificate")
    @patch("flying_class.flying_class.ai_verification.get_absolute_path")
    def test_run_kyc_ai_scan_api(self, mock_get_path, mock_predict):
        """Test the run_kyc_ai_scan endpoint updates the teacher profile correctly."""
        from flying_class.flying_class.api_admin import run_kyc_ai_scan
        
        mock_get_path.return_value = "/home/user/Flying_Class/backend/v16-bench/sites/flyingclass.localhost/public/files/test_certificate.png"
        mock_predict.return_value = {
            "success": True,
            "status": "Authentic",
            "confidence": 98.4,
            "message": "Cấu trúc nhiễu bề mặt đồng nhất."
        }
        
        profile_name = frappe.db.get_value("FC Teacher Profile", {"user": "test_teacher@example.com"}, "name")
        res = run_kyc_ai_scan(profile_name)
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("cert_ai_status"), "Authentic")
        self.assertEqual(res.get("cert_ai_confidence"), 98.4)
        
        # Verify db status is updated
        profile = frappe.get_doc("FC Teacher Profile", profile_name)
        self.assertEqual(profile.cert_ai_status, "Authentic")
        self.assertEqual(profile.cert_ai_confidence, 98.4)
        self.assertEqual(profile.cert_ai_checked, 1)

    @patch("flying_class.flying_class.ai_verification.predict_certificate")
    @patch("flying_class.flying_class.ai_verification.get_absolute_path")
    def test_upload_kyc_triggers_ai(self, mock_get_path, mock_predict):
        """Test that upload_kyc API triggers AI scan and saves results."""
        from flying_class.flying_class.api_admin import upload_kyc
        
        mock_get_path.return_value = "/home/user/Flying_Class/backend/v16-bench/sites/flyingclass.localhost/public/files/test_certificate.png"
        mock_predict.return_value = {
            "success": True,
            "status": "Forged",
            "confidence": 87.5,
            "message": "Phát hiện bất thường."
        }
        
        # Mock teacher session
        frappe.set_user("test_teacher@example.com")
        
        # Check and add User role to bypass permissions check in upload_kyc
        with patch("frappe.get_roles") as mock_roles:
            mock_roles.return_value = ["FC Teacher"]
            res = upload_kyc(certificate_url="/files/test_certificate.png")
            self.assertTrue(res.get("success"))
        
        # Verify db status
        profile_name = frappe.db.get_value("FC Teacher Profile", {"user": "test_teacher@example.com"}, "name")
        profile = frappe.get_doc("FC Teacher Profile", profile_name)
        self.assertEqual(profile.cert_ai_status, "Forged")
        self.assertEqual(profile.cert_ai_confidence, 87.5)
        self.assertEqual(profile.cert_ai_checked, 1)
