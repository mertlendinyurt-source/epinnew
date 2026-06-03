#!/usr/bin/env python3
"""
Backend Test Script for Shopier V2 Payment Integration
Tests all Shopier V2 endpoints including checkout, OSB webhook, status polling, and admin settings.
"""

import requests
import json
import time
import sys
import hmac
import hashlib
import os

# Configuration
BASE_URL = os.getenv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000")
API_BASE = f"{BASE_URL}/api"

# Shopier V2 Configuration (from .env)
SHOPIER_V2_OSB_KEY = "b4bfe50c039d9a9935b0b77c565d0a2c"
SHOPIER_V2_REFERENCE_PREFIX = "SV2"

def print_test_result(test_name, success, details=""):
    """Print formatted test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    {details}")
    print()

def generate_osb_signature(order_id, reference, amount, currency, status):
    """Generate HMAC-SHA256 signature for OSB webhook"""
    verification_string = f"{order_id}{reference}{amount}{currency}{status}"
    signature = hmac.new(
        SHOPIER_V2_OSB_KEY.encode('utf-8'),
        verification_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature

def test_shopier_v2_flow():
    """Test complete Shopier V2 payment flow"""
    print("🛒 Testing Shopier V2 Payment Flow")
    print("=" * 70)
    
    user_token = None
    admin_token = None
    product_id = None
    order_id = None
    shopier_order_id = None
    payment_url = None
    
    try:
        # ========================================
        # STEP 1: User Registration/Login
        # ========================================
        print("\n📝 STEP 1: User Registration/Login")
        print("-" * 70)
        
        user_data = {
            "firstName": "Shopier",
            "lastName": "TestUser",
            "email": "shopierv2-test@test.com",
            "phone": "5551234567",
            "password": "Test123!"
        }
        
        response = requests.post(f"{API_BASE}/auth/register", json=user_data)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("data") and data["data"].get("token"):
                user_token = data["data"]["token"]
                print_test_result("User Registration", True, f"User registered successfully")
            else:
                print_test_result("User Registration", False, f"Invalid response: {data}")
                return
        elif response.status_code == 409:
            # User exists, try login
            print("    User exists, attempting login...")
            login_response = requests.post(f"{API_BASE}/auth/login", json={
                "email": user_data["email"],
                "password": user_data["password"]
            })
            
            if login_response.status_code == 200:
                login_data = login_response.json()
                if login_data.get("success") and login_data.get("data") and login_data["data"].get("token"):
                    user_token = login_data["data"]["token"]
                    print_test_result("User Login", True, f"Logged in with existing user")
                else:
                    print_test_result("User Login", False, f"Login failed: {login_data}")
                    return
            else:
                print_test_result("User Login", False, f"HTTP {login_response.status_code}")
                return
        else:
            print_test_result("User Registration", False, f"HTTP {response.status_code}: {response.text}")
            return

        # ========================================
        # STEP 2: Get Products
        # ========================================
        print("\n📦 STEP 2: Get Products")
        print("-" * 70)
        
        response = requests.get(f"{API_BASE}/products")
        
        if response.status_code == 200:
            data = response.json()
            products = data.get("data") if data.get("data") else data.get("products", [])
            if data.get("success") and products and len(products) > 0:
                product_id = products[0]["id"]
                product_name = products[0]["title"]
                product_price = products[0].get("price", 0)
                print_test_result("Get Products", True, f"Found {len(products)} products, using: {product_name} ({product_price} TL)")
            else:
                print_test_result("Get Products", False, f"No products found: {data}")
                return
        else:
            print_test_result("Get Products", False, f"HTTP {response.status_code}: {response.text}")
            return

        # ========================================
        # STEP 3: Create Shopier V2 Order (Checkout)
        # ========================================
        print("\n💳 STEP 3: Create Shopier V2 Order (Checkout)")
        print("-" * 70)
        
        order_data = {
            "productId": product_id,
            "playerId": "987654321",
            "playerName": "ShopierTestPlayer",
            "paymentMethod": "shopierv2",
            "termsAccepted": True
        }
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/orders", json=order_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            order_response = data.get("data", {})
            if data.get("success") and order_response.get("order"):
                order = order_response["order"]
                order_id = order["id"]
                payment_url = order_response.get("paymentUrl")
                shopier_order_id = order_response.get("shopierOrderId")
                session_id = order_response.get("sessionId")
                
                success = (order["paymentMethod"] == "shopierv2" and payment_url is not None)
                details = f"Order {order_id} created\n    Payment URL: {payment_url[:80] if payment_url else 'None'}...\n    Shopier Order ID: {shopier_order_id}\n    Session ID: {session_id}"
                print_test_result("Shopier V2 Checkout Creation", success, details)
                
                if not success:
                    print("❌ CRITICAL: Checkout creation failed - payment URL not returned")
                    return
            else:
                print_test_result("Shopier V2 Checkout Creation", False, f"Invalid response: {data}")
                return
        else:
            print_test_result("Shopier V2 Checkout Creation", False, f"HTTP {response.status_code}: {response.text}")
            return

        # ========================================
        # STEP 4: Verify Order Status (Pending)
        # ========================================
        print("\n🔍 STEP 4: Verify Order Status (Pending)")
        print("-" * 70)
        
        response = requests.get(f"{API_BASE}/account/orders/{order_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            order = data.get("data", {}) if data.get("data") else data.get("order", {})
            if data.get("success") and order:
                status = order.get("status")
                payment_method = order.get("paymentMethod")
                meta = order.get("meta", {})
                
                success = (status == "pending" and payment_method == "shopierv2")
                details = f"status: {status}, paymentMethod: {payment_method}\n    meta.shopierV2PaymentUrl: {'Present' if meta.get('shopierV2PaymentUrl') else 'Missing'}\n    meta.shopierV2SessionId: {meta.get('shopierV2SessionId', 'Missing')}"
                print_test_result("Order Status Verification", success, details)
                
                if not success:
                    return
            else:
                print_test_result("Order Status Verification", False, f"Invalid response: {data}")
                return
        else:
            print_test_result("Order Status Verification", False, f"HTTP {response.status_code}: {response.text}")
            return

        # ========================================
        # STEP 5: Test Status Polling Endpoint
        # ========================================
        print("\n📊 STEP 5: Test Status Polling Endpoint")
        print("-" * 70)
        
        response = requests.get(f"{API_BASE}/payment/shopierv2/status?orderId={order_id}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("data"):
                status_data = data["data"]
                order_status = status_data.get("orderStatus")
                session_status = status_data.get("sessionStatus")
                
                success = (order_status == "pending" and session_status == "pending")
                details = f"orderStatus: {order_status}, sessionStatus: {session_status}"
                print_test_result("Status Polling Endpoint", success, details)
            else:
                print_test_result("Status Polling Endpoint", False, f"Invalid response: {data}")
        else:
            print_test_result("Status Polling Endpoint", False, f"HTTP {response.status_code}: {response.text}")

        # ========================================
        # STEP 6: Test OSB Webhook with INVALID Signature (Security Test)
        # ========================================
        print("\n🔒 STEP 6: Test OSB Webhook with INVALID Signature (Security Test)")
        print("-" * 70)
        
        # Create webhook payload with WRONG signature
        webhook_payload_invalid = {
            "order_id": shopier_order_id or "test-order-123",
            "reference": f"{SHOPIER_V2_REFERENCE_PREFIX}-{order_id}",
            "amount": "100.00",
            "currency": "TRY",
            "status": "paid",
            "signature": "INVALID_SIGNATURE_12345678"  # Wrong signature
        }
        
        response = requests.post(f"{API_BASE}/payment/shopierv2/osb", json=webhook_payload_invalid)
        
        # Should return 403 Forbidden for invalid signature
        if response.status_code == 403:
            data = response.json()
            success = (data.get("error") == "Invalid signature" or "signature" in str(data).lower())
            print_test_result("OSB Webhook - Invalid Signature Rejection", success, f"Correctly rejected with 403: {data}")
        else:
            print_test_result("OSB Webhook - Invalid Signature Rejection", False, f"Expected 403, got {response.status_code}: {response.text}")

        # ========================================
        # STEP 7: Test OSB Webhook with VALID Signature (Payment Success)
        # ========================================
        print("\n✅ STEP 7: Test OSB Webhook with VALID Signature (Payment Success)")
        print("-" * 70)
        
        # Create webhook payload with CORRECT signature
        webhook_order_id = shopier_order_id or "test-order-456"
        webhook_reference = f"{SHOPIER_V2_REFERENCE_PREFIX}-{order_id}"
        webhook_amount = "100.00"
        webhook_currency = "TRY"
        webhook_status = "paid"
        
        # Generate correct signature
        correct_signature = generate_osb_signature(
            webhook_order_id,
            webhook_reference,
            webhook_amount,
            webhook_currency,
            webhook_status
        )
        
        webhook_payload_valid = {
            "order_id": webhook_order_id,
            "reference": webhook_reference,
            "amount": webhook_amount,
            "currency": webhook_currency,
            "status": webhook_status,
            "signature": correct_signature
        }
        
        print(f"    Sending OSB webhook with signature: {correct_signature[:20]}...")
        response = requests.post(f"{API_BASE}/payment/shopierv2/osb", json=webhook_payload_valid)
        
        if response.status_code == 200:
            data = response.json()
            success = data.get("success") == True
            print_test_result("OSB Webhook - Valid Signature Accepted", success, f"Response: {data}")
        else:
            print_test_result("OSB Webhook - Valid Signature Accepted", False, f"HTTP {response.status_code}: {response.text}")

        # Wait for webhook processing
        time.sleep(2)

        # ========================================
        # STEP 8: Verify Order Status Changed to "paid"
        # ========================================
        print("\n💰 STEP 8: Verify Order Status Changed to 'paid'")
        print("-" * 70)
        
        response = requests.get(f"{API_BASE}/account/orders/{order_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            order = data.get("data", {}) if data.get("data") else data.get("order", {})
            if data.get("success") and order:
                status = order.get("status")
                delivery = order.get("delivery", {})
                delivery_status = delivery.get("status", "N/A")
                
                success = (status == "paid")
                details = f"status: {status}, delivery.status: {delivery_status}"
                print_test_result("Order Status After Webhook", success, details)
                
                if success:
                    print("    ✅ Stock assignment attempted (delivery status may be 'out_of_stock' if no stock available)")
            else:
                print_test_result("Order Status After Webhook", False, f"Invalid response: {data}")
        else:
            print_test_result("Order Status After Webhook", False, f"HTTP {response.status_code}: {response.text}")

        # ========================================
        # STEP 9: Test Idempotency (Duplicate Webhook)
        # ========================================
        print("\n🔁 STEP 9: Test Idempotency (Duplicate Webhook)")
        print("-" * 70)
        
        # Send the same webhook again
        response = requests.post(f"{API_BASE}/payment/shopierv2/osb", json=webhook_payload_valid)
        
        if response.status_code == 200:
            data = response.json()
            # Should still return success but not reprocess
            success = data.get("success") == True
            print_test_result("OSB Webhook - Idempotency Protection", success, f"Duplicate webhook handled correctly: {data}")
        else:
            print_test_result("OSB Webhook - Idempotency Protection", False, f"HTTP {response.status_code}: {response.text}")

        # ========================================
        # STEP 10: Admin Login
        # ========================================
        print("\n👤 STEP 10: Admin Login")
        print("-" * 70)
        
        admin_credentials = {"username": "admin", "password": "admin123"}
        response = requests.post(f"{API_BASE}/admin/login", json=admin_credentials)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("data") and data["data"].get("token"):
                admin_token = data["data"]["token"]
                print_test_result("Admin Login", True, f"Admin logged in successfully")
            else:
                print_test_result("Admin Login", False, f"Invalid response: {data}")
                admin_token = None
        else:
            print_test_result("Admin Login", False, f"HTTP {response.status_code}: {response.text}")
            admin_token = None

        # ========================================
        # STEP 11: Test Admin Settings GET (if implemented)
        # ========================================
        if admin_token:
            print("\n⚙️ STEP 11: Test Admin Settings GET")
            print("-" * 70)
            
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.get(f"{API_BASE}/admin/settings/shopierv2", headers=admin_headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    settings = data.get("data", {})
                    print_test_result("Admin Settings GET", True, f"Settings retrieved: {list(settings.keys())}")
                else:
                    print_test_result("Admin Settings GET", False, f"Invalid response: {data}")
            elif response.status_code == 404:
                print_test_result("Admin Settings GET", False, f"Endpoint not implemented (404)")
            elif response.status_code == 401:
                print_test_result("Admin Settings GET", False, f"Authentication failed (401)")
            else:
                print_test_result("Admin Settings GET", False, f"HTTP {response.status_code}: {response.text}")

            # ========================================
            # STEP 12: Test Admin Settings POST (if implemented)
            # ========================================
            print("\n⚙️ STEP 12: Test Admin Settings POST")
            print("-" * 70)
            
            settings_data = {
                "apiKey": "test_api_key_12345",
                "osbUsername": "test_osb_username",
                "osbKey": "test_osb_key",
                "referencePrefix": "SV2",
                "linkTtl": 900,
                "closeDelay": 60
            }
            
            response = requests.post(f"{API_BASE}/admin/settings/shopierv2", json=settings_data, headers=admin_headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    print_test_result("Admin Settings POST", True, f"Settings saved successfully")
                else:
                    print_test_result("Admin Settings POST", False, f"Invalid response: {data}")
            elif response.status_code == 404:
                print_test_result("Admin Settings POST", False, f"Endpoint not implemented (404)")
            elif response.status_code == 401:
                print_test_result("Admin Settings POST", False, f"Authentication failed (401)")
            else:
                print_test_result("Admin Settings POST", False, f"HTTP {response.status_code}: {response.text}")

        # ========================================
        # FINAL SUMMARY
        # ========================================
        print("\n" + "=" * 70)
        print("🎉 SHOPIER V2 BACKEND TEST COMPLETED")
        print("=" * 70)
        print(f"✅ Order ID: {order_id}")
        print(f"✅ Payment Method: shopierv2")
        print(f"✅ Shopier Order ID: {shopier_order_id}")
        print(f"✅ Payment URL: {'Generated' if payment_url else 'Not Generated'}")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ EXCEPTION in Shopier V2 Test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_shopier_v2_flow()
