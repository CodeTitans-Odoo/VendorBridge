import requests
import json

base_url = "http://localhost:8000"

print("1. Logging in as test vendor...")
login_payload = {
    "username": "testvendor2@example.com",
    "password": "password"
}
res = requests.post(f"{base_url}/api/auth/login", data=login_payload)
if res.status_code != 200:
    print(f"Login failed: {res.text}")
    exit(1)

token = res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("Successfully logged in.")

print("\n2. Fetching Open RFQs...")
res = requests.get(f"{base_url}/api/rfqs", headers=headers)
rfqs = res.json()
if not rfqs:
    print("No open RFQs found. Please log in as an admin to create an RFQ first!")
    exit(0)

rfq = rfqs[0]
print(f"Found RFQ: '{rfq['title']}' with {len(rfq['items'])} items.")

print("\n3. Submitting Quotation...")
# The payload vendor_id is required by schema, but backend will override it with actual vendor ID
quotation_items = []
for idx, item in enumerate(rfq["items"]):
    qty = item["quantity"]
    unit_price = 500.00
    quotation_items.append({
        "product_name": item["product_name"],
        "qty": qty,
        "unit_price": unit_price,
        "total": qty * unit_price
    })

total_price = sum(i["total"] for i in quotation_items)
gst = total_price * 0.18
grand_total = total_price + gst

payload = {
    "rfq_id": rfq["id"],
    "vendor_id": 0, # Will be overridden automatically by backend security
    "total_price": grand_total,
    "delivery_days": 10,
    "notes": "Test quotation via API simulation",
    "items": quotation_items
}

res = requests.post(f"{base_url}/api/quotations", json=payload, headers=headers)
if res.status_code in (200, 201):
    print(f"Quotation successfully submitted! Status Code: {res.status_code}")
    quotation = res.json()
    print(f"Grand Total including GST: Rs. {quotation['total_price']}")
    print("Status:", quotation['status'])
else:
    print(f"Quotation submission failed: {res.text}")

print("\n4. Fetching Vendor's Quotations...")
res = requests.get(f"{base_url}/api/quotations", headers=headers)
print(f"Found {len(res.json())} submitted quotations.")
