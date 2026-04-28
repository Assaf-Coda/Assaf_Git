from datetime import date

from flask import Flask, jsonify, render_template_string, request

from reporting import build_usage_report, get_recent_quarter_window
from wacm_client import WACMClient, WACMClientError

app = Flask(__name__)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Wasabi WACM Connect Usage Reporter</title>
    <style>
        :root {
            --bg: #f4efe6;
            --panel: #fffaf2;
            --ink: #1e1d1a;
            --muted: #6f685e;
            --line: #d8cdbd;
            --accent: #17594a;
            --accent-2: #c96b2c;
            --error: #a03328;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
            color: var(--ink);
            background:
                radial-gradient(circle at top left, rgba(201,107,44,0.18), transparent 28%),
                linear-gradient(135deg, #f8f2e8 0%, #efe6d7 55%, #e6dccb 100%);
            min-height: 100vh;
        }
        .shell { max-width: 1200px; margin: 0 auto; padding: 32px 20px 48px; }
        .hero, .panel {
            background: rgba(255, 250, 242, 0.94);
            border: 1px solid var(--line);
            border-radius: 18px;
            box-shadow: 0 18px 40px rgba(75, 54, 31, 0.09);
        }
        .hero { padding: 28px; margin-bottom: 24px; }
        .panel { padding: 22px; margin-bottom: 20px; }
        .eyebrow { text-transform: uppercase; letter-spacing: 0.18em; font-size: 12px; color: var(--accent); margin-bottom: 10px; }
        h1 { margin: 0 0 8px; font-size: 38px; line-height: 1.05; }
        .hero p { margin: 0; font-size: 16px; color: var(--muted); max-width: 760px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; align-items: end; }
        label { display: block; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; color: var(--muted); }
        input, select, button {
            width: 100%;
            border-radius: 12px;
            border: 1px solid var(--line);
            padding: 12px 14px;
            font-size: 15px;
        }
        input, select { background: #fffdf8; }
        button {
            background: linear-gradient(135deg, var(--accent) 0%, #0f4136 100%);
            color: white;
            cursor: pointer;
            border: none;
            font-weight: bold;
            letter-spacing: 0.04em;
        }
        button.secondary { background: linear-gradient(135deg, var(--accent-2) 0%, #9f4f1b 100%); }
        button:disabled { opacity: 0.65; cursor: wait; }
        .meta { margin-top: 12px; font-size: 14px; color: var(--muted); }
        .error { color: var(--error); font-weight: bold; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 18px; }
        .metric { padding: 16px; background: #fffdf8; border: 1px solid var(--line); border-radius: 14px; }
        .metric strong { display: block; font-size: 28px; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; background: #fffdf8; border-radius: 14px; overflow: hidden; }
        th, td { padding: 12px 14px; border-bottom: 1px solid var(--line); text-align: left; }
        th { background: #ece1d1; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; }
        tfoot td { font-weight: bold; background: #f2e7d7; }
        tr:last-child td { border-bottom: none; }
        .hidden { display: none; }
        @media (max-width: 640px) {
            h1 { font-size: 30px; }
            .shell { padding: 20px 14px 32px; }
            .panel, .hero { padding: 18px; }
        }
    </style>
</head>
<body>
    <div class="shell">
        <section class="hero">
            <div class="eyebrow">Internal Tool</div>
            <h1>Wasabi WACM Connect Usage Reporter</h1>
            <p>Authenticate with WACM Connect using either your WACM username or your account name, choose one sub-account, adjust the period if needed, and review monthly active and deleted storage totals with summed columns.</p>
        </section>

        <section class="panel">
            <div class="grid">
                <div>
                    <label for="authIdentity">WACM Username or Account Name</label>
                    <input id="authIdentity" type="text" placeholder="Enter WACM username or account name">
                </div>
                <div>
                    <label for="apiKey">WACM Connect API Key</label>
                    <input id="apiKey" type="password" placeholder="Enter API key">
                </div>
                <div>
                    <button id="loadAccountsBtn" onclick="loadAccounts()">Load Sub-Accounts</button>
                </div>
            </div>
            <div class="meta">Preset range: <span id="presetRangeText"></span></div>
            <div id="accountError" class="meta error"></div>
        </section>

        <section id="reportPanel" class="panel hidden">
            <div class="grid">
                <div>
                    <label for="accountSelect">Sub-Account</label>
                    <select id="accountSelect"></select>
                </div>
                <div>
                    <label for="startDate">Start Date</label>
                    <input id="startDate" type="date">
                </div>
                <div>
                    <label for="endDate">End Date</label>
                    <input id="endDate" type="date">
                </div>
                <div>
                    <button class="secondary" id="runReportBtn" onclick="runReport()">Run Report</button>
                </div>
            </div>
            <div class="meta">The quarter preset uses the most recently completed billing window and can be edited before running.</div>
            <div id="reportError" class="meta error"></div>
        </section>

        <section id="results" class="panel hidden"></section>
    </div>

    <script>
        let presetWindow = null;

        function formatNumber(value, digits = 2) {
            return Number(value).toLocaleString(undefined, {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits
            });
        }

        function setPresetFields(preset) {
            presetWindow = preset;
            document.getElementById('startDate').value = preset.start_date;
            document.getElementById('endDate').value = preset.end_date;
            document.getElementById('presetRangeText').textContent = preset.start_date + ' to ' + preset.end_date;
        }

        async function initPreset() {
            const response = await fetch('/preset-range');
            const data = await response.json();
            setPresetFields(data);
        }

        async function loadAccounts() {
            const authIdentity = document.getElementById('authIdentity').value.trim();
            const apiKey = document.getElementById('apiKey').value.trim();
            const loadButton = document.getElementById('loadAccountsBtn');
            document.getElementById('accountError').textContent = '';

            if (!authIdentity || !apiKey) {
                document.getElementById('accountError').textContent = 'Enter the WACM username/account name and API key.';
                return;
            }

            loadButton.disabled = true;
            try {
                const response = await fetch('/accounts', {
                    headers: {
                        'X-WACM-Identity': authIdentity,
                        'X-Api-Key': apiKey
                    }
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load sub-accounts.');
                }

                const select = document.getElementById('accountSelect');
                select.innerHTML = '';
                data.accounts.forEach((account) => {
                    const option = document.createElement('option');
                    option.value = account.sub_account_id;
                    option.textContent = account.display_name;
                    select.appendChild(option);
                });
                document.getElementById('reportPanel').classList.remove('hidden');
            } catch (error) {
                document.getElementById('accountError').textContent = error.message;
            } finally {
                loadButton.disabled = false;
            }
        }

        async function runReport() {
            const authIdentity = document.getElementById('authIdentity').value.trim();
            const apiKey = document.getElementById('apiKey').value.trim();
            const subAccountId = document.getElementById('accountSelect').value;
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const runButton = document.getElementById('runReportBtn');
            document.getElementById('reportError').textContent = '';

            if (!authIdentity || !apiKey || !subAccountId || !startDate || !endDate) {
                document.getElementById('reportError').textContent = 'Username/account name, API key, sub-account, start date, and end date are required.';
                return;
            }

            runButton.disabled = true;
            try {
                const response = await fetch('/report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WACM-Identity': authIdentity,
                        'X-Api-Key': apiKey
                    },
                    body: JSON.stringify({
                        sub_account_id: subAccountId,
                        start_date: startDate,
                        end_date: endDate
                    })
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to generate report.');
                }

                renderResults(data);
            } catch (error) {
                document.getElementById('reportError').textContent = error.message;
            } finally {
                runButton.disabled = false;
            }
        }

        function renderResults(report) {
            const resultEl = document.getElementById('results');
            const presetUsed = presetWindow &&
                report.range.start_date === presetWindow.start_date &&
                report.range.end_date === presetWindow.end_date;

            const monthlyRows = report.monthly_rows.map((row) =>
                '<tr><td>' + row.month + '</td><td>' + formatNumber(row.active_gb, 2) + '</td><td>' + formatNumber(row.deleted_gb, 2) + '</td><td>' + formatNumber(row.active_tb, 6) + '</td><td>' + formatNumber(row.active_plus_deleted_gb, 2) + '</td></tr>'
            ).join('');

            const footer = '<tr><td>Total</td><td>' +
                formatNumber(report.totals.active_gb, 2) + '</td><td>' +
                formatNumber(report.totals.deleted_gb, 2) + '</td><td>' +
                formatNumber(report.totals.active_tb, 6) + '</td><td>' +
                formatNumber(report.totals.active_plus_deleted_gb, 2) + '</td></tr>';

            resultEl.innerHTML = `
                <div class="summary">
                    <div class="metric">
                        Range
                        <strong>${report.range.start_date} -> ${report.range.end_date}</strong>
                    </div>
                    <div class="metric">
                        Total Active GB
                        <strong>${formatNumber(report.totals.active_gb, 2)}</strong>
                    </div>
                    <div class="metric">
                        Total Deleted GB
                        <strong>${formatNumber(report.totals.deleted_gb, 2)}</strong>
                    </div>
                    <div class="metric">
                        Daily Records
                        <strong>${report.totals.days}</strong>
                    </div>
                </div>
                <div class="meta">
                    Account: ${report.account.name} (${report.account.account_number || report.account.sub_account_id})<br>
                    Preset used exactly: ${presetUsed ? 'Yes' : 'No'}
                </div>
                <h2>Monthly Storage Summary</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Total Active Storage (GB)</th>
                            <th>Total Deleted Storage (GB)</th>
                            <th>Total Active Storage (TB)</th>
                            <th>Total Active + Deleted Storage (GB)</th>
                        </tr>
                    </thead>
                    <tbody>${monthlyRows || '<tr><td colspan="5">No usage rows returned for the selected range.</td></tr>'}</tbody>
                    <tfoot>${footer}</tfoot>
                </table>
            `;
            resultEl.classList.remove('hidden');
        }

        initPreset();
    </script>
</body>
</html>
"""


def _require_credentials():
    auth_identity = request.headers.get("X-WACM-Identity", "").strip()
    api_key = request.headers.get("X-Api-Key", "").strip()
    if not auth_identity or not api_key:
        return None, None, (jsonify({"error": "Missing WACM username/account name or API key"}), 400)
    return auth_identity, api_key, None


@app.route("/")
def index():
    return render_template_string(HTML_TEMPLATE)


@app.route("/preset-range", methods=["GET"])
def preset_range():
    return jsonify(get_recent_quarter_window(today=date.today()))


@app.route("/accounts", methods=["GET"])
def list_accounts():
    auth_identity, api_key, error_response = _require_credentials()
    if error_response:
        return error_response

    try:
        accounts = WACMClient(auth_identity, api_key).list_sub_accounts()
        accounts.sort(key=lambda item: item["display_name"].lower())
        return jsonify({"accounts": accounts})
    except WACMClientError as exc:
        return jsonify({"error": str(exc)}), 502


@app.route("/report", methods=["POST"])
def report():
    auth_identity, api_key, error_response = _require_credentials()
    if error_response:
        return error_response

    payload = request.get_json(silent=True) or {}
    sub_account_id = str(payload.get("sub_account_id", "")).strip()
    start_date = str(payload.get("start_date", "")).strip()
    end_date = str(payload.get("end_date", "")).strip()

    if not sub_account_id or not start_date or not end_date:
        return jsonify({"error": "sub_account_id, start_date, and end_date are required"}), 400

    client = WACMClient(auth_identity, api_key)
    try:
        accounts = client.list_sub_accounts()
        account = next((item for item in accounts if item["sub_account_id"] == sub_account_id), None)
        if account is None:
            return jsonify({"error": "Selected sub-account was not found"}), 404

        usage_rows = client.get_usages(sub_account_id, start_date, end_date)
        report_payload = build_usage_report(
            usage_rows,
            start_date=start_date,
            end_date=end_date,
            account=account,
            preset_applied=False,
        )
        report_payload["source"] = "wacm_connect"
        return jsonify(report_payload)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except WACMClientError as exc:
        return jsonify({"error": str(exc)}), 502


if __name__ == "__main__":
    app.run(debug=True)
