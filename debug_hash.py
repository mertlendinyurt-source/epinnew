#!/usr/bin/env python3
"""
Debug hash generation
"""

import hashlib

order_id = "2a430198-310b-4999-8760-0b5867aa333a"
amount = 19.99
secret = "test_secret_abcdef"

# Test different variations
print("Testing hash generation variations:")
print(f"Order ID: {order_id}")
print(f"Amount: {amount}")
print(f"Secret: {secret}")
print()

# Variation 1: amount as float
data1 = f"{order_id}{amount}{secret}"
hash1 = hashlib.sha256(data1.encode()).hexdigest()
print(f"1. orderId + amount(float) + secret:")
print(f"   Data: {data1}")
print(f"   Hash: {hash1}")
print()

# Variation 2: amount as string
data2 = f"{order_id}{str(amount)}{secret}"
hash2 = hashlib.sha256(data2.encode()).hexdigest()
print(f"2. orderId + str(amount) + secret:")
print(f"   Data: {data2}")
print(f"   Hash: {hash2}")
print()

# Variation 3: amount as int (no decimal)
data3 = f"{order_id}{int(amount)}{secret}"
hash3 = hashlib.sha256(data3.encode()).hexdigest()
print(f"3. orderId + int(amount) + secret:")
print(f"   Data: {data3}")
print(f"   Hash: {hash3}")
print()

# Now let's check what the backend is actually generating
# by looking at the security log
from pymongo import MongoClient
client = MongoClient("mongodb://localhost:27017")
db = client['pubg_uc_store']

security_log = db.payment_security_logs.find_one({"orderId": order_id})
if security_log:
    print("Security log found:")
    print(f"   Expected hash (backend): {security_log.get('expectedHash')}")
    print(f"   Received hash (test): {security_log.get('receivedHash')}")
    print()
    
    # Compare
    if security_log.get('expectedHash') == hash1:
        print("✅ Backend uses: orderId + amount(float) + secret")
    elif security_log.get('expectedHash') == hash2:
        print("✅ Backend uses: orderId + str(amount) + secret")
    elif security_log.get('expectedHash') == hash3:
        print("✅ Backend uses: orderId + int(amount) + secret")
    else:
        print("❌ Backend uses different format!")
        print(f"   Backend hash: {security_log.get('expectedHash')}")
else:
    print("No security log found for this order")
