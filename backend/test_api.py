"""Test API endpoints"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# Login first to get token
login_data = {
    "email": "admin@example.com",  # Change this
    "password": "admin123"  # Change this
}

print("=== Testing Login ===")
response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    token = data.get("access_token")
    print(f"Token: {token[:50]}...")
    
    print("\n=== Testing Get Employees ===")
    headers = {"Authorization": f"Bearer {token}"}
    emp_response = requests.get(f"{BASE_URL}/admin/employees", headers=headers)
    print(f"Status: {emp_response.status_code}")
    
    if emp_response.status_code == 200:
        employees = emp_response.json()
        print(f"Found {len(employees)} employees")
        if employees:
            print("\nFirst employee:")
            print(json.dumps(employees[0], indent=2, ensure_ascii=False))
    else:
        print(f"Error: {emp_response.text}")
else:
    print(f"Login failed: {response.text}")
