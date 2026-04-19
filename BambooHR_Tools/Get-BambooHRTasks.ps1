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

# Default: last 90 days
if ($StartDate -eq "") { $StartDate = (Get-Date).AddDays(-90).ToString("yyyy-MM-dd") }
if ($EndDate   -eq "") { $EndDate   = (Get-Date).ToString("yyyy-MM-dd") }

Write-Host ""
Write-Host "  +------------------------------------------+" -ForegroundColor DarkMagenta
Write-Host "  |   BambooHR Projects & Tasks Viewer       |" -ForegroundColor Magenta
Write-Host "  +------------------------------------------+" -ForegroundColor DarkMagenta
Write-Host ""
Write-Host ("  Scanning entries from {0} to {1}..." -f $StartDate, $EndDate) -ForegroundColor Cyan

$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${ApiKey}:x"))
$headers    = @{ Authorization = "Basic $base64Auth"; Accept = "application/json" }

try {
    $entries = Invoke-RestMethod -Uri "https://$Subdomain.bamboohr.com/api/v1/time_tracking/timesheet_entries?employeeIds=$EmployeeId&start=$StartDate&end=$EndDate" -Headers $headers -Method GET -ErrorAction Stop
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if (-not $entries -or $entries.Count -eq 0) {
    Write-Host "  No entries found in this date range. Try a wider range:" -ForegroundColor Yellow
    Write-Host "  .\Get-BambooHRTasks.ps1 -StartDate `"2025-01-01`" -EndDate `"$(Get-Date -f yyyy-MM-dd)`"" -ForegroundColor DarkGray
    exit 0
}

# Extract unique project+task combos
$seen    = @{}
$combos  = @()
foreach ($e in $entries) {
    $projId   = $e.projectInfo.project.id
    $projName = $e.projectInfo.project.name
    $taskId   = $e.projectInfo.task.id
    $taskName = $e.projectInfo.task.name
    $key      = "${projId}:${taskId}"
    if (-not $seen.ContainsKey($key)) {
        $seen[$key] = $true
        $combos += [PSCustomObject]@{
            ProjectId   = $projId
            ProjectName = $projName
            TaskId      = $taskId
            TaskName    = $taskName
        }
    }
}

$combos = $combos | Sort-Object ProjectId, TaskId

Write-Host ""
Write-Host ("  {0,-8}  {1,-30}  {2,-8}  {3}" -f "ProjID", "Project", "TaskID", "Task") -ForegroundColor White
Write-Host ("  {0,-8}  {1,-30}  {2,-8}  {3}" -f "--------", "------------------------------", "--------", "--------------------") -ForegroundColor DarkGray

$lastProj = $null
foreach ($c in $combos) {
    $projDisplay = if ($c.ProjectId -ne $lastProj) { $c.ProjectName } else { "" }
    $projIdDisp  = if ($c.ProjectId -ne $lastProj) { $c.ProjectId  } else { "" }
    $lastProj    = $c.ProjectId
    Write-Host ("  {0,-8}  {1,-30}  {2,-8}  {3}" -f $projIdDisp, $projDisplay, $c.TaskId, $c.TaskName) -ForegroundColor Gray
}

Write-Host ""
Write-Host "  $("-" * 70)" -ForegroundColor DarkGray
Write-Host ("  {0} unique project/task combination(s) found." -f $combos.Count) -ForegroundColor White
Write-Host ""
Write-Host "  Update projectId / taskId in Fill-BambooHRHours.ps1 to use a different task." -ForegroundColor DarkGray
Write-Host ""
