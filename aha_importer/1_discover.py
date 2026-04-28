#!/usr/bin/env python3
"""
1_discover.py
─────────────
Connects to your Aha! account and discovers:
  • Products / sub-products
  • Releases for CODAVC
  • Feature workflow statuses
  • Custom field definitions + their dropdown options

Saves discovery_summary.json for use by 2_generate_template.py.
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
        pr(f"⚠️  Not found: {url}")
        return None
    resp.raise_for_status()
    return resp.json()


def get_all_pages(path, collection_key, params=None):
    if params is None:
        params = {}
    params["per_page"] = 200
    page = 1
    all_items = []
    while True:
        params["page"] = page
        data = get(path, params)
        if not data:
            break
        items = data.get(collection_key, [])
        all_items.extend(items)
        pagination = data.get("pagination", {})
        if page >= pagination.get("total_pages", 1):
            break
        page += 1
    return all_items


# ── 1. Products ──────────────────────────────────────────────────────────────
pr("=" * 70)
pr("PRODUCTS & SUB-PRODUCTS")
pr("=" * 70)

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

# ── 2. Releases ─────────────────────────────────────────────────────────────
pr("=" * 70)
pr(f"RELEASES  ({PRODUCT_KEY})")
pr("=" * 70)

releases = get_all_pages(f"/products/{PRODUCT_KEY}/releases", "releases")
if not releases:
    pr("  ⚠️  No releases found. Create at least one before importing.")
else:
    for r in releases:
        pr(f"  {r.get('reference_num','?'):15s}  {r['name']}")

pr()

# ── 3. Workflow statuses ────────────────────────────────────────────────────
pr("=" * 70)
pr(f"FEATURE WORKFLOW STATUSES  ({PRODUCT_KEY})")
pr("=" * 70)

statuses_list = []
wf_data = get(f"/products/{PRODUCT_KEY}/workflow_statuses", params={"record_type": "feature"})
if wf_data:
    statuses_list = [s.get("name", "?") for s in wf_data.get("workflow_statuses", [])]

if statuses_list:
    for s in statuses_list:
        pr(f"  {s}")
else:
    pr("  (Could not retrieve — will use defaults)")

pr()

# ── 4. Custom fields + dropdown options ─────────────────────────────────────
pr("=" * 70)
pr(f"CUSTOM FIELDS ON FEATURES  ({PRODUCT_KEY})")
pr("=" * 70)

custom_fields_info = []

# Fetch one feature to get the custom_fields structure
features_page = get(f"/products/{PRODUCT_KEY}/features", params={"per_page": 1})
features = features_page.get("features", []) if features_page else []
feature_custom_fields = []

if features:
    detail = get(f"/features/{features[0]['reference_num']}")
    if detail:
        feature_custom_fields = detail.get("feature", {}).get("custom_fields", [])

# Fetch all custom_field_definitions for options lookup
cf_defs = get_all_pages("/custom_field_definitions", "custom_field_definitions")
cf_def_by_key = {}
for d in cf_defs:
    cf_def_by_key[d.get("key", "")] = d

if feature_custom_fields:
    pr(f"  {'API Key':30s}  {'Label':30s}  {'Type':20s}  {'Options'}")
    pr(f"  {'-'*30}  {'-'*30}  {'-'*20}  {'-'*30}")

    for field in feature_custom_fields:
        key = field.get("key", "")
        name = field.get("name", "")
        ftype = field.get("type", "")

        options = []
        defn = cf_def_by_key.get(key)
        if defn:
            defn_id = defn.get("id")
            if defn_id and ftype in (
                "predefined_choice_list", "editable_choice_list", "tags",
                "scored_choice_list"
            ):
                opts_data = get(f"/custom_field_definitions/{defn_id}/options")
                if opts_data:
                    options = [
                        o.get("label", o.get("value", "?"))
                        for o in opts_data.get("options", [])
                    ]

        opts_str = ", ".join(options[:8]) if options else "(text / no predefined options)"
        if len(options) > 8:
            opts_str += f" ... +{len(options)-8} more"

        pr(f"  {key:30s}  {name:30s}  {ftype:20s}  {opts_str}")

        custom_fields_info.append({
            "key": key,
            "name": name,
            "type": ftype,
            "options": options,
        })
else:
    pr("  No features exist yet — cannot introspect custom fields.")
    pr("  Create one test feature manually, then re-run this script.")

pr()

# ── 5. Save summary ─────────────────────────────────────────────────────────
summary = {
    "product_key": PRODUCT_KEY,
    "releases": [{"ref": r.get("reference_num", "?"), "name": r["name"]} for r in releases],
    "workflow_statuses": statuses_list,
    "custom_fields": custom_fields_info,
}

with open("discovery_output.txt", "w") as f:
    f.write("\n".join(output_lines))

with open("discovery_summary.json", "w") as f:
    json.dump(summary, f, indent=2)

pr("=" * 70)
pr("✅  Discovery complete.")
pr("    discovery_output.txt   — human-readable reference")
pr("    discovery_summary.json — used by 2_generate_template.py")
pr("=" * 70)