import unittest
from unittest.mock import patch

from app import app
from reporting import build_usage_report, get_recent_quarter_window
from wacm_client import WACMClient


class ReportingLogicTests(unittest.TestCase):
    def test_build_usage_report_aggregates_active_and_deleted_by_month(self):
        report = build_usage_report(
            [
                {"date": "2026-03-20", "active_storage_tb": 1.5, "deleted_storage_tb": 0.5},
                {"date": "2026-03-21", "active_storage_tb": 2.0, "deleted_storage_tb": 0.25},
                {"date": "2026-04-01", "active_storage_tb": 3.0, "deleted_storage_tb": 1.0},
            ],
            start_date="2026-03-20",
            end_date="2026-04-01",
        )

        self.assertEqual(
            report["monthly_rows"],
            [
                {
                    "month": "2026-03",
                    "active_gb": 3584.0,
                    "deleted_gb": 768.0,
                    "active_tb": 3.5,
                    "active_plus_deleted_gb": 4352.0,
                },
                {
                    "month": "2026-04",
                    "active_gb": 3072.0,
                    "deleted_gb": 1024.0,
                    "active_tb": 3.0,
                    "active_plus_deleted_gb": 4096.0,
                },
            ],
        )
        self.assertEqual(
            report["totals"],
            {
                "active_gb": 6656.0,
                "deleted_gb": 1792.0,
                "active_tb": 6.5,
                "active_plus_deleted_gb": 8448.0,
                "days": 3,
            },
        )

    def test_recent_quarter_window_uses_last_completed_window(self):
        preset = get_recent_quarter_window(today="2026-03-21")
        self.assertEqual(
            preset,
            {
                "start_date": "2025-12-21",
                "end_date": "2026-03-20",
                "preset_applied": True,
            },
        )

    def test_partial_month_only_counts_included_dates(self):
        report = build_usage_report(
            [
                {"date": "2026-06-19", "active_storage_tb": 10, "deleted_storage_tb": 1},
                {"date": "2026-06-20", "active_storage_tb": 11, "deleted_storage_tb": 2},
                {"date": "2026-06-21", "active_storage_tb": 12, "deleted_storage_tb": 3},
            ],
            start_date="2026-06-20",
            end_date="2026-06-20",
        )
        self.assertEqual(
            report["monthly_rows"],
            [{"month": "2026-06", "active_gb": 11264.0, "deleted_gb": 2048.0, "active_tb": 11.0, "active_plus_deleted_gb": 13312.0}],
        )


class FlaskRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_accounts_route_requires_credentials(self):
        response = self.client.get("/accounts")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Missing WACM username/account name or API key")

    @patch("app.WACMClient")
    def test_accounts_route_returns_display_accounts(self, client_cls):
        client_cls.return_value.list_sub_accounts.return_value = [
            {"sub_account_id": "200", "account_number": "222", "name": "Beta", "display_name": "Beta (222)"},
            {"sub_account_id": "100", "account_number": "111", "name": "Alpha", "display_name": "Alpha (111)"},
        ]

        response = self.client.get("/accounts", headers={"X-WACM-Identity": "user", "X-Api-Key": "secret"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json()["accounts"],
            [
                {"sub_account_id": "100", "account_number": "111", "name": "Alpha", "display_name": "Alpha (111)"},
                {"sub_account_id": "200", "account_number": "222", "name": "Beta", "display_name": "Beta (222)"},
            ],
        )

    @patch("app.WACMClient")
    def test_report_route_returns_monthly_storage_fields(self, client_cls):
        client = client_cls.return_value
        client.list_sub_accounts.return_value = [
            {"sub_account_id": "100", "account_number": "111", "name": "Alpha", "display_name": "Alpha (111)"}
        ]
        client.get_usages.return_value = [
            {"date": "2026-03-20T23:59:59Z", "active_storage_tb": 2.0, "deleted_storage_tb": 1.0},
            {"date": "2026-03-21T23:59:59Z", "active_storage_tb": 3.0, "deleted_storage_tb": 0.5},
            {"date": "2026-04-01T23:59:59Z", "active_storage_tb": 4.0, "deleted_storage_tb": 2.0},
        ]

        response = self.client.post(
            "/report",
            headers={"X-WACM-Identity": "user", "X-Api-Key": "secret"},
            json={
                "sub_account_id": "100",
                "start_date": "2026-03-20",
                "end_date": "2026-04-01",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["account"]["name"], "Alpha")
        self.assertEqual(
            payload["monthly_rows"],
            [
                {
                    "month": "2026-03",
                    "active_gb": 5120.0,
                    "deleted_gb": 1536.0,
                    "active_tb": 5.0,
                    "active_plus_deleted_gb": 6656.0,
                },
                {
                    "month": "2026-04",
                    "active_gb": 4096.0,
                    "deleted_gb": 2048.0,
                    "active_tb": 4.0,
                    "active_plus_deleted_gb": 6144.0,
                },
            ],
        )
        self.assertEqual(
            payload["totals"],
            {
                "active_gb": 9216.0,
                "deleted_gb": 3584.0,
                "active_tb": 9.0,
                "active_plus_deleted_gb": 12800.0,
                "days": 3,
            },
        )
        self.assertEqual(payload["source"], "wacm_connect")


class WACMClientTests(unittest.TestCase):
    def test_list_sub_accounts_accepts_data_items_envelope(self):
        client = WACMClient("identity", "secret")
        with patch.object(client, "_get", return_value={
            "success": True,
            "data": {
                "items": [
                    {
                        "id": 100,
                        "wasabiAccountNumber": "123456",
                        "wasabiAccountName": "Alpha Account",
                    }
                ]
            }
        }):
            accounts = client.list_sub_accounts()

        self.assertEqual(
            accounts,
            [
                {
                    "sub_account_id": "100",
                    "account_number": "123456",
                    "name": "Alpha Account",
                    "display_name": "Alpha Account (123456)",
                }
            ],
        )

    def test_get_usages_accepts_data_items_envelope(self):
        client = WACMClient("identity", "secret")
        with patch.object(client, "_get", return_value={
            "success": True,
            "data": {
                "items": [
                    {
                        "endTime": "2026-03-20T23:59:59Z",
                        "activeStorage": 2.0,
                        "deletedStorage": 1.0,
                    }
                ]
            }
        }):
            usages = client.get_usages("100", "2026-03-20", "2026-03-20")

        self.assertEqual(
            usages,
            [
                {
                    "date": "2026-03-20T23:59:59Z",
                    "active_storage_tb": 2.0,
                    "deleted_storage_tb": 1.0,
                    "raw": {
                        "endTime": "2026-03-20T23:59:59Z",
                        "activeStorage": 2.0,
                        "deletedStorage": 1.0,
                    },
                }
            ],
        )

    def test_get_usages_accepts_single_object_payload(self):
        client = WACMClient("identity", "secret")
        with patch.object(client, "_get", return_value={
            "endTime": "2026-03-20T23:59:59Z",
            "activeStorage": 2.0,
            "deletedStorage": 1.0,
        }):
            usages = client.get_usages("100", "2026-03-20", "2026-03-20")

        self.assertEqual(len(usages), 1)
        self.assertEqual(usages[0]["active_storage_tb"], 2.0)

    def test_get_usages_fetches_all_pages_from_data_items_envelope(self):
        client = WACMClient("identity", "secret")
        payloads = [
            {
                "success": True,
                "data": {
                    "items": [
                        {
                            "endTime": "2026-01-31T23:59:59Z",
                            "activeStorage": 2.0,
                            "deletedStorage": 1.0,
                        }
                    ],
                    "page": 1,
                    "size": 1,
                    "total": 3,
                },
            },
            {
                "success": True,
                "data": {
                    "items": [
                        {
                            "endTime": "2026-02-29T23:59:59Z",
                            "activeStorage": 3.0,
                            "deletedStorage": 1.5,
                        }
                    ],
                    "page": 2,
                    "size": 1,
                    "total": 3,
                },
            },
            {
                "success": True,
                "data": {
                    "items": [
                        {
                            "endTime": "2026-03-31T23:59:59Z",
                            "activeStorage": 4.0,
                            "deletedStorage": 2.0,
                        }
                    ],
                    "page": 3,
                    "size": 1,
                    "total": 3,
                },
            },
        ]
        with patch.object(client, "_get", side_effect=payloads):
            usages = client.get_usages("100", "2026-01-01", "2026-03-31")

        self.assertEqual(len(usages), 3)
        self.assertEqual(usages[2]["date"], "2026-03-31T23:59:59Z")

    def test_list_sub_accounts_fetches_all_pages(self):
        client = WACMClient("identity", "secret")
        payloads = [
            {
                "success": True,
                "data": {
                    "items": [{"id": 1, "wasabiAccountNumber": "111", "wasabiAccountName": "Alpha"}],
                    "page": 1,
                    "size": 1,
                    "total": 2,
                },
            },
            {
                "success": True,
                "data": {
                    "items": [{"id": 2, "wasabiAccountNumber": "222", "wasabiAccountName": "Beta"}],
                    "page": 2,
                    "size": 1,
                    "total": 2,
                },
            },
        ]
        with patch.object(client, "_get", side_effect=payloads):
            accounts = client.list_sub_accounts()

        self.assertEqual(len(accounts), 2)
        self.assertEqual(accounts[1]["name"], "Beta")


if __name__ == "__main__":
    unittest.main()
