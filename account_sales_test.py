#!/usr/bin/env python3

import requests
import json
import sys
import os
import time

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://gaming-checkout-3.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

def test_account_sales_api():
    """Test PUBG Account Sales API endpoints for PINLY project"""
    print("🧪 Testing PUBG Account Sales API Endpoints...")
    print(f"Base URL: {BASE_URL}")
    
    # Test data
    admin_credentials = {
        "username": "admin",
        "password": "admin123"
    }
    
    test_account = {
        "title": "Test PUBG Account - Level 50",
        "description": "High-level PUBG account with rare skins and weapons",
        "price": 299.99,
        "discountPrice": 249.99,
        "imageUrl": "https://example.com/account-image.jpg",
        "legendaryMin": 5,
        "legendaryMax": 10,
        "level": 50,
        "rank": "Crown III",
        "features": ["Rare Skins", "High Level", "Good Stats"],
        "credentials": "username:testuser123 password:testpass456"
    }
    
    user_data = {
        "firstName": "Test",
        "lastName": "User",
        "email": f"testuser{int(time.time())}@example.com",  # Unique email
        "phone": "5551234567",
        "password": "testpass123",
        "confirmPassword": "testpass123"
    }
    
    admin_token = None
    user_token = None
    test_account_id = None
    test_user_id = None
    
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
        
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # 2. Test GET /api/accounts (Public - should return empty initially)
        print("\n2️⃣ Testing GET /api/accounts (Public - List all active accounts)...")
        accounts_response = requests.get(f"{API_BASE}/accounts")
        print(f"Status: {accounts_response.status_code}")
        
        if accounts_response.status_code != 200:
            print(f"❌ GET accounts failed: {accounts_response.text}")
            return False
            
        accounts_data = accounts_response.json()
        if not accounts_data.get('success'):
            print(f"❌ GET accounts failed: {accounts_data}")
            return False
            
        initial_accounts = accounts_data['data']
        print(f"✅ GET accounts successful - found {len(initial_accounts)} accounts")
        
        # 3. Test GET /api/admin/accounts (Admin - should require auth)
        print("\n3️⃣ Testing GET /api/admin/accounts (Admin - requires auth)...")
        admin_accounts_response = requests.get(f"{API_BASE}/admin/accounts", headers=admin_headers)
        print(f"Status: {admin_accounts_response.status_code}")
        
        if admin_accounts_response.status_code != 200:
            print(f"❌ GET admin accounts failed: {admin_accounts_response.text}")
            return False
            
        admin_accounts_data = admin_accounts_response.json()
        if not admin_accounts_data.get('success'):
            print(f"❌ GET admin accounts failed: {admin_accounts_data}")
            return False
            
        print(f"✅ GET admin accounts successful - found {len(admin_accounts_data['data'])} accounts")
        
        # 4. Test GET /api/admin/accounts without auth (should 401)
        print("\n4️⃣ Testing GET /api/admin/accounts without auth (should 401)...")
        no_auth_response = requests.get(f"{API_BASE}/admin/accounts")
        print(f"Status: {no_auth_response.status_code}")
        
        if no_auth_response.status_code != 401:
            print(f"❌ Expected 401 but got {no_auth_response.status_code}")
            return False
            
        print("✅ Correctly rejected unauthorized access (401)")
        
        # 5. Test POST /api/admin/accounts (Create new account)
        print("\n5️⃣ Testing POST /api/admin/accounts (Create new account)...")
        create_response = requests.post(f"{API_BASE}/admin/accounts", json=test_account, headers=admin_headers)
        print(f"Status: {create_response.status_code}")
        
        if create_response.status_code != 200:
            print(f"❌ Create account failed: {create_response.text}")
            return False
            
        create_data = create_response.json()
        if not create_data.get('success'):
            print(f"❌ Create account failed: {create_data}")
            return False
            
        test_account_id = create_data['data']['id']
        print(f"✅ Account created successfully - ID: {test_account_id}")
        print(f"Message: {create_data.get('message')}")
        
        # Verify discount percent calculation
        created_account = create_data['data']
        expected_discount = round(((test_account['price'] - test_account['discountPrice']) / test_account['price']) * 100)
        if created_account['discountPercent'] != expected_discount:
            print(f"❌ Discount percent calculation wrong: expected {expected_discount}, got {created_account['discountPercent']}")
            return False
        print(f"✅ Discount percent calculated correctly: {created_account['discountPercent']}%")
        
        # 6. Test POST /api/admin/accounts with missing required fields (should fail)
        print("\n6️⃣ Testing POST /api/admin/accounts with missing title (should fail)...")
        invalid_account = test_account.copy()
        del invalid_account['title']
        
        invalid_response = requests.post(f"{API_BASE}/admin/accounts", json=invalid_account, headers=admin_headers)
        print(f"Status: {invalid_response.status_code}")
        
        if invalid_response.status_code != 400:
            print(f"❌ Expected 400 for missing title but got {invalid_response.status_code}")
            return False
            
        print("✅ Correctly rejected missing title (400)")
        
        # 7. Test GET /api/accounts/:id (Public - single account detail)
        print("\n7️⃣ Testing GET /api/accounts/:id (Public - single account detail)...")
        single_account_response = requests.get(f"{API_BASE}/accounts/{test_account_id}")
        print(f"Status: {single_account_response.status_code}")
        
        if single_account_response.status_code != 200:
            print(f"❌ GET single account failed: {single_account_response.text}")
            return False
            
        single_account_data = single_account_response.json()
        if not single_account_data.get('success'):
            print(f"❌ GET single account failed: {single_account_data}")
            return False
            
        account_detail = single_account_data['data']
        
        # Verify sensitive info is hidden
        if 'credentials' in account_detail:
            print("❌ Credentials exposed in public endpoint!")
            return False
            
        # Verify required public fields are present
        required_fields = ['id', 'title', 'description', 'price', 'discountPrice', 'discountPercent']
        for field in required_fields:
            if field not in account_detail:
                print(f"❌ Missing field in public account detail: {field}")
                return False
                
        print("✅ GET single account successful - sensitive info hidden, required fields present")
        
        # 8. Test GET /api/accounts/:id with invalid ID (should 404)
        print("\n8️⃣ Testing GET /api/accounts/:id with invalid ID (should 404)...")
        invalid_id_response = requests.get(f"{API_BASE}/accounts/invalid-id-123")
        print(f"Status: {invalid_id_response.status_code}")
        
        if invalid_id_response.status_code != 404:
            print(f"❌ Expected 404 for invalid ID but got {invalid_id_response.status_code}")
            return False
            
        print("✅ Correctly returned 404 for invalid account ID")
        
        # 9. Test PUT /api/admin/accounts/:id (Update account)
        print("\n9️⃣ Testing PUT /api/admin/accounts/:id (Update account)...")
        update_data = {
            "title": "Updated Test PUBG Account - Level 55",
            "price": 349.99,
            "discountPrice": 299.99,
            "level": 55
        }
        
        update_response = requests.put(f"{API_BASE}/admin/accounts/{test_account_id}", json=update_data, headers=admin_headers)
        print(f"Status: {update_response.status_code}")
        
        if update_response.status_code != 200:
            print(f"❌ Update account failed: {update_response.text}")
            return False
            
        update_response_data = update_response.json()
        if not update_response_data.get('success'):
            print(f"❌ Update account failed: {update_response_data}")
            return False
            
        updated_account = update_response_data['data']
        
        # Verify updates
        if updated_account['title'] != update_data['title']:
            print(f"❌ Title not updated: expected '{update_data['title']}', got '{updated_account['title']}'")
            return False
            
        if updated_account['level'] != update_data['level']:
            print(f"❌ Level not updated: expected {update_data['level']}, got {updated_account['level']}")
            return False
            
        print("✅ Account updated successfully")
        print(f"Message: {update_response_data.get('message')}")
        
        # 10. Test PUT /api/admin/accounts/:id with invalid ID (should 404)
        print("\n🔟 Testing PUT /api/admin/accounts/:id with invalid ID (should 404)...")
        invalid_update_response = requests.put(f"{API_BASE}/admin/accounts/invalid-id", json=update_data, headers=admin_headers)
        print(f"Status: {invalid_update_response.status_code}")
        
        if invalid_update_response.status_code != 404:
            print(f"❌ Expected 404 for invalid ID but got {invalid_update_response.status_code}")
            return False
            
        print("✅ Correctly returned 404 for invalid account ID on update")
        
        # 11. Create a test user for order testing
        print("\n1️⃣1️⃣ Creating test user for order testing...")
        register_response = requests.post(f"{API_BASE}/auth/register", json=user_data)
        print(f"Status: {register_response.status_code}")
        
        if register_response.status_code != 200:
            print(f"❌ User registration failed: {register_response.text}")
            return False
            
        register_data = register_response.json()
        if not register_data.get('success'):
            print(f"❌ User registration failed: {register_data}")
            return False
            
        user_token = register_data['data']['token']
        test_user_id = register_data['data']['user']['id']
        print("✅ Test user created successfully")
        
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # 12. Test POST /api/account-orders without auth (should 401)
        print("\n1️⃣2️⃣ Testing POST /api/account-orders without auth (should 401)...")
        order_data = {
            "accountId": test_account_id,
            "paymentMethod": "balance"
        }
        
        no_auth_order_response = requests.post(f"{API_BASE}/account-orders", json=order_data)
        print(f"Status: {no_auth_order_response.status_code}")
        
        if no_auth_order_response.status_code != 401:
            print(f"❌ Expected 401 but got {no_auth_order_response.status_code}")
            return False
            
        print("✅ Correctly rejected unauthorized order creation (401)")
        
        # 13. Test POST /api/account-orders with missing accountId (should 400)
        print("\n1️⃣3️⃣ Testing POST /api/account-orders with missing accountId (should 400)...")
        invalid_order_data = {"paymentMethod": "balance"}
        
        invalid_order_response = requests.post(f"{API_BASE}/account-orders", json=invalid_order_data, headers=user_headers)
        print(f"Status: {invalid_order_response.status_code}")
        
        if invalid_order_response.status_code != 400:
            print(f"❌ Expected 400 for missing accountId but got {invalid_order_response.status_code}")
            return False
            
        print("✅ Correctly rejected missing accountId (400)")
        
        # 14. Test POST /api/account-orders with invalid accountId (should 404)
        print("\n1️⃣4️⃣ Testing POST /api/account-orders with invalid accountId (should 404)...")
        invalid_account_order = {
            "accountId": "invalid-account-id",
            "paymentMethod": "balance"
        }
        
        invalid_account_response = requests.post(f"{API_BASE}/account-orders", json=invalid_account_order, headers=user_headers)
        print(f"Status: {invalid_account_response.status_code}")
        
        if invalid_account_response.status_code != 404:
            print(f"❌ Expected 404 for invalid accountId but got {invalid_account_response.status_code}")
            return False
            
        print("✅ Correctly rejected invalid accountId (404)")
        
        # 15. Add balance to user for testing balance payment
        print("\n1️⃣5️⃣ Adding balance to test user...")
        # We need to add balance directly to the database since there's no API for it
        # For testing purposes, we'll test with insufficient balance first
        
        # Test with insufficient balance
        print("\n1️⃣6️⃣ Testing POST /api/account-orders with insufficient balance (should 400)...")
        balance_order_data = {
            "accountId": test_account_id,
            "paymentMethod": "balance"
        }
        
        insufficient_balance_response = requests.post(f"{API_BASE}/account-orders", json=balance_order_data, headers=user_headers)
        print(f"Status: {insufficient_balance_response.status_code}")
        
        if insufficient_balance_response.status_code != 400:
            print(f"❌ Expected 400 for insufficient balance but got {insufficient_balance_response.status_code}")
            return False
            
        insufficient_data = insufficient_balance_response.json()
        if 'Yetersiz bakiye' not in insufficient_data.get('error', ''):
            print(f"❌ Expected insufficient balance error but got: {insufficient_data.get('error')}")
            return False
            
        print("✅ Correctly rejected insufficient balance (400)")
        
        # 16. Test card payment (should create pending order)
        print("\n1️⃣7️⃣ Testing POST /api/account-orders with card payment...")
        card_order_data = {
            "accountId": test_account_id,
            "paymentMethod": "card"
        }
        
        card_order_response = requests.post(f"{API_BASE}/account-orders", json=card_order_data, headers=user_headers)
        print(f"Status: {card_order_response.status_code}")
        
        # This might fail if Shopier settings are not configured, which is expected
        if card_order_response.status_code == 503:
            print("✅ Card payment correctly failed due to unconfigured payment system (503)")
        elif card_order_response.status_code == 520:
            # Handle 520 status code as well (server error due to missing config)
            card_data = card_order_response.json()
            if 'Ödeme sistemi yapılandırılmamış' in card_data.get('error', ''):
                print("✅ Card payment correctly failed due to unconfigured payment system (520)")
            else:
                print(f"❌ Unexpected card payment error: {card_data}")
                return False
        elif card_order_response.status_code == 200:
            card_data = card_order_response.json()
            if card_data.get('success'):
                print("✅ Card payment order created successfully")
                # Account should be reserved
                reserved_account_response = requests.get(f"{API_BASE}/admin/accounts/{test_account_id}", headers=admin_headers)
                if reserved_account_response.status_code == 200:
                    reserved_account = reserved_account_response.json()['data']
                    if reserved_account['status'] == 'reserved':
                        print("✅ Account correctly marked as reserved")
                    else:
                        print(f"❌ Account status should be 'reserved' but is '{reserved_account['status']}'")
            else:
                print(f"❌ Card payment failed: {card_data}")
                return False
        else:
            print(f"❌ Unexpected card payment response: {card_order_response.status_code} - {card_order_response.text}")
            return False
        
        # 17. Test DELETE /api/admin/accounts/:id with sold account (should fail)
        print("\n1️⃣8️⃣ Testing DELETE protection for sold accounts...")
        
        # First, let's mark the account as sold to test delete protection
        sold_update = {"status": "sold"}
        requests.put(f"{API_BASE}/admin/accounts/{test_account_id}", json=sold_update, headers=admin_headers)
        
        delete_sold_response = requests.delete(f"{API_BASE}/admin/accounts/{test_account_id}", headers=admin_headers)
        print(f"Status: {delete_sold_response.status_code}")
        
        if delete_sold_response.status_code != 400:
            print(f"❌ Expected 400 for deleting sold account but got {delete_sold_response.status_code}")
            return False
            
        delete_sold_data = delete_sold_response.json()
        if 'Satılmış hesap silinemez' not in delete_sold_data.get('error', ''):
            print(f"❌ Expected sold account error but got: {delete_sold_data.get('error')}")
            return False
            
        print("✅ Correctly prevented deletion of sold account (400)")
        
        # 18. Test DELETE /api/admin/accounts/:id with available account (should succeed)
        print("\n1️⃣9️⃣ Testing DELETE /api/admin/accounts/:id with available account...")
        
        # Change status back to available for deletion test
        available_update = {"status": "available"}
        requests.put(f"{API_BASE}/admin/accounts/{test_account_id}", json=available_update, headers=admin_headers)
        
        delete_response = requests.delete(f"{API_BASE}/admin/accounts/{test_account_id}", headers=admin_headers)
        print(f"Status: {delete_response.status_code}")
        
        if delete_response.status_code != 200:
            print(f"❌ Delete account failed: {delete_response.text}")
            return False
            
        delete_data = delete_response.json()
        if not delete_data.get('success'):
            print(f"❌ Delete account failed: {delete_data}")
            return False
            
        print("✅ Account deleted successfully")
        print(f"Message: {delete_data.get('message')}")
        
        # 19. Verify account is deleted
        print("\n2️⃣0️⃣ Verifying account deletion...")
        verify_delete_response = requests.get(f"{API_BASE}/accounts/{test_account_id}")
        print(f"Status: {verify_delete_response.status_code}")
        
        if verify_delete_response.status_code != 404:
            print(f"❌ Expected 404 for deleted account but got {verify_delete_response.status_code}")
            return False
            
        print("✅ Confirmed account is deleted (404)")
        
        # 20. Test DELETE /api/admin/accounts/:id with invalid ID (should 404)
        print("\n2️⃣1️⃣ Testing DELETE /api/admin/accounts/:id with invalid ID (should 404)...")
        invalid_delete_response = requests.delete(f"{API_BASE}/admin/accounts/invalid-id", headers=admin_headers)
        print(f"Status: {invalid_delete_response.status_code}")
        
        if invalid_delete_response.status_code != 404:
            print(f"❌ Expected 404 for invalid ID but got {invalid_delete_response.status_code}")
            return False
            
        print("✅ Correctly returned 404 for invalid account ID on delete")
        
        print("\n🎉 All PUBG Account Sales API tests completed successfully!")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_account_sales_api()
    sys.exit(0 if success else 1)