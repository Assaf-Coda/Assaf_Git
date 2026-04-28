# ── Aha! API Configuration ─────────────────────────────────────────────────
# Get your API key from: https://hexagonppm.aha.io/settings/api_keys
AHA_API_KEY = "r8ChOjKh1aN6kB-61ZeSTJ5EWytZ6YeEntsoOWI9THg"

# Your Aha! subdomain (the part before .aha.io)
AHA_SUBDOMAIN = "hexagonppm"

# The product prefix you are importing into
PRODUCT_KEY = "CODAVC"

# The exact release name to drop all features into initially
# Run 1_discover.py first to see available releases
TARGET_RELEASE_NAME = "Coda 2027"

# ── Import Behaviour ────────────────────────────────────────────────────────
# Stop on first API error (True) or continue and log (False)
STOP_ON_ERROR = True

# Suppress Aha! email notifications during import (recommended: True)
SUPPRESS_NOTIFICATIONS = True
