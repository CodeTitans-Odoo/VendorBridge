import requests

BASE_URL = "http://127.0.0.1:8000/api/auth"

def run_test():
    # 1. Register a vendor
    vendor_payload = {
        "email": "vendor_company2@vendorbridge.com",
        "first_name": "Vendor2",
        "last_name": "User2",
        "phone": "9876543210",
        "country": "India",
        "role": "vendor",
        "company_name": "Category A",
        "password": "Password123"
    }
    print("Registering vendor...")
    res = requests.post(f"{BASE_URL}/register", json=vendor_payload)
    print("Register Status:", res.status_code)
    if res.status_code == 201:
        print("Register response:", res.json())
    else:
        print("Register failed:", res.text)
    
    # 2. Log in vendor
    login_payload = {
        "username": "vendor_company2@vendorbridge.com",
        "password": "Password123"
    }
    print("Logging in vendor...")
    res = requests.post(f"{BASE_URL}/login", data=login_payload)
    print("Login Status:", res.status_code)
    if res.status_code == 200:
        print("Login success! Token:", res.json())
        
        # 3. Get /me
        token = res.json()["access_token"]
        res_me = requests.get(f"{BASE_URL}/me", headers={"Authorization": f"Bearer {token}"})
        print("Me Status:", res_me.status_code)
        if res_me.status_code == 200:
            print("Me response:", res_me.json())
        else:
            print("Me failed:", res_me.text)
    else:
        print("Login failed:", res.text)

if __name__ == "__main__":
    run_test()
