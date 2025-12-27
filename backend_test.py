#!/usr/bin/env python3
"""
Support Ticket System API Backend Tests
Tests all support ticket endpoints with comprehensive scenarios
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://ticketing-portal-3.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test data
TEST_USER_DATA = {
    "firstName": "Ahmet",
    "lastName": "Yılmaz", 
    "email": "ahmet.test@example.com",
    "phone": "5551234567",
    "password": "test123456"
}

ADMIN_CREDENTIALS = {
    "username": "admin",
    "password": "admin123"
}

# Global variables for tokens and IDs
user_token = None
admin_token = None
test_ticket_id = None

def print_test_result(test_name, success, details=""):
    """Print formatted test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"   {details}")
    print()

def register_test_user():
    """Register a test user and get JWT token"""
    global user_token
    
    print("🔧 Setting up test user...")
    
    try:
        response = requests.post(f"{API_BASE}/auth/register", json=TEST_USER_DATA)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('data') and data['data'].get('token'):
                user_token = data['data']['token']
                print(f"✅ Test user registered successfully")
                return True
            else:
                print(f"❌ Registration failed: {data.get('error', 'Unknown error')}")
                return False
        elif response.status_code == 409:
            # User already exists, try to login
            print("ℹ️ User already exists, attempting login...")
            login_response = requests.post(f"{API_BASE}/auth/login", json={
                "email": TEST_USER_DATA["email"],
                "password": TEST_USER_DATA["password"]
            })
            
            if login_response.status_code == 200:
                login_data = login_response.json()
                if login_data.get('success') and login_data.get('data') and login_data['data'].get('token'):
                    user_token = login_data['data']['token']
                    print(f"✅ Test user logged in successfully")
                    return True
            
            print(f"❌ Login failed after registration conflict")
            return False
        else:
            print(f"❌ Registration failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Registration error: {str(e)}")
        return False

def login_admin():
    """Login as admin and get JWT token"""
    global admin_token
    
    print("🔧 Logging in as admin...")
    
    try:
        response = requests.post(f"{API_BASE}/admin/login", json=ADMIN_CREDENTIALS)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('data') and data['data'].get('token'):
                admin_token = data['data']['token']
                print(f"✅ Admin logged in successfully")
                return True
            else:
                print(f"❌ Admin login failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Admin login failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Admin login error: {str(e)}")
        return False

def test_user_create_ticket():
    """Test user ticket creation with validation and rate limiting"""
    global test_ticket_id
    
    print("🧪 Testing User Ticket Creation...")
    
    # Test 1: Create ticket without auth (should fail)
    try:
        response = requests.post(f"{API_BASE}/support/tickets", json={
            "subject": "Test ticket",
            "category": "odeme",
            "message": "This is a test ticket message"
        })
        
        success = response.status_code == 401
        print_test_result(
            "Create ticket without auth",
            success,
            f"Expected 401, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Create ticket without auth", False, f"Error: {str(e)}")
    
    # Test 2: Create ticket with missing fields
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets", 
                               json={"subject": "Test"}, 
                               headers=headers)
        
        success = response.status_code == 400
        print_test_result(
            "Create ticket with missing fields",
            success,
            f"Expected 400, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Create ticket with missing fields", False, f"Error: {str(e)}")
    
    # Test 3: Create ticket with short subject
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets", json={
            "subject": "Hi",  # Too short
            "category": "odeme",
            "message": "This is a test ticket message"
        }, headers=headers)
        
        success = response.status_code == 400
        print_test_result(
            "Create ticket with short subject",
            success,
            f"Expected 400, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Create ticket with short subject", False, f"Error: {str(e)}")
    
    # Test 4: Create ticket with short message
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets", json={
            "subject": "Valid subject",
            "category": "odeme",
            "message": "Short"  # Too short
        }, headers=headers)
        
        success = response.status_code == 400
        print_test_result(
            "Create ticket with short message",
            success,
            f"Expected 400, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Create ticket with short message", False, f"Error: {str(e)}")
    
    # Test 5: Create ticket with invalid category
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets", json={
            "subject": "Valid subject",
            "category": "invalid_category",
            "message": "This is a valid message"
        }, headers=headers)
        
        success = response.status_code == 400
        print_test_result(
            "Create ticket with invalid category",
            success,
            f"Expected 400, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Create ticket with invalid category", False, f"Error: {str(e)}")
    
    # Test 6: Create valid ticket
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets", json={
            "subject": "Ödeme problemi yaşıyorum",
            "category": "odeme",
            "message": "Ödeme yaptım ancak UC'ler hesabıma geçmedi. Lütfen yardım edebilir misiniz?"
        }, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('data'):
                ticket = data['data']
                test_ticket_id = ticket['id']
                
                # Verify ticket properties
                success = (
                    ticket['status'] == 'waiting_admin' and
                    ticket['userCanReply'] == False and
                    ticket['subject'] == "Ödeme problemi yaşıyorum" and
                    ticket['category'] == "odeme"
                )
                
                print_test_result(
                    "Create valid ticket",
                    success,
                    f"Ticket created with ID: {test_ticket_id}, status: {ticket['status']}, userCanReply: {ticket['userCanReply']}"
                )
            else:
                print_test_result("Create valid ticket", False, f"Invalid response data: {data}")
        else:
            print_test_result("Create valid ticket", False, f"Expected 200, got {response.status_code}")
    except Exception as e:
        print_test_result("Create valid ticket", False, f"Error: {str(e)}")
    
    # Test 7: Test rate limiting (create 3 more tickets quickly)
    print("🧪 Testing rate limiting (3 tickets per 10 minutes)...")
    
    rate_limit_hit = False
    for i in range(3):
        try:
            headers = {"Authorization": f"Bearer {user_token}"}
            response = requests.post(f"{API_BASE}/support/tickets", json={
                "subject": f"Rate limit test ticket {i+1}",
                "category": "diger",
                "message": f"This is rate limit test message {i+1}"
            }, headers=headers)
            
            if response.status_code == 429:
                rate_limit_hit = True
                break
            elif response.status_code != 200:
                print(f"   Unexpected status for ticket {i+1}: {response.status_code}")
                
        except Exception as e:
            print(f"   Error creating rate limit test ticket {i+1}: {str(e)}")
    
    print_test_result(
        "Rate limiting (3 tickets per 10 minutes)",
        rate_limit_hit,
        "Rate limit triggered as expected" if rate_limit_hit else "Rate limit not triggered"
    )

def test_user_ticket_list():
    """Test user ticket list endpoint"""
    print("🧪 Testing User Ticket List...")
    
    # Test 1: Get tickets without auth
    try:
        response = requests.get(f"{API_BASE}/support/tickets")
        
        success = response.status_code == 401
        print_test_result(
            "Get tickets without auth",
            success,
            f"Expected 401, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Get tickets without auth", False, f"Error: {str(e)}")
    
    # Test 2: Get user's tickets
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{API_BASE}/support/tickets", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and 'data' in data:
                tickets = data['data']
                success = len(tickets) > 0  # Should have at least the ticket we created
                
                print_test_result(
                    "Get user's tickets",
                    success,
                    f"Found {len(tickets)} tickets"
                )
            else:
                print_test_result("Get user's tickets", False, f"Invalid response data: {data}")
        else:
            print_test_result("Get user's tickets", False, f"Expected 200, got {response.status_code}")
    except Exception as e:
        print_test_result("Get user's tickets", False, f"Error: {str(e)}")

def test_user_single_ticket():
    """Test user single ticket endpoint"""
    print("🧪 Testing User Single Ticket...")
    
    if not test_ticket_id:
        print_test_result("Get single ticket", False, "No test ticket ID available")
        return
    
    # Test 1: Get ticket without auth
    try:
        response = requests.get(f"{API_BASE}/support/tickets/{test_ticket_id}")
        
        success = response.status_code == 401
        print_test_result(
            "Get single ticket without auth",
            success,
            f"Expected 401, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Get single ticket without auth", False, f"Error: {str(e)}")
    
    # Test 2: Get valid ticket with messages
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{API_BASE}/support/tickets/{test_ticket_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('data'):
                ticket_data = data['data']
                ticket = ticket_data.get('ticket')
                messages = ticket_data.get('messages', [])
                
                success = (
                    ticket and 
                    ticket['id'] == test_ticket_id and
                    len(messages) >= 1  # Should have initial message
                )
                
                print_test_result(
                    "Get single ticket with messages",
                    success,
                    f"Ticket found with {len(messages)} messages"
                )
            else:
                print_test_result("Get single ticket with messages", False, f"Invalid response data: {data}")
        else:
            print_test_result("Get single ticket with messages", False, f"Expected 200, got {response.status_code}")
    except Exception as e:
        print_test_result("Get single ticket with messages", False, f"Error: {str(e)}")
    
    # Test 3: Try to access non-existent ticket
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{API_BASE}/support/tickets/non-existent-id", headers=headers)
        
        success = response.status_code == 404
        print_test_result(
            "Get non-existent ticket",
            success,
            f"Expected 404, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Get non-existent ticket", False, f"Error: {str(e)}")

def test_user_send_message():
    """Test user send message endpoint - CRITICAL userCanReply logic"""
    print("🧪 Testing User Send Message (CRITICAL userCanReply logic)...")
    
    if not test_ticket_id:
        print_test_result("User send message", False, "No test ticket ID available")
        return
    
    # Test 1: Try to send message when userCanReply=false (should fail with 403)
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets/{test_ticket_id}/messages", 
                               json={"message": "Bu mesaj gönderilmemeli çünkü admin henüz yanıtlamadı"}, 
                               headers=headers)
        
        success = response.status_code == 403
        if success and response.status_code == 403:
            data = response.json()
            expected_message = "Admin yanıtı bekleniyor. Şu anda mesaj gönderemezsiniz."
            success = expected_message in data.get('error', '')
        
        print_test_result(
            "Send message when userCanReply=false",
            success,
            f"Expected 403 with specific message, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Send message when userCanReply=false", False, f"Error: {str(e)}")
    
    # Test 2: Send message without auth
    try:
        response = requests.post(f"{API_BASE}/support/tickets/{test_ticket_id}/messages", 
                               json={"message": "Test message"})
        
        success = response.status_code == 401
        print_test_result(
            "Send message without auth",
            success,
            f"Expected 401, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Send message without auth", False, f"Error: {str(e)}")
    
    # Test 3: Send message with short content
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets/{test_ticket_id}/messages", 
                               json={"message": "X"}, 
                               headers=headers)
        
        success = response.status_code == 400
        print_test_result(
            "Send message with short content",
            success,
            f"Expected 400, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Send message with short content", False, f"Error: {str(e)}")

def test_admin_ticket_list():
    """Test admin ticket list endpoint"""
    print("🧪 Testing Admin Ticket List...")
    
    # Test 1: Get tickets without admin auth
    try:
        response = requests.get(f"{API_BASE}/admin/support/tickets")
        
        success = response.status_code == 401
        print_test_result(
            "Get admin tickets without auth",
            success,
            f"Expected 401, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Get admin tickets without auth", False, f"Error: {str(e)}")
    
    # Test 2: Get tickets with user token (should fail)
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{API_BASE}/admin/support/tickets", headers=headers)
        
        success = response.status_code == 401
        print_test_result(
            "Get admin tickets with user token",
            success,
            f"Expected 401, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Get admin tickets with user token", False, f"Error: {str(e)}")
    
    # Test 3: Get all tickets with admin token
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{API_BASE}/admin/support/tickets", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and 'data' in data:
                tickets = data['data']
                success = len(tickets) > 0
                
                # Check if tickets have user info
                if tickets:
                    first_ticket = tickets[0]
                    has_user_info = 'userEmail' in first_ticket and 'userName' in first_ticket
                    success = success and has_user_info
                
                print_test_result(
                    "Get all tickets with admin token",
                    success,
                    f"Found {len(tickets)} tickets with user info"
                )
            else:
                print_test_result("Get all tickets with admin token", False, f"Invalid response data: {data}")
        else:
            print_test_result("Get all tickets with admin token", False, f"Expected 200, got {response.status_code}")
    except Exception as e:
        print_test_result("Get all tickets with admin token", False, f"Error: {str(e)}")
    
    # Test 4: Get tickets with status filter
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{API_BASE}/admin/support/tickets?status=waiting_admin", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and 'data' in data:
                tickets = data['data']
                # All tickets should have status 'waiting_admin'
                success = all(ticket['status'] == 'waiting_admin' for ticket in tickets)
                
                print_test_result(
                    "Get tickets with status filter",
                    success,
                    f"Found {len(tickets)} tickets with status 'waiting_admin'"
                )
            else:
                print_test_result("Get tickets with status filter", False, f"Invalid response data: {data}")
        else:
            print_test_result("Get tickets with status filter", False, f"Expected 200, got {response.status_code}")
    except Exception as e:
        print_test_result("Get tickets with status filter", False, f"Error: {str(e)}")

def test_admin_single_ticket():
    """Test admin single ticket endpoint"""
    print("🧪 Testing Admin Single Ticket...")
    
    if not test_ticket_id:
        print_test_result("Admin get single ticket", False, "No test ticket ID available")
        return
    
    # Test 1: Get ticket without admin auth
    try:
        response = requests.get(f"{API_BASE}/admin/support/tickets/{test_ticket_id}")
        
        success = response.status_code == 401
        print_test_result(
            "Get admin single ticket without auth",
            success,
            f"Expected 401, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Get admin single ticket without auth", False, f"Error: {str(e)}")
    
    # Test 2: Get ticket with admin token
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{API_BASE}/admin/support/tickets/{test_ticket_id}", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('data'):
                ticket_data = data['data']
                ticket = ticket_data.get('ticket')
                messages = ticket_data.get('messages', [])
                
                success = (
                    ticket and 
                    ticket['id'] == test_ticket_id and
                    'userEmail' in ticket and
                    'userName' in ticket and
                    len(messages) >= 1
                )
                
                print_test_result(
                    "Get single ticket with admin token",
                    success,
                    f"Ticket found with user info and {len(messages)} messages"
                )
            else:
                print_test_result("Get single ticket with admin token", False, f"Invalid response data: {data}")
        else:
            print_test_result("Get single ticket with admin token", False, f"Expected 200, got {response.status_code}")
    except Exception as e:
        print_test_result("Get single ticket with admin token", False, f"Error: {str(e)}")

def test_admin_reply():
    """Test admin reply endpoint - CRITICAL userCanReply logic"""
    print("🧪 Testing Admin Reply (CRITICAL userCanReply logic)...")
    
    if not test_ticket_id:
        print_test_result("Admin reply", False, "No test ticket ID available")
        return
    
    # Test 1: Reply without admin auth
    try:
        response = requests.post(f"{API_BASE}/admin/support/tickets/{test_ticket_id}/messages", 
                               json={"message": "Admin yanıtı"})
        
        success = response.status_code == 401
        print_test_result(
            "Admin reply without auth",
            success,
            f"Expected 401, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Admin reply without auth", False, f"Error: {str(e)}")
    
    # Test 2: Reply with short message
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{API_BASE}/admin/support/tickets/{test_ticket_id}/messages", 
                               json={"message": "X"}, 
                               headers=headers)
        
        success = response.status_code == 400
        print_test_result(
            "Admin reply with short message",
            success,
            f"Expected 400, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Admin reply with short message", False, f"Error: {str(e)}")
    
    # Test 3: Valid admin reply (CRITICAL - should enable userCanReply)
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{API_BASE}/admin/support/tickets/{test_ticket_id}/messages", 
                               json={"message": "Merhaba, ödeme probleminizi inceliyoruz. Lütfen işlem numaranızı paylaşır mısınız?"}, 
                               headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            success = data.get('success', False)
            
            # Verify ticket status changed to waiting_user and userCanReply=true
            if success:
                # Get ticket to verify status
                ticket_response = requests.get(f"{API_BASE}/admin/support/tickets/{test_ticket_id}", headers=headers)
                if ticket_response.status_code == 200:
                    ticket_data = ticket_response.json()
                    if ticket_data.get('success') and ticket_data.get('data'):
                        ticket = ticket_data['data']['ticket']
                        success = (
                            ticket['status'] == 'waiting_user' and
                            ticket['userCanReply'] == True
                        )
            
            print_test_result(
                "Admin reply enables userCanReply",
                success,
                f"Status: waiting_user, userCanReply: true" if success else "Failed to update ticket status"
            )
        else:
            print_test_result("Admin reply enables userCanReply", False, f"Expected 200, got {response.status_code}")
    except Exception as e:
        print_test_result("Admin reply enables userCanReply", False, f"Error: {str(e)}")

def test_user_send_message_after_admin_reply():
    """Test user can send message after admin reply"""
    print("🧪 Testing User Send Message After Admin Reply...")
    
    if not test_ticket_id:
        print_test_result("User send message after admin reply", False, "No test ticket ID available")
        return
    
    # Test 1: User should now be able to send message (userCanReply=true)
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets/{test_ticket_id}/messages", 
                               json={"message": "İşlem numarası: TXN123456789. Lütfen kontrol edebilir misiniz?"}, 
                               headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            success = data.get('success', False)
            
            # Verify ticket status changed back to waiting_admin and userCanReply=false
            if success:
                ticket_response = requests.get(f"{API_BASE}/support/tickets/{test_ticket_id}", headers=headers)
                if ticket_response.status_code == 200:
                    ticket_data = ticket_response.json()
                    if ticket_data.get('success') and ticket_data.get('data'):
                        ticket = ticket_data['data']['ticket']
                        success = (
                            ticket['status'] == 'waiting_admin' and
                            ticket['userCanReply'] == False
                        )
            
            print_test_result(
                "User sends message after admin reply",
                success,
                f"Message sent, status: waiting_admin, userCanReply: false" if success else "Failed to update ticket status"
            )
        else:
            print_test_result("User sends message after admin reply", False, f"Expected 200, got {response.status_code}")
    except Exception as e:
        print_test_result("User sends message after admin reply", False, f"Error: {str(e)}")
    
    # Test 2: User should NOT be able to send another message (userCanReply=false again)
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets/{test_ticket_id}/messages", 
                               json={"message": "Bu mesaj gönderilmemeli"}, 
                               headers=headers)
        
        success = response.status_code == 403
        if success and response.status_code == 403:
            data = response.json()
            expected_message = "Admin yanıtı bekleniyor. Şu anda mesaj gönderemezsiniz."
            success = expected_message in data.get('error', '')
        
        print_test_result(
            "User cannot send second message",
            success,
            f"Expected 403 with specific message, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("User cannot send second message", False, f"Error: {str(e)}")

def test_admin_close_ticket():
    """Test admin close ticket endpoint"""
    print("🧪 Testing Admin Close Ticket...")
    
    if not test_ticket_id:
        print_test_result("Admin close ticket", False, "No test ticket ID available")
        return
    
    # Test 1: Close ticket without admin auth
    try:
        response = requests.post(f"{API_BASE}/admin/support/tickets/{test_ticket_id}/close", json={})
        
        success = response.status_code == 401
        print_test_result(
            "Close ticket without auth",
            success,
            f"Expected 401, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("Close ticket without auth", False, f"Error: {str(e)}")
    
    # Test 2: Close ticket with admin token
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{API_BASE}/admin/support/tickets/{test_ticket_id}/close", json={}, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            success = data.get('success', False)
            
            # Verify ticket status changed to closed and userCanReply=false
            if success:
                ticket_response = requests.get(f"{API_BASE}/admin/support/tickets/{test_ticket_id}", headers=headers)
                if ticket_response.status_code == 200:
                    ticket_data = ticket_response.json()
                    if ticket_data.get('success') and ticket_data.get('data'):
                        ticket = ticket_data['data']['ticket']
                        success = (
                            ticket['status'] == 'closed' and
                            ticket['userCanReply'] == False
                        )
            
            print_test_result(
                "Admin closes ticket",
                success,
                f"Ticket closed, status: closed, userCanReply: false" if success else "Failed to update ticket status"
            )
        else:
            print_test_result("Admin closes ticket", False, f"Expected 200, got {response.status_code}")
    except Exception as e:
        print_test_result("Admin closes ticket", False, f"Error: {str(e)}")
    
    # Test 3: User should NOT be able to send message to closed ticket
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets/{test_ticket_id}/messages", 
                               json={"message": "Bu mesaj kapalı bilete gönderilmemeli"}, 
                               headers=headers)
        
        success = response.status_code == 403
        if success and response.status_code == 403:
            data = response.json()
            expected_message = "Bu talep kapatılmış. Yeni mesaj gönderemezsiniz."
            success = expected_message in data.get('error', '')
        
        print_test_result(
            "User cannot send message to closed ticket",
            success,
            f"Expected 403 with specific message, got {response.status_code}"
        )
    except Exception as e:
        print_test_result("User cannot send message to closed ticket", False, f"Error: {str(e)}")

def test_full_flow():
    """Test complete support ticket flow"""
    print("🧪 Testing Complete Support Ticket Flow...")
    
    # Create a new ticket for full flow test
    flow_ticket_id = None
    
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets", json={
            "subject": "Teslimat sorunu - Full Flow Test",
            "category": "teslimat",
            "message": "UC kodlarım gelmedi, lütfen yardım edin."
        }, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('data'):
                flow_ticket_id = data['data']['id']
                print(f"✅ Step 1: Ticket created (ID: {flow_ticket_id})")
                print(f"   Status: waiting_admin, userCanReply: false")
            else:
                print("❌ Step 1: Failed to create ticket")
                return
        else:
            print(f"❌ Step 1: Failed to create ticket (status: {response.status_code})")
            return
    except Exception as e:
        print(f"❌ Step 1: Error creating ticket: {str(e)}")
        return
    
    # Step 2: User tries to send message (should fail)
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets/{flow_ticket_id}/messages", 
                               json={"message": "Acil yardım gerekiyor!"}, 
                               headers=headers)
        
        if response.status_code == 403:
            print("✅ Step 2: User cannot send message (userCanReply=false)")
        else:
            print(f"❌ Step 2: Expected 403, got {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Step 2: Error: {str(e)}")
        return
    
    # Step 3: Admin replies
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{API_BASE}/admin/support/tickets/{flow_ticket_id}/messages", 
                               json={"message": "Merhaba, sorununuzu inceliyoruz. Sipariş numaranızı paylaşabilir misiniz?"}, 
                               headers=headers)
        
        if response.status_code == 200:
            print("✅ Step 3: Admin replied")
            print("   Status: waiting_user, userCanReply: true")
        else:
            print(f"❌ Step 3: Expected 200, got {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Step 3: Error: {str(e)}")
        return
    
    # Step 4: User sends message
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets/{flow_ticket_id}/messages", 
                               json={"message": "Sipariş numarası: ORD789123. Teşekkürler."}, 
                               headers=headers)
        
        if response.status_code == 200:
            print("✅ Step 4: User sent message")
            print("   Status: waiting_admin, userCanReply: false")
        else:
            print(f"❌ Step 4: Expected 200, got {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Step 4: Error: {str(e)}")
        return
    
    # Step 5: User tries to send another message (should fail)
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets/{flow_ticket_id}/messages", 
                               json={"message": "Başka bir mesaj"}, 
                               headers=headers)
        
        if response.status_code == 403:
            print("✅ Step 5: User cannot send another message (userCanReply=false)")
        else:
            print(f"❌ Step 5: Expected 403, got {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Step 5: Error: {str(e)}")
        return
    
    # Step 6: Admin closes ticket
    try:
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{API_BASE}/admin/support/tickets/{flow_ticket_id}/close", headers=headers)
        
        if response.status_code == 200:
            print("✅ Step 6: Admin closed ticket")
            print("   Status: closed, userCanReply: false")
        else:
            print(f"❌ Step 6: Expected 200, got {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Step 6: Error: {str(e)}")
        return
    
    # Step 7: User tries to send message to closed ticket (should fail)
    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{API_BASE}/support/tickets/{flow_ticket_id}/messages", 
                               json={"message": "Kapalı bilete mesaj"}, 
                               headers=headers)
        
        if response.status_code == 403:
            print("✅ Step 7: User cannot send message to closed ticket")
            print("✅ FULL FLOW TEST COMPLETED SUCCESSFULLY!")
        else:
            print(f"❌ Step 7: Expected 403, got {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Step 7: Error: {str(e)}")
        return

def main():
    """Run all support ticket system tests"""
    print("🚀 Starting Support Ticket System API Tests")
    print("=" * 60)
    
    # Setup
    if not register_test_user():
        print("❌ Failed to setup test user. Aborting tests.")
        sys.exit(1)
    
    if not login_admin():
        print("❌ Failed to login as admin. Aborting tests.")
        sys.exit(1)
    
    print("✅ Setup completed successfully!")
    print("=" * 60)
    
    # Run all tests
    test_user_create_ticket()
    test_user_ticket_list()
    test_user_single_ticket()
    test_user_send_message()
    test_admin_ticket_list()
    test_admin_single_ticket()
    test_admin_reply()
    test_user_send_message_after_admin_reply()
    test_admin_close_ticket()
    test_full_flow()
    
    print("=" * 60)
    print("🏁 Support Ticket System API Tests Completed")
    print(f"📊 Test Results Summary:")
    print(f"   Base URL: {BASE_URL}")
    print(f"   Test User: {TEST_USER_DATA['email']}")
    print(f"   Admin: {ADMIN_CREDENTIALS['username']}")
    if test_ticket_id:
        print(f"   Test Ticket ID: {test_ticket_id}")

if __name__ == "__main__":
    main()