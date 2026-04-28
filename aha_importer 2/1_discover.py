#!/usr/bin/env python3
"""
1_discover.py
─────────────
Connects to your Aha! account and prints:
  • All products / sub-products you have access to
  • Releases for CODAVC
  • Workflow statuses for features
  • Custom fields defined on features

Run this BEFORE generating the template.
Output is also saved to discovery_output.txt for reference.
"""

import sys
import json
import requests
from config import AHA_API_KEY, AHA_SUBDOMAIN, PRODUCT_KEY

BASE_URL = f"https://{AHA_SUBDOMAIN}.aha.io/api/v1"
HEADERS = {
    "Authorization": f"Bearer {AHA_API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": f"aha-importer/1.0 ({AHA_SUBDOMAIN})",
}

output_lines = []


def pr(text=""):
    print(text)
    output_lines.append(text)


def get(path, params=None):
    url = f"{BASE_URL}{path}"
    resp = requests.get(url, headers=HEADERS, params=params)
    if resp.status_code == 401:
        pr("❌  Authentication failed. Check AHA_API_KEY in config.py")
        sys.exit(1)
    if resp.status_code == 404:
        pr(f"❌  Not found: {url}")
        return None
    resp.raise_for_status()
    return resp.json()


# ── 1. Products ──────────────────────────────────────────────────────────────
pr("=" * 60)
pr("PRODUCTS & SUB-PRODUCTS")
pr("=" * 60)

data = get("/products")
if not data:
    pr("No products found.")
    sys.exit(1)

products = data.get("products", [])
for p in products:
    prefix = p.get("reference_prefix", p.get("product_key", "?"))
    marker = " ◀ TARGET" if prefix == PRODUCT_KEY else ""
    pr(f"  {prefix:20s}  {p['name']}{marker}")

pr()

# ── 2. Releases for target product ──────────────────────────────────────────
pr("=" * 60)
pr(f"RELEASES  ({PRODUCT_KEY})")
pr("=" * 60)

releases_data = get(f"/products/{PRODUCT_KEY}/releases", params={"per_page": 50})
releases = releases_data.get("releases", []) if releases_data else []

if not releases:
    pr("  ⚠️  No releases found. Create at least one release in Aha! before importing.")
else:
    for r in releases:
        pr(f"  {r['reference_num']:15s}  {r['name']}")

pr()

# ── 3. Feature workflow statuses ─────────────────────────────────────────────
pr("=" * 60)
pr(f"FEATURE WORKFLOW STATUSES  ({PRODUCT_KEY})")
pr("=" * 60)

# Fetch an existing feature to discover statuses, or use the workflow endpoint
wf_data = get(f"/products/{PRODUCT_KEY}/workflow_statuses", params={"record_type": "feature"})
if wf_data:
    statuses = wf_data.get("workflow_statuses", [])
    for s in statuses:
        pr(f"  {s.get('name', '?')}")
else:
    pr("  (Could not retrieve statuses — will use 'Under consideration' as default)")

pr()

# ── 4. Custom fields ─────────────────────────────────────────────────────────
pr("=" * 60)
pr(f"CUSTOM FIELDS ON FEATURES  ({PRODUCT_KEY})")
pr("=" * 60)

# Fetch one feature to inspect its custom_fields schema
features_data = get(f"/products/{PRODUCT_KEY}/features", params={"per_page": 1})
features = features_data.get("features", []) if features_data else []

if features:
    feature_id = features[0]["reference_num"]
    detail = get(f"/features/{feature_id}")
    if detail:
        cf = detail.get("feature", {}).get("custom_fields", [])
        if cf:
            pr(f"  {'API Key':30s}  {'Label':30s}  {'Type'}")
            pr(f"  {'-'*30}  {'-'*30}  {'-'*20}")
            for field in cf:
                pr(f"  {field.get('key',''):30s}  {field.get('name',''):30s}  {field.get('type','')}")
        else:
            pr("  No custom fields found on features yet.")
    else:
        pr("  Could not fetch feature detail.")
else:
    pr("  No features exist yet — custom fields cannot be introspected.")
    pr("  Create one test feature manually in Aha! then re-run this script.")

pr()

# ── 5. Summary JSON (for template generator) ─────────────────────────────────
summary = {
    "product_key": PRODUCT_KEY,
    "releases": [{"ref": r["reference_num"], "name": r["name"]} for r in releases],
}

with open("discovery_output.txt", "w") as f:
    f.write("\n".join(output_lines))

with open("discovery_summary.json", "w") as f:
    json.dump(summary, f, indent=2)

pr("=" * 60)
pr("✅  Discovery complete.")
pr("    discovery_output.txt  — human-readable reference")
pr("    discovery_summary.json — used by 2_generate_template.py")
pr("=" * 60)
