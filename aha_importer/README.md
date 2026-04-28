# Aha! Feature Importer

Bulk-import features into Aha! Roadmaps via the REST API.
Built for: `hexagonppm.aha.io` / Product `CODAVC`

---

## Quick Start

### 1 — Clone / place this folder
```
/Users/assaf.halevy/Documents/GitHub/aha-importer/
```

### 2 — Install dependencies (one-time)
```bash
cd /Users/assaf.halevy/Documents/GitHub/aha-importer
pip3 install -r requirements.txt
```

### 3 — Add your API key
Edit `config.py`:
```python
AHA_API_KEY = "your_key_here"
```
Get your key from: https://hexagonppm.aha.io/settings/api_keys
(Profile → Settings → Developer → API keys → Generate key)

### 4 — Discover your workspace
```bash
python3 1_discover.py
```
This prints all your products, releases, workflow statuses, and custom fields.
Check that `Coda 2027` appears in the releases list.

### 5 — Generate the Excel template
```bash
python3 2_generate_template.py
```
Opens `features_import.xlsx` — fill in your 45 features.

### 6 — Fill the Excel
- Open `features_import.xlsx` in Excel or Numbers
- Row 3 is a yellow example — replace or delete it
- `Feature Name` is the only required column
- Use the dropdown in the `Workflow Status` column
- Save as `.xlsx` (not `.csv`)

### 7 — Run the import
```bash
python3 3_import_features.py
```
- Asks for confirmation before starting
- Stops on first error (configurable in `config.py`)
- Writes `import_results.xlsx` with a row-by-row status

---

## File Reference

| File | Purpose |
|------|---------|
| `config.py` | API key, subdomain, product key, target release |
| `1_discover.py` | Inspect your Aha! workspace — run first |
| `2_generate_template.py` | Generate `features_import.xlsx` |
| `3_import_features.py` | Read Excel → POST features to Aha! |
| `requirements.txt` | Python dependencies |
| `features_import.xlsx` | Your feature data (generated, then filled by you) |
| `discovery_output.txt` | Human-readable discovery output |
| `discovery_summary.json` | Machine-readable discovery data |
| `import_results.xlsx` | Row-by-row import results |

---

## After Import — Moving Features to Real Releases

Features are created in `Coda 2027` as a staging area.
Once you create your actual releases in Aha!, move features by:
1. Opening the feature in Aha!
2. Editing the **Release** field in the sidebar
   — OR —
Use **Aha! bulk edit**: select multiple features on the feature board → Edit → Release.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `401 Authentication failed` | Check `AHA_API_KEY` in config.py |
| `Release not found` | Ensure `TARGET_RELEASE_NAME` exactly matches the Aha! release name (case-sensitive) |
| `429 Too Many Requests` | Increase `RATE_LIMIT_PAUSE` in the importer (currently 0.4s) |
| `Feature Name is blank` | The importer skips rows with no name — check your Excel for empty rows |
| Custom fields not appearing | Run `1_discover.py` after creating at least one feature manually |

---

## Notes
- The importer does **not** deduplicate. Running it twice will create duplicates.
- Email notifications to team members are suppressed by default (`SUPPRESS_NOTIFICATIONS = True`).
- The `initiative_name` column is captured but not yet linked via API (Aha! requires the initiative ID). A future version can resolve initiative names to IDs.
