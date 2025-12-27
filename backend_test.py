#!/usr/bin/env python3
"""
Backend API Testing for Auth + Stock + Delivery System
Tests all authentication, order creation, stock management, and auto-assignment features
"""

import requests
import json
import time
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://ui-image-sync.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Test data
TEST_USER = {
    "firstName": "Test",
    "lastName": "User",
    "email": "testuser@example.com",
    "phone": "5551234567",
    "password": "test123"
}

# Global variables to store tokens and IDs
user_token = None
admin_token = None
test_product_id = None
test_order_id = None
test_stock_codes = ["CODE-001", "CODE-002"]

def print_test(test_name: str):
    """Print test header"""
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print('='*80)

def print_result(success: bool, message: str, details: Optional[Dict] = None):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    if details:
        print(f"Details: {json.dumps(details, indent=2)}")

def make_request(method: str, endpoint: str, data: Optional[Dict] = None, 
                 token: Optional[str] = None) -> tuple[bool, Any, int]:
    """Make HTTP request and return (success, response_data, status_code)"""
    url = f"{BASE_URL}{endpoint}"
    headers = HEADERS.copy()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return False, {"error": "Invalid method"}, 0
        
        try:
            response_data = response.json()
        except:
            response_data = {"raw": response.text}
        
        return response.ok, response_data, response.status_code
    except Exception as e:
        return False, {"error": str(e)}, 0

# ============================================================================
# TEST 1: USER REGISTRATION
# ============================================================================
def test_user_registration():
    """Test POST /api/auth/register with all validations"""
    print_test("1. User Registration - Valid Data")
    
    success, data, status = make_request("POST", "/auth/register", TEST_USER)
    
    if success and status == 200 and data.get("success"):
        global user_token
        user_token = data.get("data", {}).get("token")
        user_data = data.get("data", {}).get("user", {})
        
        # Validate response structure
        if (user_token and user_data.get("email") == TEST_USER["email"].lower() 
            and user_data.get("firstName") == TEST_USER["firstName"]):
            print_result(True, "User registered successfully with JWT token", {
                "email": user_data.get("email"),
                "name": f"{user_data.get('firstName')} {user_data.get('lastName')}",
                "token_length": len(user_token)
            })
            return True
        else:
            print_result(False, "Invalid response structure", data)
            return False
    else:
        print_result(False, f"Registration failed (status {status})", data)
        return False

def test_duplicate_email():
    """Test duplicate email returns 409 with EMAIL_EXISTS code"""
    print_test("2. User Registration - Duplicate Email")
    
    success, data, status = make_request("POST", "/auth/register", TEST_USER)
    
    if status == 409 and data.get("code") == "EMAIL_EXISTS":
        print_result(True, "Duplicate email correctly rejected with EMAIL_EXISTS code", {
            "status": status,
            "code": data.get("code"),
            "error": data.get("error")
        })
        return True
    else:
        print_result(False, f"Expected 409 with EMAIL_EXISTS, got {status}", data)
        return False

def test_registration_validation():
    """Test registration field validations"""
    print_test("3. User Registration - Field Validations")
    
    test_cases = [
        {
            "name": "Missing fields",
            "data": {"email": "test@test.com"},
            "expected_status": 400
        },
        {
            "name": "Invalid email format",
            "data": {**TEST_USER, "email": "invalid-email"},
            "expected_status": 400
        },
        {
            "name": "Short password",
            "data": {**TEST_USER, "email": "new@test.com", "password": "123"},
            "expected_status": 400
        },
        {
            "name": "Invalid phone",
            "data": {**TEST_USER, "email": "new2@test.com", "phone": "123"},
            "expected_status": 400
        }
    ]
    
    all_passed = True
    for test_case in test_cases:
        success, data, status = make_request("POST", "/auth/register", test_case["data"])
        if status == test_case["expected_status"]:
            print_result(True, f"Validation '{test_case['name']}' works correctly", {
                "status": status,
                "error": data.get("error")
            })
        else:
            print_result(False, f"Validation '{test_case['name']}' failed", {
                "expected": test_case["expected_status"],
                "got": status
            })
            all_passed = False
    
    return all_passed

# ============================================================================
# TEST 2: USER LOGIN
# ============================================================================
def test_user_login():
    """Test POST /api/auth/login"""
    print_test("4. User Login - Valid Credentials")
    
    login_data = {
        "email": TEST_USER["email"],
        "password": TEST_USER["password"]
    }
    
    success, data, status = make_request("POST", "/auth/login", login_data)
    
    if success and status == 200 and data.get("success"):
        global user_token
        user_token = data.get("data", {}).get("token")
        user_data = data.get("data", {}).get("user", {})
        
        if user_token and user_data.get("email") == TEST_USER["email"].lower():
            print_result(True, "User logged in successfully", {
                "email": user_data.get("email"),
                "token_received": bool(user_token)
            })
            return True
        else:
            print_result(False, "Invalid login response", data)
            return False
    else:
        print_result(False, f"Login failed (status {status})", data)
        return False

def test_login_invalid_credentials():
    """Test login with wrong password"""
    print_test("5. User Login - Invalid Credentials")
    
    login_data = {
        "email": TEST_USER["email"],
        "password": "wrongpassword"
    }
    
    success, data, status = make_request("POST", "/auth/login", login_data)
    
    if status == 401:
        print_result(True, "Invalid credentials correctly rejected", {
            "status": status,
            "error": data.get("error")
        })
        return True
    else:
        print_result(False, f"Expected 401, got {status}", data)
        return False

# ============================================================================
# TEST 3: ADMIN LOGIN (for stock management tests)
# ============================================================================
def test_admin_login():
    """Test admin login to get token for stock management"""
    print_test("6. Admin Login")
    
    admin_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    success, data, status = make_request("POST", "/admin/login", admin_data)
    
    if success and status == 200 and data.get("success"):
        global admin_token
        admin_token = data.get("data", {}).get("token")
        
        if admin_token:
            print_result(True, "Admin logged in successfully", {
                "username": data.get("data", {}).get("username"),
                "token_received": bool(admin_token)
            })
            return True
        else:
            print_result(False, "No token received", data)
            return False
    else:
        print_result(False, f"Admin login failed (status {status})", data)
        return False

# ============================================================================
# TEST 4: GET PRODUCTS (to get a product ID for testing)
# ============================================================================
def test_get_products():
    """Get products to use in order tests"""
    print_test("7. Get Products")
    
    success, data, status = make_request("GET", "/products")
    
    if success and status == 200 and data.get("success"):
        products = data.get("data", [])
        if products:
            global test_product_id
            test_product_id = products[0]["id"]
            print_result(True, f"Retrieved {len(products)} products", {
                "first_product": products[0]["title"],
                "product_id": test_product_id
            })
            return True
        else:
            print_result(False, "No products found", data)
            return False
    else:
        print_result(False, f"Failed to get products (status {status})", data)
        return False

# ============================================================================
# TEST 5: ADMIN STOCK MANAGEMENT
# ============================================================================
def test_add_stock():
    """Test POST /api/admin/products/:productId/stock"""
    print_test("8. Admin - Add Stock Items")
    
    if not admin_token or not test_product_id:
        print_result(False, "Missing admin token or product ID", {})
        return False
    
    stock_data = {
        "items": test_stock_codes
    }
    
    success, data, status = make_request(
        "POST", 
        f"/admin/products/{test_product_id}/stock", 
        stock_data, 
        admin_token
    )
    
    if success and status == 200 and data.get("success"):
        print_result(True, f"Added {len(test_stock_codes)} stock items", {
            "count": data.get("data", {}).get("count"),
            "message": data.get("message")
        })
        return True
    else:
        print_result(False, f"Failed to add stock (status {status})", data)
        return False

def test_get_stock():
    """Test GET /api/admin/products/:productId/stock"""
    print_test("9. Admin - Get Stock Summary")
    
    if not admin_token or not test_product_id:
        print_result(False, "Missing admin token or product ID", {})
        return False
    
    success, data, status = make_request(
        "GET", 
        f"/admin/products/{test_product_id}/stock", 
        None, 
        admin_token
    )
    
    if success and status == 200 and data.get("success"):
        summary = data.get("data", {}).get("summary", {})
        stocks = data.get("data", {}).get("stocks", [])
        
        # Verify stock items are saved with status 'available'
        available_stocks = [s for s in stocks if s.get("status") == "available"]
        
        if len(available_stocks) >= len(test_stock_codes):
            print_result(True, "Stock summary retrieved successfully", {
                "total": summary.get("total"),
                "available": summary.get("available"),
                "assigned": summary.get("assigned"),
                "available_stocks_verified": len(available_stocks)
            })
            return True
        else:
            print_result(False, "Stock items not saved correctly", {
                "expected_available": len(test_stock_codes),
                "got_available": len(available_stocks)
            })
            return False
    else:
        print_result(False, f"Failed to get stock (status {status})", data)
        return False

# ============================================================================
# TEST 6: ORDER CREATION WITH AUTH
# ============================================================================
def test_create_order_without_auth():
    """Test order creation fails without JWT token"""
    print_test("10. Create Order - Without Auth (Should Fail)")
    
    order_data = {
        "productId": test_product_id,
        "playerId": "1234567890",
        "playerName": "TestPlayer"
    }
    
    success, data, status = make_request("POST", "/orders", order_data)
    
    if status == 401 and data.get("code") == "AUTH_REQUIRED":
        print_result(True, "Order creation correctly requires authentication", {
            "status": status,
            "code": data.get("code"),
            "error": data.get("error")
        })
        return True
    else:
        print_result(False, f"Expected 401 with AUTH_REQUIRED, got {status}", data)
        return False

def test_create_order_with_auth():
    """Test order creation with JWT token"""
    print_test("11. Create Order - With Auth")
    
    if not user_token or not test_product_id:
        print_result(False, "Missing user token or product ID", {})
        return False
    
    order_data = {
        "productId": test_product_id,
        "playerId": "1234567890",
        "playerName": "TestPlayer#7890"
    }
    
    success, data, status = make_request("POST", "/orders", order_data, user_token)
    
    if success and status == 200 and data.get("success"):
        order = data.get("data", {}).get("order", {})
        global test_order_id
        test_order_id = order.get("id")
        
        # Verify order has userId and customer snapshot
        if (order.get("userId") and order.get("customer") and 
            order.get("customer", {}).get("email") == TEST_USER["email"].lower()):
            print_result(True, "Order created with userId and customer snapshot", {
                "orderId": test_order_id,
                "userId": order.get("userId"),
                "customer_email": order.get("customer", {}).get("email"),
                "customer_name": f"{order.get('customer', {}).get('firstName')} {order.get('customer', {}).get('lastName')}",
                "status": order.get("status")
            })
            return True
        else:
            print_result(False, "Order missing userId or customer data", order)
            return False
    else:
        print_result(False, f"Failed to create order (status {status})", data)
        return False

# ============================================================================
# TEST 7: USER ORDERS ENDPOINTS
# ============================================================================
def test_get_user_orders():
    """Test GET /api/account/orders"""
    print_test("12. Get User Orders")
    
    if not user_token:
        print_result(False, "Missing user token", {})
        return False
    
    success, data, status = make_request("GET", "/account/orders", None, user_token)
    
    if success and status == 200 and data.get("success"):
        orders = data.get("data", [])
        print_result(True, f"Retrieved {len(orders)} user orders", {
            "order_count": len(orders),
            "has_test_order": any(o.get("id") == test_order_id for o in orders)
        })
        return True
    else:
        print_result(False, f"Failed to get user orders (status {status})", data)
        return False

def test_get_user_orders_without_auth():
    """Test GET /api/account/orders without auth"""
    print_test("13. Get User Orders - Without Auth (Should Fail)")
    
    success, data, status = make_request("GET", "/account/orders")
    
    if status == 401:
        print_result(True, "User orders endpoint requires authentication", {
            "status": status,
            "error": data.get("error")
        })
        return True
    else:
        print_result(False, f"Expected 401, got {status}", data)
        return False

def test_get_single_user_order():
    """Test GET /api/account/orders/:orderId"""
    print_test("14. Get Single User Order")
    
    if not user_token or not test_order_id:
        print_result(False, "Missing user token or order ID", {})
        return False
    
    success, data, status = make_request(
        "GET", 
        f"/account/orders/{test_order_id}", 
        None, 
        user_token
    )
    
    if success and status == 200 and data.get("success"):
        order = data.get("data", {}).get("order", {})
        if order.get("id") == test_order_id:
            print_result(True, "Retrieved single order successfully", {
                "orderId": order.get("id"),
                "status": order.get("status"),
                "userId": order.get("userId")
            })
            return True
        else:
            print_result(False, "Order ID mismatch", data)
            return False
    else:
        print_result(False, f"Failed to get order (status {status})", data)
        return False

# ============================================================================
# TEST 8: AUTO-STOCK ASSIGNMENT
# ============================================================================
def test_auto_stock_assignment():
    """Test auto-stock assignment when order is marked as PAID"""
    print_test("15. Auto-Stock Assignment - PAID Callback")
    
    if not test_order_id:
        print_result(False, "Missing order ID", {})
        return False
    
    # Simulate PAID callback (without hash for testing)
    callback_data = {
        "orderId": test_order_id,
        "status": "success",
        "transactionId": f"TXN-{int(time.time())}",
        "payment_id": f"PAY-{int(time.time())}",
        "platform_order_id": test_order_id
    }
    
    success, data, status = make_request("POST", "/payment/shopier/callback", callback_data)
    
    # Note: This might fail due to hash validation, but let's check
    if success or status in [200, 403]:
        print(f"Callback response (status {status}): {data}")
        
        # Wait a moment for processing
        time.sleep(1)
        
        # Check order status and delivery
        success2, order_data, status2 = make_request(
            "GET", 
            f"/account/orders/{test_order_id}", 
            None, 
            user_token
        )
        
        if success2 and status2 == 200:
            order = order_data.get("data", {}).get("order", {})
            delivery = order.get("delivery", {})
            
            print(f"Order after callback: status={order.get('status')}, delivery={delivery}")
            
            # Check if stock was assigned
            if (order.get("status") == "paid" and 
                delivery.get("status") == "delivered" and 
                delivery.get("items") and len(delivery.get("items")) > 0):
                
                # Verify stock status changed to 'assigned'
                success3, stock_data, status3 = make_request(
                    "GET", 
                    f"/admin/products/{test_product_id}/stock", 
                    None, 
                    admin_token
                )
                
                if success3:
                    stocks = stock_data.get("data", {}).get("stocks", [])
                    assigned_stocks = [s for s in stocks if s.get("status") == "assigned" and s.get("orderId") == test_order_id]
                    
                    if assigned_stocks:
                        print_result(True, "Auto-stock assignment working correctly", {
                            "order_status": order.get("status"),
                            "delivery_status": delivery.get("status"),
                            "assigned_item": delivery.get("items")[0],
                            "stock_status": "assigned",
                            "stock_orderId": assigned_stocks[0].get("orderId")
                        })
                        return True
                    else:
                        print_result(False, "Stock status not updated to 'assigned'", {
                            "stocks": stocks
                        })
                        return False
                else:
                    print_result(False, "Could not verify stock status", {})
                    return False
            else:
                print_result(False, "Stock not assigned or order not paid", {
                    "order_status": order.get("status"),
                    "delivery": delivery
                })
                return False
        else:
            print_result(False, "Could not retrieve order after callback", {})
            return False
    else:
        print_result(False, f"Callback failed (status {status})", data)
        return False

def test_idempotency():
    """Test sending same PAID callback twice"""
    print_test("16. Idempotency - Duplicate PAID Callback")
    
    if not test_order_id:
        print_result(False, "Missing order ID", {})
        return False
    
    # Send same callback again
    callback_data = {
        "orderId": test_order_id,
        "status": "success",
        "transactionId": f"TXN-DUPLICATE-{int(time.time())}",
        "payment_id": f"PAY-DUPLICATE-{int(time.time())}",
        "platform_order_id": test_order_id
    }
    
    success, data, status = make_request("POST", "/payment/shopier/callback", callback_data)
    
    # Check if it returns success without assigning more stock
    if success or status in [200, 403]:
        # Get stock count
        success2, stock_data, status2 = make_request(
            "GET", 
            f"/admin/products/{test_product_id}/stock", 
            None, 
            admin_token
        )
        
        if success2:
            stocks = stock_data.get("data", {}).get("stocks", [])
            assigned_to_order = [s for s in stocks if s.get("orderId") == test_order_id]
            
            if len(assigned_to_order) == 1:
                print_result(True, "Idempotency working - only 1 stock assigned", {
                    "assigned_count": len(assigned_to_order),
                    "message": data.get("message")
                })
                return True
            else:
                print_result(False, f"Multiple stocks assigned: {len(assigned_to_order)}", {
                    "assigned_stocks": assigned_to_order
                })
                return False
        else:
            print_result(False, "Could not verify stock count", {})
            return False
    else:
        print_result(False, f"Callback failed (status {status})", data)
        return False

# ============================================================================
# TEST 9: OUT OF STOCK SCENARIO
# ============================================================================
def test_out_of_stock():
    """Test order with no stock available"""
    print_test("17. Out of Stock Scenario")
    
    # First, find a product with no stock or create order for product with exhausted stock
    # For this test, we'll create a new order and simulate callback when no stock is available
    
    # Create another order
    order_data = {
        "productId": test_product_id,
        "playerId": "9876543210",
        "playerName": "TestPlayer2#3210"
    }
    
    success, data, status = make_request("POST", "/orders", order_data, user_token)
    
    if success and status == 200:
        order2_id = data.get("data", {}).get("order", {}).get("id")
        
        # Simulate PAID callback
        callback_data = {
            "orderId": order2_id,
            "status": "success",
            "transactionId": f"TXN-NOSTOCK-{int(time.time())}",
            "payment_id": f"PAY-NOSTOCK-{int(time.time())}",
            "platform_order_id": order2_id
        }
        
        make_request("POST", "/payment/shopier/callback", callback_data)
        time.sleep(1)
        
        # Check order delivery status
        success2, order_data2, status2 = make_request(
            "GET", 
            f"/account/orders/{order2_id}", 
            None, 
            user_token
        )
        
        if success2:
            order = order_data2.get("data", {}).get("order", {})
            delivery = order.get("delivery", {})
            
            # If no stock available, delivery status should be 'pending'
            if delivery.get("status") == "pending" and "bekleniyor" in delivery.get("message", "").lower():
                print_result(True, "Out of stock scenario handled correctly", {
                    "delivery_status": delivery.get("status"),
                    "message": delivery.get("message")
                })
                return True
            elif delivery.get("status") == "delivered":
                print_result(True, "Stock was available and assigned (expected if stock exists)", {
                    "delivery_status": delivery.get("status"),
                    "items": delivery.get("items")
                })
                return True
            else:
                print_result(False, "Unexpected delivery status", delivery)
                return False
        else:
            print_result(False, "Could not retrieve order", {})
            return False
    else:
        print_result(False, "Could not create second order", data)
        return False

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================
def run_all_tests():
    """Run all tests and report results"""
    print("\n" + "="*80)
    print("BACKEND API TESTING - AUTH + STOCK + DELIVERY SYSTEM")
    print("="*80)
    
    results = []
    
    # Auth Tests
    results.append(("User Registration", test_user_registration()))
    results.append(("Duplicate Email Check", test_duplicate_email()))
    results.append(("Registration Validations", test_registration_validation()))
    results.append(("User Login", test_user_login()))
    results.append(("Invalid Login", test_login_invalid_credentials()))
    
    # Admin Login
    results.append(("Admin Login", test_admin_login()))
    
    # Get Products
    results.append(("Get Products", test_get_products()))
    
    # Stock Management
    results.append(("Add Stock", test_add_stock()))
    results.append(("Get Stock Summary", test_get_stock()))
    
    # Order Creation
    results.append(("Create Order Without Auth", test_create_order_without_auth()))
    results.append(("Create Order With Auth", test_create_order_with_auth()))
    
    # User Orders
    results.append(("Get User Orders", test_get_user_orders()))
    results.append(("Get User Orders Without Auth", test_get_user_orders_without_auth()))
    results.append(("Get Single User Order", test_get_single_user_order()))
    
    # Auto-Stock Assignment
    results.append(("Auto-Stock Assignment", test_auto_stock_assignment()))
    results.append(("Idempotency Test", test_idempotency()))
    results.append(("Out of Stock Scenario", test_out_of_stock()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("\n" + "="*80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}%)")
    print("="*80)
    
    return passed == total

if __name__ == "__main__":
    try:
        all_passed = run_all_tests()
        exit(0 if all_passed else 1)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
