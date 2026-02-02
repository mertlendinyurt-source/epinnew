#!/usr/bin/env python3
"""
Admin User Password Change Endpoint Testing Script
Tests PUT /api/admin/users/{userId}/password endpoint according to the review request
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

# Test data
ADMIN_CREDENTIALS = {
    "username": "admin",
    "password": "admin123"
}

class AdminPasswordChangeTester:
    def __init__(self):
        self.admin_token = None
        self.test_user_id = None
        self.test_user_email = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        print()

    def admin_login(self):
        """Login as admin to get token"""
        try:
            response = requests.post(f"{API_BASE}/admin/login", json=ADMIN_CREDENTIALS)
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get('token')
                self.log_result("Admin Login", True, "Admin login successful")
                return True
            else:
                self.log_result("Admin Login", False, f"Admin login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("Admin Login", False, f"Admin login error: {str(e)}")
            return False

    def create_test_user(self):
        """Create a test user for password change testing"""
        try:
            # Generate unique email for test user
            unique_id = str(uuid.uuid4())[:8]
            user_data = {
                "firstName": "Test",
                "lastName": "User",
                "email": f"testuser_{unique_id}@example.com",
                "phone": "5551234567",
                "password": "oldpassword123"
            }
            
            response = requests.post(f"{API_BASE}/auth/register", json=user_data)
            if response.status_code == 200:
                data = response.json()
                user_data_response = data.get('data', {}) if 'data' in data else data
                self.test_user_id = user_data_response.get('user', {}).get('id')
                self.test_user_email = user_data['email']
                self.log_result("Create Test User", True, f"Test user created with ID: {self.test_user_id}")
                return True
            else:
                self.log_result("Create Test User", False, f"User creation failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("Create Test User", False, f"User creation error: {str(e)}")
            return False

    def test_authentication_required(self):
        """Test 1: Call endpoint without admin token - should return 401"""
        try:
            fake_user_id = "test-user-id"
            response = requests.put(
                f"{API_BASE}/admin/users/{fake_user_id}/password",
                json={"newPassword": "newpass123"}
            )
            
            if response.status_code == 401:
                self.log_result("Authentication Test", True, "Correctly returned 401 without admin token")
                return True
            else:
                self.log_result("Authentication Test", False, f"Expected 401, got {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Authentication Test", False, f"Authentication test error: {str(e)}")
            return False

    def test_user_not_found(self):
        """Test 2: Call endpoint with non-existent userId - should return 404"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            fake_user_id = "non-existent-user-id"
            
            response = requests.put(
                f"{API_BASE}/admin/users/{fake_user_id}/password",
                json={"newPassword": "newpass123"},
                headers=headers
            )
            
            print(f"DEBUG: Response status: {response.status_code}, Response: {response.text}")
            
            if response.status_code == 404:
                self.log_result("User Not Found Test", True, "Correctly returned 404 for non-existent user")
                return True
            else:
                self.log_result("User Not Found Test", False, f"Expected 404, got {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("User Not Found Test", False, f"User not found test error: {str(e)}")
            return False

    def test_short_password(self):
        """Test 3: Call with password less than 6 characters - should return 400"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            response = requests.put(
                f"{API_BASE}/admin/users/{self.test_user_id}/password",
                json={"newPassword": "12345"},  # 5 characters
                headers=headers
            )
            
            if response.status_code == 400:
                data = response.json()
                error_message = data.get('error', '')
                if "Şifre en az 6 karakter olmalıdır" in error_message:
                    self.log_result("Short Password Test", True, f"Correctly returned 400 with expected error message: {error_message}")
                    return True
                else:
                    self.log_result("Short Password Test", False, f"Got 400 but wrong error message: {error_message}")
                    return False
            else:
                self.log_result("Short Password Test", False, f"Expected 400, got {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Short Password Test", False, f"Short password test error: {str(e)}")
            return False

    def test_successful_password_change(self):
        """Test 4: Successful password change - should return 200"""
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            new_password = "newpassword123"
            
            response = requests.put(
                f"{API_BASE}/admin/users/{self.test_user_id}/password",
                json={"newPassword": new_password},
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and "Şifre başarıyla güncellendi" in data.get('message', ''):
                    self.log_result("Successful Password Change", True, f"Password changed successfully: {data.get('message')}")
                    return True
                else:
                    self.log_result("Successful Password Change", False, f"Got 200 but unexpected response: {data}")
                    return False
            else:
                self.log_result("Successful Password Change", False, f"Expected 200, got {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_result("Successful Password Change", False, f"Password change test error: {str(e)}")
            return False

    def test_verify_new_password_works(self):
        """Test 5: Verify new password works by logging in with it"""
        try:
            login_data = {
                "email": self.test_user_email,
                "password": "newpassword123"  # The new password we set
            }
            
            response = requests.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('token'):
                    self.log_result("Verify New Password", True, "Successfully logged in with new password")
                    return True
                else:
                    self.log_result("Verify New Password", False, f"Got 200 but no token: {data}")
                    return False
            else:
                self.log_result("Verify New Password", False, f"Login with new password failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("Verify New Password", False, f"New password verification error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Admin User Password Change Endpoint Tests")
        print("=" * 60)
        
        # Step 1: Admin login
        if not self.admin_login():
            print("❌ Cannot proceed without admin token")
            return False
            
        # Step 2: Create test user
        if not self.create_test_user():
            print("❌ Cannot proceed without test user")
            return False
        
        # Run all tests
        tests = [
            self.test_authentication_required,
            self.test_user_not_found,
            self.test_short_password,
            self.test_successful_password_change,
            self.test_verify_new_password_works
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            time.sleep(0.5)  # Small delay between tests
        
        # Print summary
        print("=" * 60)
        print(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Admin user password change endpoint is working correctly.")
        else:
            print(f"⚠️  {total - passed} test(s) failed. Please check the implementation.")
        
        return passed == total

def main():
    """Main function to run tests"""
    tester = AdminPasswordChangeTester()
    success = tester.run_all_tests()
    
    # Print detailed results
    print("\n" + "=" * 60)
    print("📋 DETAILED TEST RESULTS:")
    print("=" * 60)
    
    for result in tester.test_results:
        status = "✅" if result['success'] else "❌"
        print(f"{status} {result['test']}")
        print(f"   Message: {result['message']}")
        if result['details']:
            print(f"   Details: {result['details']}")
        print()
    
    return success

if __name__ == "__main__":
    main()