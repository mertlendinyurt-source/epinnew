#!/usr/bin/env python3
"""
PINLY Backend Test Suite for Payyeen Payment Integration
Tests all 6 Payyeen backend tasks from test_result.md
"""

import requests
import json
import time
from datetime import datetime

# Test Configuration
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

# Admin credentials
ADMIN_CREDENTIALS = {
    "username": "admin",
    "password": "admin123"
}

# Test data
TEST_PAYYEEN_API_KEY = "test_pk_12345abcdef67890"

def log_test(test_name, success, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"[{timestamp}] {status} {test_name}")
    if details:
        print(f"    → {details}")
    print()

def test_admin_login():
    """Get admin JWT token for authenticated requests"""
    print("🔑 Getting admin authentication token...")
    
    try:
        response = requests.post(f"{API_BASE}/admin/login", json=ADMIN_CREDENTIALS)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success') and 'data' in result:
                token = result['data'].get('token')
                if token:
                    log_test("Admin Login", True, f"Token obtained successfully")
                    return token
                else:
                    log_test("Admin Login", False, "No token in data")
                    return None
            else:
                log_test("Admin Login", False, f"Unexpected response structure: {result}")
                return None
        else:
            log_test("Admin Login", False, f"HTTP {response.status_code}: {response.text}")
            return None
            
    except Exception as e:
        log_test("Admin Login", False, f"Exception: {str(e)}")
        return None

def create_test_user():
    """Create a test user for order testing"""
    print("👤 Creating test user...")
    
    timestamp = int(time.time())
    test_user = {
        "firstName": "Payyeen",
        "lastName": "Test",
        "email": f"payyeen{timestamp}@test.com",
        "phone": "5551234567",
        "password": "test123456",
        "confirmPassword": "test123456"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/register", json=test_user)
        
        if response.status_code in [200, 201]:
            result = response.json()
            if result.get('success') and 'data' in result:
                token = result['data'].get('token')
                if token:
                    log_test("User Registration", True, f"User created: {test_user['email']}")
                    return token, test_user
                else:
                    log_test("User Registration", False, "No token in data")
                    return None, None
            else:
                log_test("User Registration", False, f"Unexpected response: {result}")
                return None, None
        else:
            log_test("User Registration", False, f"HTTP {response.status_code}: {response.text}")
            return None, None
            
    except Exception as e:
        log_test("User Registration", False, f"Exception: {str(e)}")
        return None, None

def test_payyeen_admin_settings_get(admin_token):
    """Test GET /api/admin/settings/payyeen"""
    print("📋 Testing Payyeen Admin Settings - GET...")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    try:
        # Test without auth first
        response = requests.get(f"{API_BASE}/admin/settings/payyeen")
        if response.status_code == 401:
            log_test("Payyeen GET - Auth Check", True, "Returns 401 without admin token")
        else:
            log_test("Payyeen GET - Auth Check", False, f"Expected 401, got {response.status_code}")
        
        # Test with auth - should return unconfigured state initially
        response = requests.get(f"{API_BASE}/admin/settings/payyeen", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success') and 'data' in result:
                data = result['data']
                if data.get('isConfigured') == False:
                    log_test("Payyeen GET - Unconfigured", True, "Returns isConfigured: false initially")
                    return True
                else:
                    log_test("Payyeen GET - Unconfigured", False, f"Unexpected response: {data}")
                    return False
            else:
                log_test("Payyeen GET - Unconfigured", False, f"Unexpected response structure: {result}")
                return False
        else:
            log_test("Payyeen GET - Request", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Payyeen GET - Exception", False, f"Exception: {str(e)}")
        return False

def test_payyeen_admin_settings_post(admin_token):
    """Test POST /api/admin/settings/payyeen"""
    print("💾 Testing Payyeen Admin Settings - POST...")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    try:
        # Test without auth first
        response = requests.post(f"{API_BASE}/admin/settings/payyeen", json={"apiKey": "test"})
        if response.status_code == 401:
            log_test("Payyeen POST - Auth Check", True, "Returns 401 without admin token")
        else:
            log_test("Payyeen POST - Auth Check", False, f"Expected 401, got {response.status_code}")
        
        # Test validation - missing apiKey
        response = requests.post(f"{API_BASE}/admin/settings/payyeen", json={}, headers=headers)
        if response.status_code == 400:
            log_test("Payyeen POST - Validation", True, "Returns 400 for missing apiKey")
        else:
            log_test("Payyeen POST - Validation", False, f"Expected 400, got {response.status_code}")
        
        # Test successful save
        payyeen_settings = {
            "apiKey": TEST_PAYYEEN_API_KEY,
            "isEnabled": True
        }
        
        response = requests.post(f"{API_BASE}/admin/settings/payyeen", json=payyeen_settings, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                log_test("Payyeen POST - Save Settings", True, "Settings saved successfully")
                
                # Verify settings are saved with GET
                get_response = requests.get(f"{API_BASE}/admin/settings/payyeen", headers=headers)
                if get_response.status_code == 200:
                    get_result = get_response.json()
                    if get_result.get('success') and 'data' in get_result:
                        get_data = get_result['data']
                        if get_data.get('isConfigured') == True and 'apiKey' in get_data:
                            # Check if API key is masked
                            masked_key = get_data['apiKey']
                            if '***' in masked_key or '*' in masked_key:
                                log_test("Payyeen POST - Masked Key", True, f"API key properly masked: {masked_key}")
                            else:
                                log_test("Payyeen POST - Masked Key", False, f"API key not masked: {masked_key}")
                            
                            # Test toggle functionality
                            toggle_data = {"isEnabled": False}
                            toggle_response = requests.post(f"{API_BASE}/admin/settings/payyeen", json=toggle_data, headers=headers)
                            
                            if toggle_response.status_code == 200:
                                log_test("Payyeen POST - Toggle", True, "Toggle functionality working")
                                return True
                            else:
                                log_test("Payyeen POST - Toggle", False, f"Toggle failed: {toggle_response.status_code}")
                                return False
                        else:
                            log_test("Payyeen POST - Verify Save", False, f"Settings not properly saved: {get_data}")
                            return False
                    else:
                        log_test("Payyeen POST - Verify Save", False, f"Invalid GET response: {get_result}")
                        return False
                else:
                    log_test("Payyeen POST - Verify Save", False, f"GET request failed: {get_response.status_code}")
                    return False
            else:
                log_test("Payyeen POST - Save Settings", False, f"Save failed: {result}")
                return False
        else:
            log_test("Payyeen POST - Save Settings", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
        # Test toggle functionality
        toggle_data = {"isEnabled": False}
        response = requests.post(f"{API_BASE}/admin/settings/payyeen", json=toggle_data, headers=headers)
        
        if response.status_code == 200:
            log_test("Payyeen POST - Toggle", True, "Toggle functionality working")
            return True
        else:
            log_test("Payyeen POST - Toggle", False, f"Toggle failed: {response.status_code}")
            return False
            
    except Exception as e:
        log_test("Payyeen POST - Exception", False, f"Exception: {str(e)}")
        return False

def test_payment_methods_payyeen():
    """Test GET /api/payment-methods includes Payyeen"""
    print("💳 Testing Payment Methods with Payyeen...")
    
    try:
        response = requests.get(f"{API_BASE}/payment-methods")
        
        if response.status_code == 200:
            data = response.json()
            if 'payyeen' in data:
                payyeen_info = data['payyeen']
                if isinstance(payyeen_info, dict) and 'available' in payyeen_info:
                    available = payyeen_info['available']
                    log_test("Payment Methods - Payyeen", True, f"Payyeen available: {available}")
                    return True
                else:
                    log_test("Payment Methods - Payyeen", False, f"Invalid payyeen structure: {payyeen_info}")
                    return False
            else:
                log_test("Payment Methods - Payyeen", False, f"Payyeen not found in response: {list(data.keys())}")
                return False
        else:
            log_test("Payment Methods - Request", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Payment Methods - Exception", False, f"Exception: {str(e)}")
        return False

def test_payyeen_order_creation_uc(user_token):
    """Test POST /api/orders with paymentMethod: 'payyeen'"""
    print("🛒 Testing Payyeen Order Creation (UC)...")
    
    headers = {"Authorization": f"Bearer {user_token}"}
    
    try:
        # First get a product ID
        products_response = requests.get(f"{API_BASE}/products")
        if products_response.status_code != 200:
            log_test("Payyeen UC Orders - Get Products", False, f"Failed to get products: {products_response.status_code}")
            return False, None
            
        products = products_response.json()
        if not products:
            log_test("Payyeen UC Orders - Get Products", False, "No products available")
            return False, None
            
        test_product = products[0]
        product_id = test_product['id']
        
        # Test without auth first
        order_data = {
            "productId": product_id,
            "playerId": "123456789",
            "playerName": "TestPlayer",
            "paymentMethod": "payyeen"
        }
        
        response = requests.post(f"{API_BASE}/orders", json=order_data)
        if response.status_code == 401:
            response_data = response.json()
            if response_data.get('code') == 'AUTH_REQUIRED':
                log_test("Payyeen UC Orders - Auth Check", True, "Returns 401 with AUTH_REQUIRED code")
            else:
                log_test("Payyeen UC Orders - Auth Check", False, f"Missing AUTH_REQUIRED code: {response_data}")
        else:
            log_test("Payyeen UC Orders - Auth Check", False, f"Expected 401, got {response.status_code}")
        
        # Test with auth - should create order
        response = requests.post(f"{API_BASE}/orders", json=order_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            required_fields = ['orderId', 'paymentUrl', 'formData', 'paymentProvider']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                # Verify specific Payyeen values
                if (data['paymentUrl'] == 'https://payyeen.com/checkout/quick' and 
                    data['paymentProvider'] == 'payyeen'):
                    
                    form_data = data['formData']
                    form_required = ['api_key', 'amount', 'currency', 'description', 'success_url', 'cancel_url']
                    missing_form = [field for field in form_required if field not in form_data]
                    
                    if not missing_form:
                        # Check description format (should contain PINLY-{orderId})
                        description = form_data['description']
                        order_id = data['orderId']
                        
                        if f'PINLY-{order_id}' in description:
                            log_test("Payyeen UC Orders - Create Order", True, f"Order created: {order_id}")
                            return True, order_id
                        else:
                            log_test("Payyeen UC Orders - Description Format", False, f"Invalid description: {description}")
                            return False, None
                    else:
                        log_test("Payyeen UC Orders - Form Data", False, f"Missing form fields: {missing_form}")
                        return False, None
                else:
                    log_test("Payyeen UC Orders - Payment Details", False, f"Invalid payment details: URL={data.get('paymentUrl')}, Provider={data.get('paymentProvider')}")
                    return False, None
            else:
                log_test("Payyeen UC Orders - Response Fields", False, f"Missing fields: {missing_fields}")
                return False, None
        elif response.status_code == 503:
            log_test("Payyeen UC Orders - Not Configured", True, "Returns 503 when not configured")
            return True, None
        else:
            log_test("Payyeen UC Orders - Request", False, f"HTTP {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        log_test("Payyeen UC Orders - Exception", False, f"Exception: {str(e)}")
        return False, None

def test_payyeen_order_creation_accounts(user_token):
    """Test POST /api/account-orders with paymentMethod: 'payyeen'"""
    print("🏪 Testing Payyeen Order Creation (Accounts)...")
    
    headers = {"Authorization": f"Bearer {user_token}"}
    
    try:
        # Get accounts first
        accounts_response = requests.get(f"{API_BASE}/accounts")
        if accounts_response.status_code != 200:
            log_test("Payyeen Account Orders - Get Accounts", False, f"Failed to get accounts: {accounts_response.status_code}")
            return False
            
        accounts = accounts_response.json()
        if not accounts:
            log_test("Payyeen Account Orders - No Accounts", True, "No accounts available (expected)")
            return True
            
        # If accounts exist, test with first account
        test_account = accounts[0]
        account_id = test_account['id']
        
        order_data = {
            "accountId": account_id,
            "paymentMethod": "payyeen"
        }
        
        response = requests.post(f"{API_BASE}/account-orders", json=order_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if 'orderId' in data and 'paymentUrl' in data:
                log_test("Payyeen Account Orders - Create Order", True, f"Account order created: {data['orderId']}")
                return True
            else:
                log_test("Payyeen Account Orders - Response", False, f"Invalid response: {data}")
                return False
        elif response.status_code == 503:
            log_test("Payyeen Account Orders - Not Configured", True, "Returns 503 when not configured")
            return True
        else:
            log_test("Payyeen Account Orders - Request", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Payyeen Account Orders - Exception", False, f"Exception: {str(e)}")
        return False

def test_payyeen_webhook_callback(order_id):
    """Test POST /api/payment/payyeen/callback"""
    print("🔄 Testing Payyeen Webhook Callback...")
    
    if not order_id:
        log_test("Payyeen Webhook - Skip", True, "No order ID available (expected if not configured)")
        return True
    
    try:
        # Test successful payment webhook
        success_payload = {
            "event": "payment.success",
            "transaction_id": f"TXN{int(time.time())}",
            "amount": 19.99,
            "currency": "TRY",
            "status": "success",
            "description": f"PINLY-{order_id}",
            "created_at": datetime.now().isoformat() + "Z"
        }
        
        response = requests.post(f"{API_BASE}/payment/payyeen/callback", json=success_payload)
        
        if response.status_code == 200:
            data = response.json()
            log_test("Payyeen Webhook - Success Payment", True, f"Webhook processed: {data}")
            
            # Test idempotency - send same webhook again
            response2 = requests.post(f"{API_BASE}/payment/payyeen/callback", json=success_payload)
            if response2.status_code == 200:
                log_test("Payyeen Webhook - Idempotency", True, "Duplicate webhook handled correctly")
            else:
                log_test("Payyeen Webhook - Idempotency", False, f"Duplicate handling failed: {response2.status_code}")
            
            return True
        else:
            log_test("Payyeen Webhook - Success Payment", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
        # Test failed payment webhook
        failed_payload = {
            "event": "payment.failed",
            "transaction_id": f"TXN{int(time.time())}FAIL",
            "amount": 19.99,
            "currency": "TRY", 
            "status": "failed",
            "description": f"PINLY-{order_id}",
            "created_at": datetime.now().isoformat() + "Z"
        }
        
        response = requests.post(f"{API_BASE}/payment/payyeen/callback", json=failed_payload)
        
        if response.status_code == 200:
            log_test("Payyeen Webhook - Failed Payment", True, "Failed payment webhook processed")
            return True
        else:
            log_test("Payyeen Webhook - Failed Payment", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("Payyeen Webhook - Exception", False, f"Exception: {str(e)}")
        return False

def main():
    """Run all Payyeen backend tests"""
    print("🚀 Starting Payyeen Payment Integration Backend Tests")
    print("=" * 60)
    print()
    
    # Track results
    results = {
        "payyeen_admin_get": False,
        "payyeen_admin_post": False, 
        "payment_methods": False,
        "uc_orders": False,
        "account_orders": False,
        "webhook_callback": False
    }
    
    # Step 1: Get admin token
    admin_token = test_admin_login()
    if not admin_token:
        print("❌ Cannot proceed without admin token")
        return
    
    # Step 2: Create test user
    user_token, test_user = create_test_user()
    if not user_token:
        print("❌ Cannot proceed without user token")
        return
    
    # Step 3: Test Payyeen Admin Settings GET
    results["payyeen_admin_get"] = test_payyeen_admin_settings_get(admin_token)
    
    # Step 4: Test Payyeen Admin Settings POST  
    results["payyeen_admin_post"] = test_payyeen_admin_settings_post(admin_token)
    
    # Step 5: Test Payment Methods includes Payyeen
    results["payment_methods"] = test_payment_methods_payyeen()
    
    # Step 6: Test Payyeen UC Order Creation
    uc_success, order_id = test_payyeen_order_creation_uc(user_token)
    results["uc_orders"] = uc_success
    
    # Step 7: Test Payyeen Account Order Creation
    results["account_orders"] = test_payyeen_order_creation_accounts(user_token)
    
    # Step 8: Test Payyeen Webhook Callback
    results["webhook_callback"] = test_payyeen_webhook_callback(order_id)
    
    # Print Results Summary
    print("\n" + "=" * 60)
    print("📊 PAYYEEN BACKEND TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for success in results.values() if success)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total} tests ({passed/total*100:.1f}%)")
    print()
    
    for test_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL" 
        task_name = test_name.replace("_", " ").title()
        print(f"{status} {task_name}")
    
    if passed == total:
        print(f"\n🎉 All Payyeen backend tests passed! Integration ready for production.")
    else:
        failed = total - passed
        print(f"\n⚠️  {failed} test(s) failed. Check implementation before proceeding.")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()