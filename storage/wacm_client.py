from typing import Dict, List

import requests
from requests.auth import HTTPBasicAuth


WACM_CONNECT_API = "https://api.wacm.wasabisys.com/api/v1"


class WACMClientError(Exception):
    pass


class WACMClient:
    def __init__(self, auth_identity: str, api_key: str, base_url: str = WACM_CONNECT_API):
        self.auth_identity = auth_identity
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def _auth(self):
        return HTTPBasicAuth(self.auth_identity, self.api_key)

    def _get(self, path: str, params=None):
        try:
            response = requests.get(
                f"{self.base_url}{path}",
                auth=self._auth(),
                params=params,
                timeout=30,
            )
            if response.status_code in (401, 403):
                raise WACMClientError("Authentication failed. Check the WACM username/account name and API key.")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout as exc:
            raise WACMClientError("WACM Connect request timed out.") from exc
        except requests.exceptions.RequestException as exc:
            raise WACMClientError(f"WACM Connect request failed: {exc}") from exc

    def list_sub_accounts(self) -> List[Dict]:
        accounts = self._collect_paginated_items("/sub-accounts")
        return [self._normalize_sub_account(account) for account in accounts]

    def get_usages(self, sub_account_id: str, start_date: str, end_date: str) -> List[Dict]:
        usage_rows = self._collect_paginated_items(
            "/usages",
            params={
                "subAccountId": sub_account_id,
                "from": start_date,
                "to": end_date,
            },
        )
        return [self._normalize_usage_row(row) for row in usage_rows]

    def _collect_paginated_items(self, path: str, params=None) -> List[Dict]:
        base_params = dict(params or {})
        first_payload = self._get(path, params=base_params)
        parsed = self._extract_items(first_payload)

        if parsed["items"] is None:
            raise WACMClientError(
                "Unexpected usage response from WACM Connect."
                if path == "/usages"
                else "Unexpected sub-account response from WACM Connect."
            )

        items = list(parsed["items"])
        total = parsed["total"]
        if total is None or len(items) >= total:
            return items

        page = parsed["page"] or 1
        size = parsed["size"] or len(items) or 100

        while len(items) < total:
            page += 1
            page_payload = self._get(
                path,
                params={**base_params, "page": page, "size": size},
            )
            page_parsed = self._extract_items(page_payload)
            if page_parsed["items"] is None:
                break
            if not page_parsed["items"]:
                break
            items.extend(page_parsed["items"])

        return items

    def _extract_items(self, payload: Dict) -> Dict:
        if isinstance(payload, list):
            return {"items": payload, "page": None, "size": None, "total": None}

        if isinstance(payload, dict):
            if isinstance(payload.get("data"), dict) and isinstance(payload["data"].get("items"), list):
                data = payload["data"]
                return {
                    "items": data["items"],
                    "page": self._to_int(data.get("page")),
                    "size": self._to_int(data.get("size")),
                    "total": self._to_int(data.get("total")),
                }

            if isinstance(payload.get("data"), list):
                return {"items": payload["data"], "page": None, "size": None, "total": None}

            if isinstance(payload.get("subAccounts"), list):
                return {"items": payload["subAccounts"], "page": None, "size": None, "total": None}

            if all(key in payload for key in ("endTime", "activeStorage", "deletedStorage")):
                return {"items": [payload], "page": None, "size": None, "total": None}

        return {"items": None, "page": None, "size": None, "total": None}

    def _to_int(self, value):
        if value in (None, ""):
            return None
        return int(value)

    def _normalize_sub_account(self, account: Dict) -> Dict:
        sub_account_id = str(account.get("id") or "").strip()
        account_number = str(
            account.get("accountNumber")
            or account.get("wasabiAccountNumber")
            or ""
        ).strip()
        name = str(
            account.get("name")
            or account.get("wasabiAccountName")
            or account_number
            or sub_account_id
        ).strip()

        if not sub_account_id:
            raise WACMClientError("Sub-account response is missing an id.")

        return {
            "sub_account_id": sub_account_id,
            "account_number": account_number,
            "name": name,
            "display_name": f"{name} ({account_number})" if account_number else name,
        }

    def _normalize_usage_row(self, row: Dict) -> Dict:
        end_time = row.get("endTime") or row.get("end_time")
        active_storage_tb = row.get("activeStorage")
        deleted_storage_tb = row.get("deletedStorage")

        if end_time is None or active_storage_tb is None or deleted_storage_tb is None:
            raise WACMClientError("Usage payload is missing endTime, activeStorage, or deletedStorage.")

        return {
            "date": str(end_time),
            "active_storage_tb": active_storage_tb,
            "deleted_storage_tb": deleted_storage_tb,
            "raw": dict(row),
        }
