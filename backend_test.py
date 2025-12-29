#!/usr/bin/env python3

import requests
import json
import sys
import os

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://payment-gateway-244.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

def test_site_settings_api():
    """Test Site Settings API endpoints"""
    print("🧪 Testing Site Settings API Endpoints...")
    print(f"Base URL: {BASE_URL}")
    
    # Test data
    admin_credentials = {
        "username": "admin",
        "password": "admin123"
    }
    
    test_settings = {
        "siteName": "PreSatis",
        "metaTitle": "Dijital Platform Hizmetleri | PreSatis",
        "metaDescription": "PreSatis, dijital platformlara yönelik online hizmetler sunar.",
        "contactEmail": "presatis@presatis.com",
        "contactPhone": "555 555 55 55"
    }
    
    try:
        # 1. Admin Login to get token
        print("\n1️⃣ Testing Admin Login...")
        login_response = requests.post(f"{API_BASE}/admin/login", json=admin_credentials)
        print(f"Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"❌ Admin login failed: {login_response.text}")
            return False
            
        login_data = login_response.json()
        if not login_data.get('success'):
            print(f"❌ Admin login failed: {login_data}")
            return False
            
        admin_token = login_data['data']['token']
        print("✅ Admin login successful")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # 2. Test GET /api/admin/settings/site (Admin)
        print("\n2️⃣ Testing GET /api/admin/settings/site (Admin Auth Required)...")
        get_admin_response = requests.get(f"{API_BASE}/admin/settings/site", headers=headers)
        print(f"Status: {get_admin_response.status_code}")
        
        if get_admin_response.status_code != 200:
            print(f"❌ GET admin settings failed: {get_admin_response.text}")
            return False
            
        admin_data = get_admin_response.json()
        if not admin_data.get('success'):
            print(f"❌ GET admin settings failed: {admin_data}")
            return False
            
        settings_data = admin_data['data']
        required_fields = ['siteName', 'metaTitle', 'metaDescription', 'contactEmail', 'contactPhone', 'logo', 'favicon']
        
        for field in required_fields:
            if field not in settings_data:
                print(f"❌ Missing field in admin settings: {field}")
                return False
                
        print("✅ GET admin settings successful - all fields present")
        print(f"Current siteName: {settings_data.get('siteName')}")
        
        # 3. Test GET /api/admin/settings/site without auth (should 401)
        print("\n3️⃣ Testing GET /api/admin/settings/site without auth (should 401)...")
        no_auth_response = requests.get(f"{API_BASE}/admin/settings/site")
        print(f"Status: {no_auth_response.status_code}")
        
        if no_auth_response.status_code != 401:
            print(f"❌ Expected 401 but got {no_auth_response.status_code}")
            return False
            
        print("✅ Correctly rejected unauthorized access (401)")
        
        # 4. Test POST /api/admin/settings/site (Save Settings)
        print("\n4️⃣ Testing POST /api/admin/settings/site (Save Settings)...")
        save_response = requests.post(f"{API_BASE}/admin/settings/site", json=test_settings, headers=headers)
        print(f"Status: {save_response.status_code}")
        
        if save_response.status_code != 200:
            print(f"❌ Save settings failed: {save_response.text}")
            return False
            
        save_data = save_response.json()
        if not save_data.get('success'):
            print(f"❌ Save settings failed: {save_data}")
            return False
            
        print("✅ Settings saved successfully")
        print(f"Message: {save_data.get('message')}")
        
        # 5. Test validation - Empty siteName (should fail)
        print("\n5️⃣ Testing validation - Empty siteName (should fail)...")
        invalid_settings = test_settings.copy()
        invalid_settings['siteName'] = ""
        
        validation_response = requests.post(f"{API_BASE}/admin/settings/site", json=invalid_settings, headers=headers)
        print(f"Status: {validation_response.status_code}")
        
        if validation_response.status_code != 400:
            print(f"❌ Expected 400 for empty siteName but got {validation_response.status_code}")
            return False
            
        print("✅ Correctly rejected empty siteName (400)")
        
        # 6. Test validation - metaTitle > 70 chars (should fail)
        print("\n6️⃣ Testing validation - metaTitle > 70 chars (should fail)...")
        invalid_settings = test_settings.copy()
        invalid_settings['metaTitle'] = "A" * 71  # 71 characters
        
        validation_response = requests.post(f"{API_BASE}/admin/settings/site", json=invalid_settings, headers=headers)
        print(f"Status: {validation_response.status_code}")
        
        if validation_response.status_code != 400:
            print(f"❌ Expected 400 for long metaTitle but got {validation_response.status_code}")
            return False
            
        print("✅ Correctly rejected long metaTitle (400)")
        
        # 7. Test validation - metaDescription > 160 chars (should fail)
        print("\n7️⃣ Testing validation - metaDescription > 160 chars (should fail)...")
        invalid_settings = test_settings.copy()
        invalid_settings['metaDescription'] = "A" * 161  # 161 characters
        
        validation_response = requests.post(f"{API_BASE}/admin/settings/site", json=invalid_settings, headers=headers)
        print(f"Status: {validation_response.status_code}")
        
        if validation_response.status_code != 400:
            print(f"❌ Expected 400 for long metaDescription but got {validation_response.status_code}")
            return False
            
        print("✅ Correctly rejected long metaDescription (400)")
        
        # 8. Test validation - Invalid email format (should fail)
        print("\n8️⃣ Testing validation - Invalid email format (should fail)...")
        invalid_settings = test_settings.copy()
        invalid_settings['contactEmail'] = "invalid-email"
        
        validation_response = requests.post(f"{API_BASE}/admin/settings/site", json=invalid_settings, headers=headers)
        print(f"Status: {validation_response.status_code}")
        
        if validation_response.status_code != 400:
            print(f"❌ Expected 400 for invalid email but got {validation_response.status_code}")
            return False
            
        print("✅ Correctly rejected invalid email format (400)")
        
        # 9. Test GET /api/site/settings (Public - no auth required)
        print("\n9️⃣ Testing GET /api/site/settings (Public - no auth required)...")
        public_response = requests.get(f"{API_BASE}/site/settings")
        print(f"Status: {public_response.status_code}")
        
        if public_response.status_code != 200:
            print(f"❌ GET public settings failed: {public_response.text}")
            return False
            
        public_data = public_response.json()
        if not public_data.get('success'):
            print(f"❌ GET public settings failed: {public_data}")
            return False
            
        public_settings = public_data['data']
        public_required_fields = ['siteName', 'metaTitle', 'metaDescription', 'contactEmail', 'contactPhone', 'logo', 'favicon']
        
        for field in public_required_fields:
            if field not in public_settings:
                print(f"❌ Missing field in public settings: {field}")
                return False
                
        print("✅ GET public settings successful - all fields present")
        print(f"Public siteName: {public_settings.get('siteName')}")
        
        # 10. Test Settings Persistence - Save and retrieve again
        print("\n🔟 Testing Settings Persistence...")
        
        # Save specific test values
        persistence_settings = {
            "siteName": "PersistenceTest",
            "metaTitle": "Test Title for Persistence",
            "metaDescription": "Test description for persistence verification",
            "contactEmail": "test@persistence.com",
            "contactPhone": "123 456 78 90"
        }
        
        save_response = requests.post(f"{API_BASE}/admin/settings/site", json=persistence_settings, headers=headers)
        if save_response.status_code != 200:
            print(f"❌ Failed to save persistence test settings: {save_response.text}")
            return False
            
        # Retrieve and verify
        get_response = requests.get(f"{API_BASE}/admin/settings/site", headers=headers)
        if get_response.status_code != 200:
            print(f"❌ Failed to retrieve settings for persistence test: {get_response.text}")
            return False
            
        retrieved_data = get_response.json()['data']
        
        # Verify all values match
        for key, expected_value in persistence_settings.items():
            if retrieved_data.get(key) != expected_value:
                print(f"❌ Persistence failed for {key}: expected '{expected_value}', got '{retrieved_data.get(key)}'")
                return False
                
        print("✅ Settings persistence verified - all values match")
        
        # Also verify public endpoint returns same values
        public_response = requests.get(f"{API_BASE}/site/settings")
        if public_response.status_code == 200:
            public_data = public_response.json()['data']
            for key, expected_value in persistence_settings.items():
                if public_data.get(key) != expected_value:
                    print(f"❌ Public endpoint persistence failed for {key}: expected '{expected_value}', got '{public_data.get(key)}'")
                    return False
            print("✅ Public endpoint persistence verified")
        
        print("\n🎉 All Site Settings API tests passed!")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_site_settings_api()
    sys.exit(0 if success else 1)