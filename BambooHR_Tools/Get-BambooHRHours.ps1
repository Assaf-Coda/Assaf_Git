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
Write-Host "  |   BambooHR Work Hours Retriever          |" -ForegroundColor Magenta
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

if ($start -gt $end) {
    Write-Host "`n  [ERROR] Start date must be before end date." -ForegroundColor Red
    exit 1
}

$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${ApiKey}:x"))
$headers    = @{ Authorization = "Basic $base64Auth"; Accept = "application/json" }

# --- Fetch time entries ---
Write-Host "  Fetching time entries..." -ForegroundColor Cyan
$timeUrl = "https://$Subdomain.bamboohr.com/api/v1/time_tracking/timesheet_entries?employeeIds=$EmployeeId&start=$StartDate&end=$EndDate"
try {
    $entries = Invoke-RestMethod -Uri $timeUrl -Headers $headers -Method GET -ErrorAction Stop
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# --- Fetch time off requests ---
Write-Host "  Fetching time off..." -ForegroundColor Cyan
$timeOffByDate = @{}
$timeOffUrl = "https://$Subdomain.bamboohr.com/api/v1/time_off/requests/?employeeId=$EmployeeId&start=$StartDate&end=$EndDate&status=approved"
try {
    $timeOffRequests = Invoke-RestMethod -Uri $timeOffUrl -Headers $headers -Method GET -ErrorAction Stop
    foreach ($req in $timeOffRequests) {
        $reqStart = [datetime]::ParseExact($req.start, "yyyy-MM-dd", $null)
        $reqEnd   = [datetime]::ParseExact($req.end,   "yyyy-MM-dd", $null)
        $typeName = $req.type.name
        $cur = $reqStart
        while ($cur -le $reqEnd) {
            $ds = $cur.ToString("yyyy-MM-dd")
            if (-not $timeOffByDate.ContainsKey($ds)) { $timeOffByDate[$ds] = @() }
            $timeOffByDate[$ds] += $typeName
            $cur = $cur.AddDays(1)
        }
    }
} catch {
    Write-Host "  (Time off fetch skipped: $($_.Exception.Message))" -ForegroundColor DarkGray
}

Write-Host ""

$byDate   = $entries | Group-Object -Property date | Sort-Object Name
$dayNames = @("Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday")
$workDays = Get-WorkDays $start $end
$results  = @()

foreach ($day in $workDays) {
    $dateStr    = $day.ToString("yyyy-MM-dd")
    $dayName    = $dayNames[[int]$day.DayOfWeek]
    $group      = $byDate | Where-Object { $_.Name -eq $dateStr }
    $vacations  = $timeOffByDate[$dateStr]

    if ($group) {
        $totalHours = [math]::Round(($group.Group | Measure-Object -Property hours -Sum).Sum, 2)
    } else {
        $totalHours = 0
    }

    $isVacation   = $vacations -and $vacations.Count -gt 0
    $hoursDisplay = if ($totalHours -gt 0) { "$totalHours hrs" } else { "---" }

    if ($totalHours -ge 8) {
        $status = "Full day"; $color = "Green"
    } elseif ($totalHours -gt 0) {
        $status = "Partial";  $color = "Yellow"
    } elseif ($isVacation) {
        $status = "Time off"; $color = "Cyan"
    } else {
        $status = "No data";  $color = "DarkGray"
    }

    # Day header
    Write-Host ("  {0}  {1,-11}  {2,8}  {3}" -f $dateStr, $dayName, $hoursDisplay, $status) -ForegroundColor $color

    # Time off label
    if ($isVacation) {
        foreach ($v in ($vacations | Sort-Object -Unique)) {
            Write-Host ("             [Time Off] {0}" -f $v) -ForegroundColor Cyan
        }
    }

    # Entry breakdown
    if ($group) {
        foreach ($entry in ($group.Group | Sort-Object start)) {
            $startTime   = [datetime]::Parse($entry.start, [System.Globalization.CultureInfo]::InvariantCulture).ToLocalTime().ToString("HH:mm")
            $endTime     = [datetime]::Parse($entry.end,   [System.Globalization.CultureInfo]::InvariantCulture).ToLocalTime().ToString("HH:mm")
            $entryHours  = $entry.hours
            $projectName = $entry.projectInfo.project.name
            $taskName    = $entry.projectInfo.task.name
            Write-Host ("             {0} - {1}   {2,4} hrs   {3} >> {4}" -f $startTime, $endTime, $entryHours, $projectName, $taskName) -ForegroundColor DarkGray
        }
    }

    $results += [PSCustomObject]@{
        Date      = $dateStr
        Day       = $dayName
        Hours     = $totalHours
        Status    = $status
        TimeOff   = if ($isVacation) { $vacations -join ", " } else { "" }
    }
}

# Summary
$totalHours  = [math]::Round(($results | Measure-Object -Property Hours -Sum).Sum, 2)
$daysWorked  = ($results | Where-Object { $_.Hours -gt 0 }).Count
$daysOff     = ($results | Where-Object { $_.Status -eq "Time off" }).Count
$avgPerDay   = if ($daysWorked -gt 0) { [math]::Round($totalHours / $daysWorked, 2) } else { 0 }

Write-Host ""
Write-Host "  $("-" * 70)" -ForegroundColor DarkGray
Write-Host ("  Total hours      : {0} hrs" -f $totalHours)                    -ForegroundColor White
Write-Host ("  Days worked      : {0} / {1}" -f $daysWorked, $workDays.Count) -ForegroundColor White
Write-Host ("  Days off         : {0}" -f $daysOff)                           -ForegroundColor Cyan
Write-Host ("  Average per day  : {0} hrs" -f $avgPerDay)                     -ForegroundColor White
Write-Host ""

Write-Host ""
