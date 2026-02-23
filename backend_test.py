#!/usr/bin/env python3
"""
PINLY UC Store Backend Test Script
Testing newly added GeoIP and USD pricing features
"""

import requests
import json
import sys
from typing import Dict, Any, List

# Test Configuration
BASE_URL = "http://localhost:3000"  # Default from backend code
ADMIN_CREDENTIALS = {
    "username": "admin",
    "password": "admin123"
}

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, message: str):
        """Log test result"""
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message
        })
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
    def make_request(self, method: str, endpoint: str, data=None, headers=None, expect_status=200) -> Dict[Any, Any]:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        default_headers = {"Content-Type": "application/json"}
        if headers:
            default_headers.update(headers)
            
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method.upper() == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=10)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
                
            # Check status code
            if response.status_code != expect_status:
                return {
                    "success": False,
                    "error": f"Expected status {expect_status}, got {response.status_code}",
                    "response": response.text[:500]
                }
                
            # Try to parse JSON
            try:
                return response.json()
            except json.JSONDecodeError:
                if response.status_code == 200:
                    return {"success": True, "data": response.text}
                return {"success": False, "error": "Invalid JSON response"}
                
        except requests.exceptions.Timeout:
            return {"success": False, "error": "Request timeout"}
        except requests.exceptions.ConnectionError:
            return {"success": False, "error": "Connection error"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def login_admin(self) -> bool:
        """Login as admin and get token"""
        print(f"\n🔐 Logging in as admin...")
        
        result = self.make_request(
            'POST',
            '/api/admin/login',
            data=ADMIN_CREDENTIALS
        )
        
        if not result.get('success'):
            self.log_result("Admin Login", False, f"Login failed: {result.get('error', 'Unknown error')}")
            return False
            
        if 'data' not in result or 'token' not in result['data']:
            self.log_result("Admin Login", False, "No token in response")
            return False
            
        self.admin_token = result['data']['token']
        self.log_result("Admin Login", True, "Successfully logged in as admin")
        return True
    
    def test_geoip_endpoint(self):
        """Test GeoIP Detection Endpoint (GET /api/geo)"""
        print(f"\n🌍 Testing GeoIP Detection Endpoint...")
        
        result = self.make_request('GET', '/api/geo')
        
        if not result.get('success'):
            self.log_result("GeoIP Detection Endpoint", False, f"Request failed: {result.get('error', 'Unknown error')}")
            return
            
        # Check required fields
        data = result.get('data', {})
        required_fields = ['countryCode', 'country', 'isTurkey', 'locale', 'currency']
        
        missing_fields = []
        for field in required_fields:
            if field not in data:
                missing_fields.append(field)
                
        if missing_fields:
            self.log_result("GeoIP Detection Endpoint", False, f"Missing required fields: {missing_fields}")
            return
            
        # Validate field types and values
        if not isinstance(data.get('countryCode'), str) or len(data['countryCode']) != 2:
            self.log_result("GeoIP Detection Endpoint", False, "Invalid countryCode format")
            return
            
        if not isinstance(data.get('isTurkey'), bool):
            self.log_result("GeoIP Detection Endpoint", False, "isTurkey should be boolean")
            return
            
        if data.get('locale') not in ['tr', 'en']:
            self.log_result("GeoIP Detection Endpoint", False, f"Invalid locale: {data.get('locale')}")
            return
            
        if data.get('currency') not in ['TRY', 'USD']:
            self.log_result("GeoIP Detection Endpoint", False, f"Invalid currency: {data.get('currency')}")
            return
        
        # For local IPs should default to Turkey
        expected_country = 'TR'  # Default for localhost
        if data.get('countryCode') == expected_country:
            self.log_result("GeoIP Detection Endpoint", True, f"Returns valid response with countryCode={data.get('countryCode')}, locale={data.get('locale')}, currency={data.get('currency')}")
        else:
            self.log_result("GeoIP Detection Endpoint", True, f"Returns valid response (non-local IP): countryCode={data.get('countryCode')}, locale={data.get('locale')}, currency={data.get('currency')}")
    
    def test_product_usd_fields(self):
        """Test Product USD Price Fields (GET /api/products)"""
        print(f"\n💰 Testing Product USD Price Fields...")
        
        result = self.make_request('GET', '/api/products')
        
        if not result.get('success'):
            self.log_result("Product USD Price Fields", False, f"Request failed: {result.get('error', 'Unknown error')}")
            return
            
        products = result.get('data', [])
        
        if not products:
            self.log_result("Product USD Price Fields", False, "No products returned")
            return
            
        # Check if all products have USD price fields
        products_with_usd = 0
        products_without_usd = []
        
        for product in products:
            if 'priceUSD' in product and 'discountPriceUSD' in product:
                # Validate field types
                if not isinstance(product['priceUSD'], (int, float)) or not isinstance(product['discountPriceUSD'], (int, float)):
                    self.log_result("Product USD Price Fields", False, f"USD price fields must be numbers in product: {product.get('title', 'Unknown')}")
                    return
                products_with_usd += 1
            else:
                products_without_usd.append(product.get('title', 'Unknown'))
        
        if products_without_usd:
            self.log_result("Product USD Price Fields", False, f"Products missing USD fields: {products_without_usd}")
            return
            
        self.log_result("Product USD Price Fields", True, f"All {products_with_usd} products have priceUSD and discountPriceUSD fields (numbers)")
    
    def test_admin_usd_price_management(self):
        """Test Admin USD Price Management (PUT /api/admin/products/:productId)"""
        print(f"\n🔧 Testing Admin USD Price Management...")
        
        if not self.admin_token:
            self.log_result("Admin USD Price Management", False, "No admin token available")
            return
            
        # First get admin products list
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        result = self.make_request('GET', '/api/admin/products', headers=headers)
        
        if not result.get('success'):
            self.log_result("Admin USD Price Management", False, f"Failed to get admin products: {result.get('error', 'Unknown error')}")
            return
            
        products = result.get('data', [])
        if not products:
            self.log_result("Admin USD Price Management", False, "No products available for testing")
            return
            
        # Take the first product for testing
        test_product = products[0]
        product_id = test_product.get('id')
        
        if not product_id:
            self.log_result("Admin USD Price Management", False, "Product ID not found")
            return
            
        # Update product with USD prices
        update_data = {
            'priceUSD': 5.99,
            'discountPriceUSD': 4.99
        }
        
        update_result = self.make_request(
            'PUT', 
            f'/api/admin/products/{product_id}',
            data=update_data,
            headers=headers
        )
        
        if not update_result.get('success'):
            self.log_result("Admin USD Price Management", False, f"Update failed: {update_result.get('error', 'Unknown error')}")
            return
            
        # Verify the update worked
        updated_product = update_result.get('data', {})
        
        if updated_product.get('priceUSD') != 5.99 or updated_product.get('discountPriceUSD') != 4.99:
            self.log_result("Admin USD Price Management", False, "USD prices were not updated correctly")
            return
            
        # Verify public API also shows the USD prices
        public_result = self.make_request('GET', '/api/products')
        
        if public_result.get('success'):
            public_products = public_result.get('data', [])
            updated_public_product = None
            
            for product in public_products:
                if product.get('id') == product_id:
                    updated_public_product = product
                    break
                    
            if updated_public_product:
                if updated_public_product.get('priceUSD') == 5.99 and updated_public_product.get('discountPriceUSD') == 4.99:
                    self.log_result("Admin USD Price Management", True, f"Successfully updated USD prices for product '{test_product.get('title')}' and verified in public API")
                else:
                    self.log_result("Admin USD Price Management", False, "USD prices not reflected in public API")
            else:
                self.log_result("Admin USD Price Management", False, "Updated product not found in public API")
        else:
            self.log_result("Admin USD Price Management", False, "Could not verify public API after update")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting PINLY UC Store Backend Tests")
        print("=" * 60)
        
        # Test 1: GeoIP Detection Endpoint
        self.test_geoip_endpoint()
        
        # Test 2: Product USD Price Fields  
        self.test_product_usd_fields()
        
        # Test 3: Admin Login (required for next test)
        admin_login_success = self.login_admin()
        
        # Test 4: Admin USD Price Management (only if admin login succeeded)
        if admin_login_success:
            self.test_admin_usd_price_management()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"{status} {result['test']}")
            
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All backend tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

def main():
    """Main function"""
    tester = BackendTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())