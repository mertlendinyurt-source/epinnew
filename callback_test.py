#!/usr/bin/env python3
"""
Callback Security Tests - Focused test for callback validation
"""

import requests
import json
import time
import hashlib
from datetime import datetime

BASE_URL = "https://user-auth-update-5.preview.emergentagent.com/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
TEST_SHOPIER_API_SECRET = "test_secret_abcdef"

admin_token = None
test_product_id = None

def print_test_header(test_name):
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_result(success, message):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")

def generate_shopier_hash(order_id, amount, secret):
    data = f"{order_id}{amount}{secret}"
    return hashlib.sha256(data.encode()).hexdigest()

# Login and get product
def setup():
    global admin_token, test_product_id
    
    # Login
    response = requests.post(
        f"{BASE_URL}/admin/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=10
    )
    if response.status_code == 200:
        admin_token = response.json()['data']['token']
        print("✅ Admin login successful")
    else:
        print("❌ Admin login failed")
        return False
    
    # Save correct Shopier settings (in case they were overwritten)
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "merchantId": "test_merchant_12345",
        "apiKey": "test_api_key_67890",
        "apiSecret": TEST_SHOPIER_API_SECRET,
        "mode": "production"
    }
    response = requests.post(
        f"{BASE_URL}/admin/settings/payments",
        json=payload,
        headers=headers,
        timeout=10
    )
    if response.status_code == 200:
        print("✅ Shopier settings configured")
    else:
        print("❌ Failed to configure Shopier settings")
        return False
    
    # Get products
    response = requests.get(f"{BASE_URL}/products", timeout=10)
    if response.status_code == 200:
        products = response.json()['data']
        test_product_id = products[0]['id']
        print(f"✅ Got product: {products[0]['title']}")
    else:
        print("❌ Failed to get products")
        return False
    
    return True

# TEST: Callback with Correct Hash
def test_callback_correct_hash():
    print_test_header("Callback with Correct Hash Validation")
    
    try:
        # Create order
        order_response = requests.post(
            f"{BASE_URL}/orders",
            json={"productId": test_product_id, "playerId": "7777777777", "playerName": "CallbackTest#7777"},
            timeout=10
        )
        
        if order_response.status_code != 200:
            print_result(False, f"Failed to create order: {order_response.status_code} - {order_response.text}")
            return False
        
        order = order_response.json()['data']['order']
        order_id = order['id']
        amount = order['amount']
        
        print(f"   Created order: {order_id}, amount: {amount}")
        
        # Generate correct hash
        correct_hash = generate_shopier_hash(order_id, amount, TEST_SHOPIER_API_SECRET)
        print(f"   Generated hash: {correct_hash}")
        
        # Send callback
        callback_payload = {
            "orderId": order_id,
            "platform_order_id": order_id,
            "status": "success",
            "transactionId": f"TXN_CORRECT_{int(time.time())}",
            "payment_id": f"PAY_CORRECT_{int(time.time())}",
            "random_nr": "abc123",
            "total_order_value": str(amount),
            "hash": correct_hash
        }
        
        response = requests.post(
            f"{BASE_URL}/payment/shopier/callback",
            json=callback_payload,
            timeout=10
        )
        
        print(f"   Callback response: {response.status_code}")
        print(f"   Response body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print_result(True, "Callback with correct hash accepted")
                
                # Verify order status
                from pymongo import MongoClient
                client = MongoClient("mongodb://localhost:27017")
                db = client['pubg_uc_store']
                updated_order = db.orders.find_one({"id": order_id})
                
                if updated_order['status'] == 'paid':
                    print_result(True, "Order status updated to 'paid'")
                    return True
                else:
                    print_result(False, f"Order status: {updated_order['status']}")
                    return False
            else:
                print_result(False, f"Callback failed: {data}")
                return False
        else:
            print_result(False, f"Callback failed with status {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Test error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# TEST: Callback with Incorrect Hash
def test_callback_incorrect_hash():
    print_test_header("Callback with Incorrect Hash (Should Reject)")
    
    try:
        # Create order
        order_response = requests.post(
            f"{BASE_URL}/orders",
            json={"productId": test_product_id, "playerId": "8888888888", "playerName": "WrongHashTest#8888"},
            timeout=10
        )
        
        if order_response.status_code != 200:
            print_result(False, f"Failed to create order: {order_response.text}")
            return False
        
        order = order_response.json()['data']['order']
        order_id = order['id']
        
        # Send callback with WRONG hash
        wrong_hash = "0000000000000000000000000000000000000000000000000000000000000000"
        
        callback_payload = {
            "orderId": order_id,
            "platform_order_id": order_id,
            "status": "success",
            "transactionId": f"TXN_WRONG_{int(time.time())}",
            "hash": wrong_hash
        }
        
        response = requests.post(
            f"{BASE_URL}/payment/shopier/callback",
            json=callback_payload,
            timeout=10
        )
        
        print(f"   Callback response: {response.status_code}")
        print(f"   Response body: {response.text}")
        
        if response.status_code == 403:
            print_result(True, "Callback with incorrect hash rejected (403)")
            
            # Check security log
            from pymongo import MongoClient
            client = MongoClient("mongodb://localhost:27017")
            db = client['pubg_uc_store']
            security_log = db.payment_security_logs.find_one({"orderId": order_id, "event": "hash_mismatch"})
            
            if security_log:
                print_result(True, "Security log created for hash mismatch")
                return True
            else:
                print_result(False, "Security log NOT created")
                return False
        else:
            print_result(False, f"Should return 403, got {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Test error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# TEST: Immutable Status Transitions
def test_immutable_status_transitions():
    print_test_header("Immutable Status Transitions (FAILED → PAID Rejected)")
    
    try:
        # Create order
        order_response = requests.post(
            f"{BASE_URL}/orders",
            json={"productId": test_product_id, "playerId": "9999999999", "playerName": "ImmutableTest#9999"},
            timeout=10
        )
        
        if order_response.status_code != 200:
            print_result(False, f"Failed to create order: {order_response.text}")
            return False
        
        order = order_response.json()['data']['order']
        order_id = order['id']
        amount = order['amount']
        
        # First: Set to FAILED
        hash1 = generate_shopier_hash(order_id, amount, TEST_SHOPIER_API_SECRET)
        callback1 = {
            "orderId": order_id,
            "platform_order_id": order_id,
            "status": "failed",
            "transactionId": f"TXN_FAIL_{int(time.time())}",
            "hash": hash1
        }
        
        response1 = requests.post(f"{BASE_URL}/payment/shopier/callback", json=callback1, timeout=10)
        if response1.status_code != 200:
            print_result(False, f"Failed to set order to FAILED: {response1.text}")
            return False
        
        print_result(True, "Order set to FAILED")
        
        # Second: Try FAILED → PAID (should be rejected)
        hash2 = generate_shopier_hash(order_id, amount, TEST_SHOPIER_API_SECRET)
        callback2 = {
            "orderId": order_id,
            "platform_order_id": order_id,
            "status": "success",
            "transactionId": f"TXN_SUCCESS_{int(time.time())}",
            "hash": hash2
        }
        
        response2 = requests.post(f"{BASE_URL}/payment/shopier/callback", json=callback2, timeout=10)
        
        print(f"   Second callback response: {response2.status_code}")
        print(f"   Response body: {response2.text}")
        
        if response2.status_code == 400:
            print_result(True, "FAILED → PAID transition rejected (400)")
            
            # Verify order still FAILED
            from pymongo import MongoClient
            client = MongoClient("mongodb://localhost:27017")
            db = client['pubg_uc_store']
            final_order = db.orders.find_one({"id": order_id})
            
            if final_order['status'] == 'failed':
                print_result(True, "Order status remains 'failed' (immutable)")
                return True
            else:
                print_result(False, f"Order status changed to: {final_order['status']}")
                return False
        else:
            print_result(False, f"Should return 400, got {response2.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Test error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# Main
if __name__ == "__main__":
    print("\n" + "="*80)
    print("CALLBACK SECURITY TESTS")
    print("="*80)
    
    if not setup():
        print("Setup failed!")
        exit(1)
    
    results = {}
    results["Callback Correct Hash"] = test_callback_correct_hash()
    results["Callback Incorrect Hash"] = test_callback_incorrect_hash()
    results["Immutable Status Transitions"] = test_immutable_status_transitions()
    
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    print(f"\nTOTAL: {passed}/{total} tests passed")
    print("="*80)
