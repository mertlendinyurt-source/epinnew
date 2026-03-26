#!/usr/bin/env python3
"""
Backend Test Script for IBAN Payment Flow
Tests the complete IBAN payment flow from user registration to admin approval.
"""

import requests
import json
import time
import sys

# Configuration
BASE_URL = "https://world-store-en.preview."
API_BASE = f"{BASE_URL}/api"

def print_test_result(test_name, success, details=""):
    """Print formatted test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    {details}")
    print()

def test_iban_payment_flow():
    """Test complete IBAN payment flow"""
    print("🏦 Testing IBAN Payment Flow")
    print("=" * 50)
    
    # Test data
    user_data = {
        "firstName": "Test",
        "lastName": "User",
        "email": "test-iban@test.com",
        "phone": "5551234567",
        "password": "Test123!"
    }
    
    user_token = None
    admin_token = None
    product_id = None
    order_id = None
    
    try:
        # Step 1: User Registration
        print("Step 1: Testing user registration...")
        response = requests.post(f"{API_BASE}/auth/register", json=user_data)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("data") and data["data"].get("token"):
                user_token = data["data"]["token"]
                print_test_result("User Registration", True, f"User registered successfully with token")
            else:
                print_test_result("User Registration", False, f"Invalid response: {data}")
                return
        else:
            # Check if email already exists (409)
            if response.status_code == 409:
                # Try to login with existing user
                print("    Email exists, trying to login...")
                login_response = requests.post(f"{API_BASE}/auth/login", json={
                    "email": user_data["email"],
                    "password": user_data["password"]
                })
                
                if login_response.status_code == 200:
                    login_data = login_response.json()
                    if login_data.get("success") and login_data.get("data") and login_data["data"].get("token"):
                        user_token = login_data["data"]["token"]
                        print_test_result("User Registration (Login)", True, f"Logged in with existing user")
                    else:
                        print_test_result("User Registration", False, f"Login failed: {login_data}")
                        return
                else:
                    print_test_result("User Registration", False, f"Login failed with status {login_response.status_code}")
                    return
            else:
                print_test_result("User Registration", False, f"HTTP {response.status_code}: {response.text}")
                return

        # Step 2: Get Products
        print("Step 2: Testing get products...")
        response = requests.get(f"{API_BASE}/products")
        
        if response.status_code == 200:
            data = response.json()
            products = data.get("data") if data.get("data") else data.get("products", [])
            if data.get("success") and products and len(products) > 0:
                product_id = products[0]["id"]
                product_name = products[0]["title"]
                print_test_result("Get Products", True, f"Found {len(products)} products, using: {product_name}")
            else:
                print_test_result("Get Products", False, f"No products found: {data}")
                return
        else:
            print_test_result("Get Products", False, f"HTTP {response.status_code}: {response.text}")
            return

        # Step 3: Create IBAN Order
        print("Step 3: Testing IBAN order creation...")
        order_data = {
            "productId": product_id,
            "playerId": "123456789",
            "playerName": "TestPlayer",
            "paymentMethod": "iban",
            "termsAccepted": True
        }
        
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/orders", json=order_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            order_data = data.get("data", {})
            if data.get("success") and order_data.get("orderId"):
                order_id = order_data["orderId"]
                payment_provider = order_data.get("paymentProvider", "")
                print_test_result("IBAN Order Creation", True, f"Order {order_id} created with paymentProvider: {payment_provider}")
            else:
                print_test_result("IBAN Order Creation", False, f"Invalid response: {data}")
                return
        else:
            print_test_result("IBAN Order Creation", False, f"HTTP {response.status_code}: {response.text}")
            return

        # Step 4: Verify Order Status
        print("Step 4: Verifying order status...")
        response = requests.get(f"{API_BASE}/account/orders/{order_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            order = data.get("data", {}) if data.get("data") else data.get("order", {})
            if data.get("success") and order:
                payment_method = order.get("paymentMethod")
                status = order.get("status")
                iban_payment = order.get("ibanPayment", {})
                
                success = (payment_method == "iban" and status == "pending")
                details = f"paymentMethod: {payment_method}, status: {status}, ibanPayment: {iban_payment}"
                print_test_result("Order Status Verification", success, details)
                
                if not success:
                    return
            else:
                print_test_result("Order Status Verification", False, f"Invalid response: {data}")
                return
        else:
            print_test_result("Order Status Verification", False, f"HTTP {response.status_code}: {response.text}")
            return

        # Step 5: IBAN Payment Notification
        print("Step 5: Testing IBAN payment notification...")
        notify_data = {
            "senderName": "Test Kullanici"
        }
        
        response = requests.post(f"{API_BASE}/orders/{order_id}/iban-notify", json=notify_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_test_result("IBAN Payment Notification", True, f"Payment notification sent successfully")
            else:
                print_test_result("IBAN Payment Notification", False, f"Invalid response: {data}")
                return
        else:
            print_test_result("IBAN Payment Notification", False, f"HTTP {response.status_code}: {response.text}")
            return

        # Step 6: Verify IBAN Status Changed to "notified"
        print("Step 6: Verifying IBAN status changed to 'notified'...")
        response = requests.get(f"{API_BASE}/account/orders/{order_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            order = data.get("data", {}) if data.get("data") else data.get("order", {})
            if data.get("success") and order:
                iban_payment = order.get("ibanPayment", {})
                iban_status = iban_payment.get("status")
                sender_name = iban_payment.get("senderName")
                
                success = (iban_status == "notified")
                details = f"ibanPayment.status: {iban_status}, senderName: {sender_name}"
                print_test_result("IBAN Status Verification", success, details)
                
                if not success:
                    return
            else:
                print_test_result("IBAN Status Verification", False, f"Invalid response: {data}")
                return
        else:
            print_test_result("IBAN Status Verification", False, f"HTTP {response.status_code}: {response.text}")
            return

        # Step 7: Admin Login
        print("Step 7: Testing admin login...")
        admin_credentials = [
            {"username": "admin", "password": "admin123"},
            {"email": "admin@pinly.com.tr", "password": "admin123"},
            {"email": "admin", "password": "admin123"},
        ]
        
        admin_login_success = False
        for creds in admin_credentials:
            response = requests.post(f"{API_BASE}/admin/login", json=creds)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("data") and data["data"].get("token"):
                    admin_token = data["data"]["token"]
                    admin_login_success = True
                    print_test_result("Admin Login", True, f"Admin logged in successfully with: {creds.get('username') or creds.get('email')}")
                    break
        
        if not admin_login_success:
            print_test_result("Admin Login", False, f"All admin login attempts failed")
            print("    Note: This is OK if admin user is not configured. Testing stops at step 6.")
            return

        # Step 8: Admin Approve IBAN Payment
        print("Step 8: Testing admin IBAN approval...")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{API_BASE}/admin/orders/{order_id}/approve-iban", headers=admin_headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print_test_result("Admin IBAN Approval", True, f"IBAN payment approved successfully")
            else:
                print_test_result("Admin IBAN Approval", False, f"Invalid response: {data}")
                return
        else:
            print_test_result("Admin IBAN Approval", False, f"HTTP {response.status_code}: {response.text}")
            return

        # Step 9: Verify Order Status Changed to "paid"
        print("Step 9: Verifying order status changed to 'paid'...")
        response = requests.get(f"{API_BASE}/account/orders/{order_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            order = data.get("data", {}) if data.get("data") else data.get("order", {})
            if data.get("success") and order:
                status = order.get("status")
                iban_payment = order.get("ibanPayment", {})
                iban_status = iban_payment.get("status")
                delivery = order.get("delivery", {})
                
                success = (status == "paid" and iban_status == "approved")
                details = f"status: {status}, ibanPayment.status: {iban_status}, delivery: {delivery}"
                print_test_result("Final Order Status Verification", success, details)
                
                if success:
                    print("🎉 IBAN Payment Flow Test COMPLETED SUCCESSFULLY!")
                    print(f"✅ Order ID: {order_id}")
                    print(f"✅ Payment Method: iban")
                    print(f"✅ Order Status: {status}")
                    print(f"✅ IBAN Status: {iban_status}")
                else:
                    print("❌ IBAN Payment Flow Test FAILED at final verification")
            else:
                print_test_result("Final Order Status Verification", False, f"Invalid response: {data}")
        else:
            print_test_result("Final Order Status Verification", False, f"HTTP {response.status_code}: {response.text}")

    except Exception as e:
        print(f"❌ EXCEPTION in IBAN Payment Flow Test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_iban_payment_flow()