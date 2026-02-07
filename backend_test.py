#!/usr/bin/env python3
"""
Backend API Testing Script for DELETE /api/admin/users/{userId} endpoint
Tests user deletion functionality according to the review request
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://code-marketplace-12.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials
ADMIN_CREDENTIALS = {
    "username": "admin",
    "password": "admin123"
}

# Test user data
TEST_USER_DATA = {
    "email": f"test_delete_user_{uuid.uuid4().hex[:8]}@example.com",
    "password": "testpass123",
    "firstName": "Delete",
    "lastName": "TestUser",
    "phone": "5551234567"
}

class UserDeletionTester:
    def __init__(self):
        self.admin_token = None
        self.test_user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
        print()

    def setup_authentication(self):
        """Setup admin authentication"""
        print("=== SETTING UP ADMIN AUTHENTICATION ===")
        
        try:
            response = requests.post(f"{API_BASE}/admin/login", json=ADMIN_CREDENTIALS)
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get('data', {}).get('token')
                self.log_result("Admin Login", True, "Admin authentication successful")
                return True
            else:
                self.log_result("Admin Login", False, f"Admin login failed: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Admin Login", False, f"Admin login error: {str(e)}")
            return False

    def create_test_user(self):
        """Create a test user for deletion testing"""
        print("=== CREATING TEST USER ===")
        
        try:
            response = requests.post(f"{API_BASE}/auth/register", json=TEST_USER_DATA)
            if response.status_code in [200, 201]:
                data = response.json()
                if data.get('success') and 'data' in data and 'user' in data['data']:
                    self.test_user_id = data['data']['user']['id']
                    self.log_result("Create Test User", True, f"Test user created successfully", f"User ID: {self.test_user_id}")
                    return True
                else:
                    self.log_result("Create Test User", False, "Invalid response structure", str(data))
                    return False
            else:
                self.log_result("Create Test User", False, f"User registration failed: {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_result("Create Test User", False, f"User creation error: {str(e)}")
            return False

    def test_delete_user_without_token(self):
        """Test DELETE /api/admin/users/{userId} without admin token (should return 401)"""
        print("=== TESTING DELETE USER WITHOUT TOKEN ===")
        
        if not self.test_user_id:
            self.log_result("DELETE User (No Auth)", False, "No test user ID available")
            return False
        
        try:
            response = requests.delete(f"{API_BASE}/admin/users/{self.test_user_id}")
            
            if response.status_code == 401:
                data = response.json()
                if data.get('error') == 'Yetkisiz erişim':
                    self.log_result(
                        "DELETE User (No Auth)",
                        True,
                        "Correctly returned 401 with Turkish error message",
                        f"Error: {data.get('error')}"
                    )
                    return True
                else:
                    self.log_result(
                        "DELETE User (No Auth)", 
                        False, 
                        "Got 401 but wrong error message",
                        str(data)
                    )
            else:
                self.log_result(
                    "DELETE User (No Auth)",
                    False,
                    f"Expected 401, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("DELETE User (No Auth)", False, f"Request error: {str(e)}")
        
        return False

    def test_delete_nonexistent_user(self):
        """Test DELETE /api/admin/users/{userId} with non-existent user (should return 404)"""
        print("=== TESTING DELETE NON-EXISTENT USER ===")
        
        if not self.admin_token:
            self.log_result("DELETE Non-existent User", False, "No admin token available")
            return False
        
        try:
            fake_user_id = f"nonexistent_{uuid.uuid4().hex[:8]}"
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.delete(f"{API_BASE}/admin/users/{fake_user_id}", headers=headers)
            
            if response.status_code == 404:
                data = response.json()
                if data.get('error') == 'Kullanıcı bulunamadı':
                    self.log_result(
                        "DELETE Non-existent User",
                        True,
                        "Correctly returned 404 with Turkish error message",
                        f"Error: {data.get('error')}"
                    )
                    return True
                else:
                    self.log_result(
                        "DELETE Non-existent User",
                        False,
                        "Got 404 but wrong error message",
                        str(data)
                    )
            else:
                self.log_result(
                    "DELETE Non-existent User",
                    False,
                    f"Expected 404, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("DELETE Non-existent User", False, f"Request error: {str(e)}")
        
        return False

    def test_delete_user_successfully(self):
        """Test DELETE /api/admin/users/{userId} with valid user (should return 200)"""
        print("=== TESTING DELETE USER SUCCESSFULLY ===")
        
        if not self.admin_token:
            self.log_result("DELETE User (Success)", False, "No admin token available")
            return False
        
        if not self.test_user_id:
            self.log_result("DELETE User (Success)", False, "No test user ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.delete(f"{API_BASE}/admin/users/{self.test_user_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('message') == 'Kullanıcı hesabı başarıyla silindi':
                    self.log_result(
                        "DELETE User (Success)",
                        True,
                        "User deleted successfully with correct Turkish message",
                        f"Message: {data.get('message')}"
                    )
                    return True
                else:
                    self.log_result(
                        "DELETE User (Success)",
                        False,
                        "Got 200 but unexpected response structure",
                        str(data)
                    )
            else:
                self.log_result(
                    "DELETE User (Success)",
                    False,
                    f"Expected 200, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("DELETE User (Success)", False, f"Request error: {str(e)}")
        
        return False

    def test_verify_user_deleted(self):
        """Test to verify the user no longer exists after deletion"""
        print("=== VERIFYING USER IS DELETED ===")
        
        if not self.admin_token:
            self.log_result("Verify User Deleted", False, "No admin token available")
            return False
        
        if not self.test_user_id:
            self.log_result("Verify User Deleted", False, "No test user ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            # Try to get the deleted user (should fail)
            response = requests.delete(f"{API_BASE}/admin/users/{self.test_user_id}", headers=headers)
            
            if response.status_code == 404:
                data = response.json()
                if data.get('error') == 'Kullanıcı bulunamadı':
                    self.log_result(
                        "Verify User Deleted",
                        True,
                        "User successfully deleted - no longer exists in database",
                        f"Error: {data.get('error')}"
                    )
                    return True
                else:
                    self.log_result(
                        "Verify User Deleted",
                        False,
                        "Got 404 but wrong error message",
                        str(data)
                    )
            else:
                self.log_result(
                    "Verify User Deleted",
                    False,
                    f"Expected 404 for deleted user, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Verify User Deleted", False, f"Request error: {str(e)}")
        
        return False

    def test_try_login_with_deleted_user(self):
        """Test that deleted user cannot login"""
        print("=== TESTING LOGIN WITH DELETED USER ===")
        
        try:
            login_data = {
                "email": TEST_USER_DATA["email"],
                "password": TEST_USER_DATA["password"]
            }
            response = requests.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code == 401:
                self.log_result(
                    "Login with Deleted User",
                    True,
                    "Deleted user cannot login (401 response)",
                    "User credentials no longer valid"
                )
                return True
            else:
                self.log_result(
                    "Login with Deleted User",
                    False,
                    f"Expected 401, got {response.status_code}",
                    response.text
                )
        except Exception as e:
            self.log_result("Login with Deleted User", False, f"Request error: {str(e)}")
        
        return False

    def run_all_tests(self):
        """Run all user deletion tests"""
        print("🚀 STARTING DELETE USER ENDPOINT TESTS")
        print("=" * 60)
        
        # Setup
        if not self.setup_authentication():
            print("❌ Authentication setup failed. Aborting tests.")
            return
        
        # Create test user
        if not self.create_test_user():
            print("❌ Test user creation failed. Aborting tests.")
            return
        
        # Test cases as specified in the review request
        test_methods = [
            self.test_delete_user_without_token,
            self.test_delete_nonexistent_user,
            self.test_delete_user_successfully,
            self.test_verify_user_deleted,
            self.test_try_login_with_deleted_user
        ]
        
        # Run tests
        for test_method in test_methods:
            try:
                test_method()
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                self.log_result(test_method.__name__, False, f"Test execution error: {str(e)}")
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n🎯 DELETE USER ENDPOINT TEST COMPLETED")

if __name__ == "__main__":
    tester = UserDeletionTester()
    tester.run_all_tests()