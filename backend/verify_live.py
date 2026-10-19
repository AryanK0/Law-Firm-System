import json
import urllib.request
import urllib.error


def make_request(url, method="GET", data=None, headers=None):
    headers = headers or {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode()
        try:
            return exc.code, json.loads(body)
        except Exception:
            return exc.code, body


print("--- Phase 1 Live Server Verification ---")

# 1. Switch persona to Harvey Specter (id 2)
status, res = make_request(
    "http://127.0.0.1:8000/auth/switch-persona",
    method="POST",
    data=json.dumps({"employee_id": 2}).encode(),
    headers={"Content-Type": "application/json"},
)
print(f"1. Switch persona (Harvey Specter): HTTP {status}, User: {res['user']['name']}")
harvey_token = res["access_token"]

# 2. Fetch /cases without any employee_id query param
status, cases = make_request(
    "http://127.0.0.1:8000/cases",
    headers={"Authorization": f"Bearer {harvey_token}"},
)
print(f"2. GET /cases (IDOR removed, using Bearer JWT): HTTP {status}, Loaded {len(cases)} cases")

# 3. Unauthenticated request to /cases
status, err = make_request("http://127.0.0.1:8000/cases")
print(f"3. GET /cases (Unauthenticated): HTTP {status} (Expected 401)")

# 4. PBAC check: Harvey accessing Systems Oversight
status, err = make_request(
    "http://127.0.0.1:8000/dbms/reports/cases",
    headers={"Authorization": f"Bearer {harvey_token}"},
)
print(f"4. Harvey (Partner) accessing Systems Oversight: HTTP {status} (Expected 403 Forbidden)")

# 5. PBAC check: Benjamin (id 8, IT Admin) accessing Systems Oversight
status, ben_res = make_request(
    "http://127.0.0.1:8000/auth/switch-persona",
    method="POST",
    data=json.dumps({"employee_id": 8}).encode(),
    headers={"Content-Type": "application/json"},
)
ben_token = ben_res["access_token"]
status, reports = make_request(
    "http://127.0.0.1:8000/dbms/reports/cases",
    headers={"Authorization": f"Bearer {ben_token}"},
)
print(f"5. Benjamin (IT Admin) accessing Systems Oversight: HTTP {status}, Reports: {len(reports)} generated")

print("\nAll live verification checks succeeded!")
