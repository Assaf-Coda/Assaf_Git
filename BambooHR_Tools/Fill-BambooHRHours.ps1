param(
    [string]$Subdomain  = "",
    [string]$ApiKey     = "",
    [string]$EmployeeId = "",
    [string]$StartDate  = "",
    [string]$EndDate    = ""
)

function Read-IniFile($path) {
    $ini = @{}
    foreach ($line in Get-Content $path) {
        if ($line -match '^\s*([^=;#]+?)\s*=\s*(.+?)\s*$') {
            $ini[$matches[1]] = $matches[2]
        }
    }
    return $ini
}

$configPath = Join-Path $PSScriptRoot "config.ini"
if (Test-Path $configPath) {
    $config = Read-IniFile $configPath
    if ($Subdomain  -eq "") { $Subdomain  = $config["Subdomain"] }
    if ($ApiKey     -eq "") { $ApiKey     = $config["ApiKey"] }
    if ($EmployeeId -eq "") { $EmployeeId = $config["EmployeeId"] }
}

function Get-WorkDays([datetime]$start, [datetime]$end) {
    $days = @()
    $cur  = $start.Date
    while ($cur -le $end.Date) {
        if ([int]$cur.DayOfWeek -le 4) { $days += $cur }
        $cur = $cur.AddDays(1)
    }
    return $days
}

Write-Host ""
Write-Host "  +------------------------------------------+" -ForegroundColor DarkMagenta
Write-Host "  |   BambooHR Hours Auto-Filler             |" -ForegroundColor Magenta
Write-Host "  |   Work Days: Sunday - Thursday           |" -ForegroundColor Magenta
Write-Host "  +------------------------------------------+" -ForegroundColor DarkMagenta
Write-Host ""

if ($StartDate -eq "") { $StartDate = Read-Host "  Start date (YYYY-MM-DD)" }
if ($EndDate   -eq "") { $EndDate   = Read-Host "  End date   (YYYY-MM-DD)" }

try {
    $start = [datetime]::ParseExact($StartDate, "yyyy-MM-dd", $null)
    $end   = [datetime]::ParseExact($EndDate,   "yyyy-MM-dd", $null)
} catch {
    Write-Host "`n  [ERROR] Invalid date format. Use YYYY-MM-DD." -ForegroundColor Red
    exit 1
}

$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${ApiKey}:x"))
$headers    = @{ Authorization = "Basic $base64Auth"; Accept = "application/json"; "Content-Type" = "application/json" }

# --- Fetch existing time entries ---
Write-Host "  Fetching existing time entries..." -ForegroundColor Cyan
$timeUrl = "https://$Subdomain.bamboohr.com/api/v1/time_tracking/timesheet_entries?employeeIds=$EmployeeId&start=$StartDate&end=$EndDate"
try {
    $entries = Invoke-RestMethod -Uri $timeUrl -Headers $headers -Method GET -ErrorAction Stop
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
$datesWithEntries = $entries | Select-Object -ExpandProperty date -Unique

# --- Fetch approved time off ---
Write-Host "  Fetching time off..." -ForegroundColor Cyan
$timeOffDates = @{}
try {
    $timeOffUrl      = "https://$Subdomain.bamboohr.com/api/v1/time_off/requests/?employeeId=$EmployeeId&start=$StartDate&end=$EndDate&status=approved"
    $timeOffRequests = Invoke-RestMethod -Uri $timeOffUrl -Headers $headers -Method GET -ErrorAction Stop
    foreach ($req in $timeOffRequests) {
        $reqStart = [datetime]::ParseExact($req.start, "yyyy-MM-dd", $null)
        $reqEnd   = [datetime]::ParseExact($req.end,   "yyyy-MM-dd", $null)
        $cur = $reqStart
        while ($cur -le $reqEnd) {
            $timeOffDates[$cur.ToString("yyyy-MM-dd")] = $req.type.name
            $cur = $cur.AddDays(1)
        }
    }
} catch {
    Write-Host "  (Could not fetch time off: $($_.Exception.Message))" -ForegroundColor DarkGray
}

# --- Find days to fill ---
$workDays   = Get-WorkDays $start $end
$daysToFill = $workDays | Where-Object {
    $ds = $_.ToString("yyyy-MM-dd")
    $datesWithEntries -notcontains $ds -and -not $timeOffDates.ContainsKey($ds)
}

if ($daysToFill.Count -eq 0) {
    Write-Host ""
    Write-Host "  Nothing to fill - all work days already have entries or are time-off days." -ForegroundColor Green
    Write-Host ""
    exit 0
}

# --- Preview ---
$dayNames = @("Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday")
Write-Host ""
Write-Host "  Days to fill ($($daysToFill.Count)):" -ForegroundColor Yellow
foreach ($d in $daysToFill) {
    Write-Host ("    {0}  ({1})" -f $d.ToString("yyyy-MM-dd"), $dayNames[[int]$d.DayOfWeek]) -ForegroundColor White
}
Write-Host ""
Write-Host "  Each day will get:" -ForegroundColor DarkGray
Write-Host "    09:00 - 16:00   7 hrs  Video 9.2 >> BLD - Design, Code, QA, Documentation" -ForegroundColor DarkGray
Write-Host "    16:00 - 18:00   2 hrs  Video 9.2 >> OHD - Daily, Planning, Sprint review,Retrospective" -ForegroundColor DarkGray
Write-Host ""

$confirm = Read-Host "  Proceed? (y/N)"
if ($confirm -notmatch "^[Yy]") {
    Write-Host "  Cancelled." -ForegroundColor DarkGray
    exit 0
}

# --- Fill entries via /clock_entries/store ---
Write-Host ""
$postUrl = "https://$Subdomain.bamboohr.com/api/v1/time_tracking/clock_entries/store"
$filled  = 0
$failed  = 0

foreach ($day in $daysToFill) {
    $dateStr = $day.ToString("yyyy-MM-dd")
    $dayName = $dayNames[[int]$day.DayOfWeek]

    $body = @{
        entries = @(
            @{
                employeeId = [int]$EmployeeId
                date       = $dateStr
                start      = "09:00"
                end        = "16:00"
                projectId  = 46
                taskId     = 170
                note       = ""
            },
            @{
                employeeId = [int]$EmployeeId
                date       = $dateStr
                start      = "16:00"
                end        = "18:00"
                projectId  = 46
                taskId     = 172
                note       = ""
            }
        )
    } | ConvertTo-Json -Depth 5

    try {
        Invoke-RestMethod -Uri $postUrl -Headers $headers -Method POST -Body $body -ErrorAction Stop | Out-Null
        Write-Host ("  [OK]  {0}  {1,-11}  7h BLD + 2h OHD" -f $dateStr, $dayName) -ForegroundColor Green
        $filled++
    } catch {
        try {
            $stream  = $_.Exception.Response.GetResponseStream()
            $reader  = New-Object System.IO.StreamReader($stream)
            $errBody = $reader.ReadToEnd()
        } catch { $errBody = $_.Exception.Message }
        Write-Host ("  [FAIL] {0} {1} - {2}" -f $dateStr, $dayName, $errBody) -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host ("  Done.  Filled: {0}  Failed: {1}" -f $filled, $failed) -ForegroundColor White
Write-Host ""
