# BambooHR-Web.ps1
# Cross-platform local web UI for BambooHR Tools (macOS + Windows)
# Usage: pwsh ./BambooHR-Web.ps1

#region ─── Config ───────────────────────────────────────────────────────────────────

function Read-IniFile($path) {
    $ini = @{}
    foreach ($line in Get-Content $path) {
        if ($line -match '^\s*([^=;#]+?)\s*=\s*(.+?)\s*$') { $ini[$matches[1]] = $matches[2] }
    }
    return $ini
}

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir "config.ini"
$cfg        = @{ Subdomain = ""; ApiKey = ""; EmployeeId = "" }

if (Test-Path $configPath) {
    $ini = Read-IniFile $configPath
    $cfg.Subdomain  = $ini["Subdomain"]
    $cfg.ApiKey     = $ini["ApiKey"]
    $cfg.EmployeeId = $ini["EmployeeId"]
}

$missing = @()
if (-not $cfg.Subdomain  -or $cfg.Subdomain  -match "YOUR_") { $missing += "Subdomain"  }
if (-not $cfg.ApiKey     -or $cfg.ApiKey     -match "YOUR_") { $missing += "ApiKey"     }
if (-not $cfg.EmployeeId -or $cfg.EmployeeId -match "YOUR_") { $missing += "EmployeeId" }
if ($missing.Count -gt 0) {
    Write-Host "[ERROR] config.ini is missing values for: $($missing -join ', ')" -ForegroundColor Red
    Write-Host "        Edit config.ini in the same folder and set real values."  -ForegroundColor DarkGray
    exit 1
}

#endregion

#region ─── Helpers ──────────────────────────────────────────────────────────────────

$DAY_NAMES = @("Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday")

function Get-AuthHeaders {
    $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($cfg.ApiKey):x"))
    @{ Authorization = "Basic $b64"; Accept = "application/json"; "Content-Type" = "application/json" }
}

function Get-WorkDays([datetime]$start, [datetime]$end) {
    $days = @(); $cur = $start.Date
    while ($cur -le $end.Date) {
        if ([int]$cur.DayOfWeek -le 4) { $days += $cur }
        $cur = $cur.AddDays(1)
    }
    return $days
}

function Send-Response($ctx, $json, [int]$status = 200, $contentType = "application/json; charset=utf-8") {
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    $ctx.Response.StatusCode      = $status
    $ctx.Response.ContentType     = $contentType
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.OutputStream.Close()
}

function Send-Json($ctx, $obj, [int]$status = 200) {
    Send-Response $ctx ($obj | ConvertTo-Json -Depth 10 -Compress) $status
}

# Serialize each element individually to avoid PowerShell unwrapping single-element arrays
function Send-JsonArray($ctx, $arr, [int]$status = 200) {
    $items = if ($arr -and @($arr).Count -gt 0) {
        (@($arr) | ForEach-Object { ConvertTo-Json -InputObject $_ -Depth 10 -Compress }) -join ","
    } else { "" }
    Send-Response $ctx "[$items]" $status
}

function Send-Error($ctx, $msg, [int]$status = 500) {
    Send-Response $ctx (@{ error = [string]$msg } | ConvertTo-Json -Compress) $status
}

#endregion

#region ─── HTML ─────────────────────────────────────────────────────────────────────

$html = @'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BambooHR Tools</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{display:flex;height:100vh;overflow:hidden;font-family:"Segoe UI",system-ui,sans-serif;font-size:13px;background:#16161E;color:#E1E1EB}
/* ── Sidebar ── */
#sidebar{width:220px;min-width:220px;display:flex;flex-direction:column;background:#0F0F14}
#side-head{padding:18px 22px 14px;border-bottom:1px solid #1E1E28}
#side-head .app-name{font-size:15px;font-weight:700;color:#E1E1EB}
#side-head .app-sub{font-size:11px;color:#6E6E82;margin-top:4px}
#side-nav{flex:1;padding-top:8px}
.nav-item{display:flex;align-items:center;height:54px;cursor:pointer}
.nav-item .bar{width:4px;height:54px;background:transparent;flex-shrink:0}
.nav-item .label{padding-left:20px;font-size:13px;color:#6E6E82}
.nav-item:hover{background:#1A1A24}
.nav-item.active{background:#261248}
.nav-item.active .bar{background:#6C2BD9}
.nav-item.active .label{color:#E1E1EB;font-weight:700}
#side-foot{padding:12px 16px;background:#0A0A0E;border-top:1px solid #1A1A24;font-size:11px;color:#6E6E82}
#side-foot .emp{color:#46465A;margin-top:4px}
/* ── Main ── */
#main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.page{display:none;flex-direction:column;height:100%}
.page.active{display:flex}
/* ── Control bar ── */
.ctrl-bar{background:#20202A;padding:0 20px;min-height:80px;display:flex;align-items:center;gap:16px;flex-shrink:0;border-bottom:1px solid #373748;flex-wrap:wrap}
.ctrl-bar .page-title{font-size:13px;font-weight:700;color:#E1E1EB;min-width:110px}
.date-group{display:flex;align-items:center;gap:8px}
.date-group label{font-size:11px;color:#6E6E82}
input[type="date"]{background:#282836;border:1px solid #373748;color:#E1E1EB;padding:6px 10px;border-radius:4px;font-size:12px;font-family:inherit}
input[type="date"]:focus{outline:1px solid #6C2BD9}
input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.6);cursor:pointer}
/* ── Buttons ── */
.btn{padding:7px 16px;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:inherit;font-weight:600;background:#6C2BD9;color:#E1E1EB}
.btn:hover:not(:disabled){background:#7B35F0}
.btn:disabled{opacity:0.4;cursor:default}
.btn.sec{background:#20202A;border:1px solid #373748;font-weight:400;color:#A0A0B8}
.btn.sec:hover:not(:disabled){background:#2A2A3A}
.btn.sm{padding:5px 12px;font-size:11px}
/* ── Info banner ── */
.banner{padding:10px 20px;font-size:12px;display:none;flex-shrink:0}
.banner.yellow{background:#2A2200;color:#FCC42A;border-bottom:1px solid #FCC42A44}
.banner.green{background:#002A10;color:#3CC369;border-bottom:1px solid #3CC36944}
.banner.red{background:#2A0000;color:#EE4848;border-bottom:1px solid #EE484844}
/* ── Stats cards ── */
#stats-row{display:none;gap:16px;padding:14px 20px;flex-shrink:0;flex-wrap:wrap}
.stat-card{background:#282836;border-radius:6px;padding:12px 18px;min-width:155px}
.stat-card .val{font-size:22px;font-weight:700;color:#E1E1EB}
.stat-card .lbl{font-size:11px;color:#6E6E82;margin-top:6px}
/* ── Task selector row (Fill Hours) ── */
#fill-tasks-row{display:flex;align-items:center;gap:12px;padding:10px 20px;background:#20202A;border-top:1px solid #1A1A24;border-bottom:1px solid #373748;flex-shrink:0;flex-wrap:wrap}
#fill-tasks-row label{font-size:11px;color:#6E6E82}
select{background:#282836;border:1px solid #373748;color:#E1E1EB;padding:5px 10px;border-radius:4px;font-size:12px;font-family:inherit;min-width:220px}
select:focus{outline:1px solid #6C2BD9}
/* ── Table ── */
.tbl-wrap{flex:1;overflow-y:auto}
table{width:100%;border-collapse:collapse}
thead tr{background:#20202A;position:sticky;top:0;z-index:1}
thead th{text-align:left;padding:10px 14px;font-size:11px;color:#6E6E82;font-weight:600;border-bottom:1px solid #373748}
tbody tr{border-bottom:1px solid #1E1E2A}
tbody tr:nth-child(even){background:#1C1C26}
tbody tr:hover{background:#222230}
tbody td{padding:9px 14px;font-size:12px;font-family:"Consolas","Courier New",monospace;color:#E1E1EB}
.cg{color:#3CC369!important}.cy{color:#FCC42A!important}.cc{color:#1CC6D2!important}.cm{color:#6E6E82!important}.cr{color:#EE4848!important}
/* ── Scrollbar ── */
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:#16161E}
::-webkit-scrollbar-thumb{background:#373748;border-radius:3px}
</style>
</head>
<body>

<nav id="sidebar">
  <div id="side-head">
    <div class="app-name">BambooHR</div>
    <div class="app-sub">Time Tools</div>
  </div>
  <div id="side-nav">
    <div class="nav-item active" data-page="get"><div class="bar"></div><span class="label">  Get Hours</span></div>
    <div class="nav-item" data-page="fill"><div class="bar"></div><span class="label">  Fill Hours</span></div>
    <div class="nav-item" data-page="tasks"><div class="bar"></div><span class="label">  Browse Tasks</span></div>
  </div>
  <div id="side-foot">
    <div id="foot-sub">Loading&#8230;</div>
    <div class="emp" id="foot-emp"></div>
  </div>
</nav>

<main id="main">

  <!-- ═══════════════ GET HOURS ═══════════════ -->
  <div class="page active" id="page-get">
    <div class="ctrl-bar">
      <span class="page-title">Get Hours</span>
      <div class="date-group"><label>From</label><input type="date" id="get-s"></div>
      <div class="date-group"><label>To</label><input type="date" id="get-e"></div>
      <button class="btn sm sec" id="get-tm">This Month</button>
      <button class="btn sm sec" id="get-lm">Last Month</button>
      <button class="btn" id="get-btn">Get Hours</button>
    </div>
    <div id="stats-row">
      <div class="stat-card"><div class="val" id="st-total">--</div><div class="lbl">Total Hours</div></div>
      <div class="stat-card"><div class="val" id="st-worked">--</div><div class="lbl">Days Worked</div></div>
      <div class="stat-card"><div class="val" id="st-off">--</div><div class="lbl">Days Off</div></div>
      <div class="stat-card"><div class="val" id="st-avg">--</div><div class="lbl">Avg / Day</div></div>
    </div>
    <div class="banner" id="get-banner"></div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Date</th><th>Day</th><th>Hours</th><th>Status</th><th>Project</th><th>Time</th><th>Task</th><th>Time Off</th></tr></thead>
        <tbody id="get-body"></tbody>
      </table>
    </div>
  </div>

  <!-- ═══════════════ FILL HOURS ═══════════════ -->
  <div class="page" id="page-fill">
    <div class="ctrl-bar">
      <span class="page-title">Fill Hours</span>
      <div class="date-group"><label>From</label><input type="date" id="fill-s"></div>
      <div class="date-group"><label>To</label><input type="date" id="fill-e"></div>
      <button class="btn sm sec" id="fill-tm">This Month</button>
      <button class="btn sm sec" id="fill-lm">Last Month</button>
      <button class="btn sec" id="fill-prev">Preview</button>
      <button class="btn" id="fill-do" disabled>Fill Missing</button>
    </div>
    <div id="fill-tasks-row">
      <label>Task 1 &nbsp;(7h &nbsp;09:00&#8211;16:00)</label>
      <select id="t1"><option value="46:170">(default: project 46, task 170)</option></select>
      <label>Task 2 &nbsp;(2h &nbsp;16:00&#8211;18:00)</label>
      <select id="t2"><option value="46:172">(default: project 46, task 172)</option></select>
      <button class="btn sm sec" id="fill-load">Load Tasks</button>
    </div>
    <div class="banner" id="fill-banner"></div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Date</th><th>Day</th><th>Status</th></tr></thead>
        <tbody id="fill-body"></tbody>
      </table>
    </div>
  </div>

  <!-- ═══════════════ BROWSE TASKS ═══════════════ -->
  <div class="page" id="page-tasks">
    <div class="ctrl-bar">
      <span class="page-title">Browse Tasks</span>
      <div class="date-group"><label>From</label><input type="date" id="tasks-s"></div>
      <div class="date-group"><label>To</label><input type="date" id="tasks-e"></div>
      <button class="btn sm sec" id="tasks-tm">This Month</button>
      <button class="btn sm sec" id="tasks-lm">Last Month</button>
      <button class="btn" id="tasks-btn">Fetch Tasks</button>
    </div>
    <div class="banner" id="tasks-banner"></div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Project ID</th><th>Project</th><th>Task ID</th><th>Task</th></tr></thead>
        <tbody id="tasks-body"></tbody>
      </table>
    </div>
  </div>

</main>

<script>
// ── Utilities ──────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function today()  { return new Date().toISOString().slice(0,10); }
function fom()    { const d=new Date(); d.setDate(1); return d.toISOString().slice(0,10); }
function folm()   { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,10); }
function lolm()   { const d=new Date(); d.setDate(0); return d.toISOString().slice(0,10); }
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }

function setBanner(id, msg, type) {
  const el = $(id);
  el.textContent = msg;
  el.className = 'banner ' + (msg ? type : '');
  el.style.display = msg ? 'block' : 'none';
}

async function apiFetch(path, opts) {
  const r = await fetch(path, opts);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

// ── Navigation ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    $('page-' + item.dataset.page).classList.add('active');
  });
});

// ── Config footer ──────────────────────────────────────────────────────────────
fetch('/api/config').then(r => r.json()).then(c => {
  $('foot-sub').textContent = c.subdomain + '.bamboohr.com';
  $('foot-emp').textContent = 'Employee ID: ' + c.employeeId;
}).catch(() => {});

// ── Default dates ──────────────────────────────────────────────────────────────
const t = today(), f = fom();
$('get-s').value = f;    $('get-e').value = t;
$('fill-s').value = f;   $('fill-e').value = t;
$('tasks-s').value = daysAgo(90); $('tasks-e').value = t;

function wireQuick(sId, eId, tmId, lmId) {
  $(tmId).addEventListener('click', () => { $(sId).value = fom(); $(eId).value = today(); });
  $(lmId).addEventListener('click', () => { $(sId).value = folm(); $(eId).value = lolm(); });
}
wireQuick('get-s',   'get-e',   'get-tm',   'get-lm');
wireQuick('fill-s',  'fill-e',  'fill-tm',  'fill-lm');
wireQuick('tasks-s', 'tasks-e', 'tasks-tm', 'tasks-lm');

// ── GET HOURS ──────────────────────────────────────────────────────────────────
$('get-btn').addEventListener('click', async () => {
  const btn = $('get-btn'), tbody = $('get-body'), sr = $('stats-row');
  const s = $('get-s').value, e = $('get-e').value;
  btn.textContent = 'Loading\u2026'; btn.disabled = true;
  tbody.innerHTML = ''; sr.style.display = 'none'; setBanner('get-banner', '', '');

  try {
    const days = await apiFetch('/api/hours?start=' + s + '&end=' + e);
    let totH = 0, worked = 0, offs = 0;

    for (const day of days) {
      const cls = day.status === 'Full day' ? 'cg'
                : day.status === 'Partial'  ? 'cy'
                : day.status === 'Time off' ? 'cc' : 'cm';
      const ents = (day.entries && day.entries.length > 0) ? day.entries : [null];

      ents.forEach((en, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td class="' + cls + '">' + (i === 0 ? day.date    : '') + '</td>' +
          '<td class="' + cls + '">' + (i === 0 ? day.dayName : '') + '</td>' +
          '<td class="' + cls + '">' + (i === 0 ? (day.hours > 0 ? day.hours + ' h' : '---') : '') + '</td>' +
          '<td class="' + cls + '">' + (i === 0 ? day.status  : '') + '</td>' +
          '<td class="' + cls + '">' + (en ? en.project : '') + '</td>' +
          '<td class="' + cls + '">' + (en ? en.time    : '') + '</td>' +
          '<td class="' + cls + '">' + (en ? en.task    : '') + '</td>' +
          '<td class="' + cls + '">' + (i === 0 && day.timeOff ? day.timeOff : '') + '</td>';
        tbody.appendChild(tr);
      });

      if (day.hours > 0) { totH = Math.round((totH + day.hours) * 100) / 100; worked++; }
      if (day.status === 'Time off') offs++;
    }

    const avg = worked > 0 ? Math.round(totH / worked * 100) / 100 : 0;
    $('st-total').textContent  = totH + ' h';
    $('st-worked').textContent = worked;
    $('st-off').textContent    = offs;
    $('st-avg').textContent    = avg + ' h';
    sr.style.display = 'flex';
  } catch (err) { setBanner('get-banner', err.message, 'red'); }

  btn.textContent = 'Get Hours'; btn.disabled = false;
});

// ── FILL HOURS: Load Tasks ─────────────────────────────────────────────────────
$('fill-load').addEventListener('click', async () => {
  const btn = $('fill-load');
  btn.textContent = '\u2026'; btn.disabled = true;

  try {
    const tasks = await apiFetch('/api/tasks?start=' + daysAgo(90) + '&end=' + today());
    ['t1', 't2'].forEach(id => {
      const sel = $(id); sel.innerHTML = '';
      tasks.forEach(t => {
        const o = document.createElement('option');
        o.value = t.projectId + ':' + t.taskId;
        o.textContent = t.projectName + ' / ' + t.taskName;
        sel.appendChild(o);
      });
    });
    const i170 = tasks.findIndex(t => t.taskId == 170);
    const i172 = tasks.findIndex(t => t.taskId == 172);
    if (i170 >= 0) $('t1').selectedIndex = i170;
    if (i172 >= 0) $('t2').selectedIndex = i172;
  } catch (err) { setBanner('fill-banner', err.message, 'red'); }

  btn.textContent = 'Load Tasks'; btn.disabled = false;
});

// ── FILL HOURS: Preview ────────────────────────────────────────────────────────
let pending = [];

$('fill-prev').addEventListener('click', async () => {
  const btn = $('fill-prev'), doBtn = $('fill-do'), tbody = $('fill-body');
  const s = $('fill-s').value, e = $('fill-e').value;
  btn.textContent = 'Loading\u2026'; btn.disabled = true;
  doBtn.disabled = true; tbody.innerHTML = ''; pending = [];
  setBanner('fill-banner', '', '');

  try {
    const days = await apiFetch('/api/hours?start=' + s + '&end=' + e);
    pending = days.filter(d => d.status === 'No data');

    days.forEach(day => {
      let st, cls;
      if      (day.status === 'No data')   { st = 'Will be filled';        cls = 'cy'; }
      else if (day.status === 'Time off')  { st = 'Time off \u2013 skip'; cls = 'cc'; }
      else                                 { st = 'Already has entries';   cls = 'cg'; }
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="' + cls + '">' + day.date    + '</td>' +
        '<td class="' + cls + '">' + day.dayName + '</td>' +
        '<td class="' + cls + '">' + st          + '</td>';
      tbody.appendChild(tr);
    });

    if (pending.length > 0) {
      setBanner('fill-banner',
        pending.length + ' day(s) will be filled: 09:00\u201316:00 (7h) + 16:00\u201318:00 (2h). Click \u201cFill Missing\u201d to proceed.',
        'yellow');
      doBtn.disabled = false;
    } else {
      setBanner('fill-banner', 'All work days already have entries.', 'green');
    }
  } catch (err) { setBanner('fill-banner', err.message, 'red'); }

  btn.textContent = 'Preview'; btn.disabled = false;
});

// ── FILL HOURS: Fill Missing ───────────────────────────────────────────────────
$('fill-do').addEventListener('click', async () => {
  if (!pending.length) return;
  const list = pending.map(d => d.date + ' (' + d.dayName + ')').join('\n');
  if (!confirm('Fill ' + pending.length + ' day(s)?\n\n' + list + '\n\nEach day: 7h (09:00\u201316:00) + 2h (16:00\u201318:00)')) return;

  const btn = $('fill-do'), tbody = $('fill-body');
  btn.textContent = 'Filling\u2026'; btn.disabled = true;

  const [p1, tk1] = $('t1').value.split(':');
  const [p2, tk2] = $('t2').value.split(':');
  const s = $('fill-s').value, e = $('fill-e').value;

  try {
    const result = await apiFetch('/api/fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: s, end: e,
        task1: { projectId: parseInt(p1), taskId: parseInt(tk1) },
        task2: { projectId: parseInt(p2), taskId: parseInt(tk2) }
      })
    });

    result.results.forEach(r => {
      for (const tr of tbody.rows) {
        if (tr.cells[0].textContent === r.date) {
          const cls = r.success ? 'cg' : 'cr';
          [0, 1, 2].forEach(i => tr.cells[i].className = cls);
          tr.cells[2].textContent = r.success ? 'Filled \u2713' : ('FAILED: ' + (r.error || ''));
          break;
        }
      }
    });

    setBanner('fill-banner',
      'Done.  Filled: ' + result.filled + '   Failed: ' + result.failed,
      result.failed === 0 ? 'green' : 'yellow');
    pending = [];
  } catch (err) { setBanner('fill-banner', err.message, 'red'); }

  btn.textContent = 'Fill Missing';
});

// ── BROWSE TASKS ───────────────────────────────────────────────────────────────
$('tasks-btn').addEventListener('click', async () => {
  const btn = $('tasks-btn'), tbody = $('tasks-body');
  const s = $('tasks-s').value, e = $('tasks-e').value;
  btn.textContent = 'Loading\u2026'; btn.disabled = true;
  tbody.innerHTML = ''; setBanner('tasks-banner', '', '');

  try {
    const tasks = await apiFetch('/api/tasks?start=' + s + '&end=' + e);
    if (!tasks.length) {
      setBanner('tasks-banner', 'No entries found in this date range. Try a wider range.', 'yellow');
    } else {
      tasks.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + t.projectId   + '</td>' +
          '<td>' + t.projectName + '</td>' +
          '<td>' + t.taskId      + '</td>' +
          '<td>' + t.taskName    + '</td>';
        tbody.appendChild(tr);
      });
    }
  } catch (err) { setBanner('tasks-banner', err.message, 'red'); }

  btn.textContent = 'Fetch Tasks'; btn.disabled = false;
});
</script>
</body>
</html>
'@

#endregion

#region ─── HTTP Server ──────────────────────────────────────────────────────────────

$port     = 8787
$prefix   = "http://localhost:$port/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "[ERROR] Could not start listener on port $port — is it already in use?" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  +-----------------------------------------+" -ForegroundColor DarkMagenta
Write-Host "  |   BambooHR Web Tools                    |" -ForegroundColor Magenta
Write-Host "  |   http://localhost:$port/               |" -ForegroundColor Magenta
Write-Host "  +-----------------------------------------+" -ForegroundColor DarkMagenta
Write-Host ""
Write-Host "  $($cfg.Subdomain).bamboohr.com  |  Employee $($cfg.EmployeeId)" -ForegroundColor DarkGray
Write-Host "  Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

Start-Process "http://localhost:$port/"

$htmlBytes = [Text.Encoding]::UTF8.GetBytes($html)

try {
    while ($listener.IsListening) {
        $ctx  = $listener.GetContext()
        $req  = $ctx.Request
        $path = $req.Url.AbsolutePath
        $meth = $req.HttpMethod

        # ── GET / ─────────────────────────────────────────────────────────────────
        if ($meth -eq "GET" -and ($path -eq "/" -or $path -eq "/index.html")) {
            $ctx.Response.StatusCode      = 200
            $ctx.Response.ContentType     = "text/html; charset=utf-8"
            $ctx.Response.ContentLength64 = $htmlBytes.Length
            $ctx.Response.OutputStream.Write($htmlBytes, 0, $htmlBytes.Length)
            $ctx.Response.OutputStream.Close()
        }

        # ── GET /api/config ───────────────────────────────────────────────────────
        elseif ($meth -eq "GET" -and $path -eq "/api/config") {
            Send-Json $ctx @{ subdomain = $cfg.Subdomain; employeeId = $cfg.EmployeeId }
        }

        # ── GET /api/hours?start=YYYY-MM-DD&end=YYYY-MM-DD ────────────────────────
        elseif ($meth -eq "GET" -and $path -eq "/api/hours") {
            $qs   = $req.QueryString
            $s    = $qs["start"]; $e = $qs["end"]
            $hdrs = Get-AuthHeaders
            $base = "https://$($cfg.Subdomain).bamboohr.com/api/v1"
            try {
                $entries = Invoke-RestMethod -Uri "$base/time_tracking/timesheet_entries?employeeIds=$($cfg.EmployeeId)&start=$s&end=$e" -Headers $hdrs -Method GET -ErrorAction Stop

                $toMap = @{}
                try {
                    foreach ($r in (Invoke-RestMethod -Uri "$base/time_off/requests/?employeeId=$($cfg.EmployeeId)&start=$s&end=$e&status=approved" -Headers $hdrs -Method GET -ErrorAction Stop)) {
                        $c = [datetime]::ParseExact($r.start, "yyyy-MM-dd", $null)
                        $t = [datetime]::ParseExact($r.end,   "yyyy-MM-dd", $null)
                        while ($c -le $t) { $toMap[$c.ToString("yyyy-MM-dd")] = $r.type.name; $c = $c.AddDays(1) }
                    }
                } catch {}

                $sd     = [datetime]::ParseExact($s, "yyyy-MM-dd", $null)
                $ed     = [datetime]::ParseExact($e, "yyyy-MM-dd", $null)
                $byDate = $entries | Group-Object -Property date
                $result = [System.Collections.Generic.List[object]]::new()

                foreach ($day in (Get-WorkDays $sd $ed)) {
                    $ds    = $day.ToString("yyyy-MM-dd")
                    $dname = $DAY_NAMES[[int]$day.DayOfWeek]
                    $grp   = $byDate | Where-Object { $_.Name -eq $ds }
                    $isOff = $toMap.ContainsKey($ds)
                    $hrs   = if ($grp) { [math]::Round(($grp.Group | Measure-Object -Property hours -Sum).Sum, 2) } else { 0 }
                    $status = if    ($hrs -ge 8) { "Full day" }
                              elseif($hrs -gt 0) { "Partial"  }
                              elseif($isOff)     { "Time off" }
                              else               { "No data"  }

                    $dayEnts = [System.Collections.Generic.List[object]]::new()
                    if ($grp) {
                        foreach ($en in ($grp.Group | Sort-Object start)) {
                            $t1 = [datetime]::Parse($en.start, [System.Globalization.CultureInfo]::InvariantCulture).ToLocalTime().ToString("HH:mm")
                            $t2 = [datetime]::Parse($en.end,   [System.Globalization.CultureInfo]::InvariantCulture).ToLocalTime().ToString("HH:mm")
                            $dayEnts.Add(@{
                                project = [string]$en.projectInfo.project.name
                                task    = [string]$en.projectInfo.task.name
                                time    = "$t1-$t2"
                            }) | Out-Null
                        }
                    }

                    $result.Add(@{
                        date    = $ds
                        dayName = $dname
                        hours   = $hrs
                        status  = $status
                        timeOff = if ($isOff) { $toMap[$ds] } else { "" }
                        entries = $dayEnts
                    }) | Out-Null
                }

                Send-JsonArray $ctx $result
            } catch {
                Send-Error $ctx $_.Exception.Message
            }
        }

        # ── GET /api/tasks?start=YYYY-MM-DD&end=YYYY-MM-DD ───────────────────────
        elseif ($meth -eq "GET" -and $path -eq "/api/tasks") {
            $qs   = $req.QueryString
            $s    = $qs["start"]; $e = $qs["end"]
            $hdrs = Get-AuthHeaders
            $base = "https://$($cfg.Subdomain).bamboohr.com/api/v1"
            try {
                $entries = Invoke-RestMethod -Uri "$base/time_tracking/timesheet_entries?employeeIds=$($cfg.EmployeeId)&start=$s&end=$e" -Headers $hdrs -Method GET -ErrorAction Stop
                $seen   = @{}
                $combos = [System.Collections.Generic.List[object]]::new()
                foreach ($en in $entries) {
                    $k = "$($en.projectInfo.project.id):$($en.projectInfo.task.id)"
                    if (-not $seen.ContainsKey($k)) {
                        $seen[$k] = $true
                        $combos.Add(@{
                            projectId   = [int]$en.projectInfo.project.id
                            projectName = [string]$en.projectInfo.project.name
                            taskId      = [int]$en.projectInfo.task.id
                            taskName    = [string]$en.projectInfo.task.name
                        }) | Out-Null
                    }
                }
                Send-JsonArray $ctx ($combos | Sort-Object projectId, taskId)
            } catch {
                Send-Error $ctx $_.Exception.Message
            }
        }

        # ── POST /api/fill ────────────────────────────────────────────────────────
        elseif ($meth -eq "POST" -and $path -eq "/api/fill") {
            try {
                $reader  = [System.IO.StreamReader]::new($req.InputStream, [Text.Encoding]::UTF8)
                $body    = $reader.ReadToEnd() | ConvertFrom-Json
                $s       = $body.start; $e = $body.end
                $task1   = $body.task1; $task2 = $body.task2
                $hdrs    = Get-AuthHeaders
                $base    = "https://$($cfg.Subdomain).bamboohr.com/api/v1"

                $entries  = Invoke-RestMethod -Uri "$base/time_tracking/timesheet_entries?employeeIds=$($cfg.EmployeeId)&start=$s&end=$e" -Headers $hdrs -Method GET -ErrorAction Stop
                $hasDates = $entries | Select-Object -ExpandProperty date -Unique

                $toMap = @{}
                try {
                    foreach ($r in (Invoke-RestMethod -Uri "$base/time_off/requests/?employeeId=$($cfg.EmployeeId)&start=$s&end=$e&status=approved" -Headers $hdrs -Method GET -ErrorAction Stop)) {
                        $c = [datetime]::ParseExact($r.start, "yyyy-MM-dd", $null)
                        $t = [datetime]::ParseExact($r.end,   "yyyy-MM-dd", $null)
                        while ($c -le $t) { $toMap[$c.ToString("yyyy-MM-dd")] = $true; $c = $c.AddDays(1) }
                    }
                } catch {}

                $sd     = [datetime]::ParseExact($s, "yyyy-MM-dd", $null)
                $ed     = [datetime]::ParseExact($e, "yyyy-MM-dd", $null)
                $toFill = Get-WorkDays $sd $ed | Where-Object {
                    $ds = $_.ToString("yyyy-MM-dd")
                    ($hasDates -notcontains $ds) -and (-not $toMap.ContainsKey($ds))
                }

                $postUrl = "$base/time_tracking/clock_entries/store"
                $filled  = 0; $failed = 0
                $results = [System.Collections.Generic.List[object]]::new()

                foreach ($day in $toFill) {
                    $ds      = $day.ToString("yyyy-MM-dd")
                    $dname   = $DAY_NAMES[[int]$day.DayOfWeek]
                    $payload = @{
                        entries = @(
                            @{ employeeId=[int]$cfg.EmployeeId; date=$ds; start="09:00"; end="16:00"; projectId=[int]$task1.projectId; taskId=[int]$task1.taskId; note="" },
                            @{ employeeId=[int]$cfg.EmployeeId; date=$ds; start="16:00"; end="18:00"; projectId=[int]$task2.projectId; taskId=[int]$task2.taskId; note="" }
                        )
                    } | ConvertTo-Json -Depth 5

                    $ok = $false; $errMsg = ""
                    try {
                        Invoke-RestMethod -Uri $postUrl -Headers $hdrs -Method POST -Body $payload -ErrorAction Stop | Out-Null
                        $ok = $true; $filled++
                    } catch {
                        $errMsg = $_.Exception.Message; $failed++
                    }
                    $results.Add(@{ date=$ds; dayName=$dname; success=$ok; error=$errMsg }) | Out-Null
                }

                Send-Json $ctx @{ filled=$filled; failed=$failed; results=@($results) }
            } catch {
                Send-Error $ctx $_.Exception.Message
            }
        }

        # ── 404 ───────────────────────────────────────────────────────────────────
        else {
            Send-Error $ctx "Not found" 404
        }
    }
} catch [System.Net.HttpListenerException] {
    # Normal shutdown (listener stopped)
} catch {
    Write-Host "  [ERROR] $_" -ForegroundColor Red
} finally {
    if ($listener.IsListening) { $listener.Stop() }
    Write-Host "  Server stopped." -ForegroundColor DarkGray
}

#endregion
