Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

# --- Config ---
function Read-IniFile($path) {
    $ini = @{}
    foreach ($line in Get-Content $path) {
        if ($line -match '^\s*([^=;#]+?)\s*=\s*(.+?)\s*$') { $ini[$matches[1]] = $matches[2] }
    }
    return $ini
}
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir "config.ini"
$cfg = @{ Subdomain = ""; ApiKey = ""; EmployeeId = "" }
if (Test-Path $configPath) {
    $ini = Read-IniFile $configPath
    $cfg.Subdomain = $ini["Subdomain"]; $cfg.ApiKey = $ini["ApiKey"]; $cfg.EmployeeId = $ini["EmployeeId"]
}

$cfgErrors = @()
if (-not $cfg.Subdomain  -or $cfg.Subdomain  -match "YOUR_") { $cfgErrors += "Subdomain" }
if (-not $cfg.ApiKey     -or $cfg.ApiKey     -match "YOUR_") { $cfgErrors += "ApiKey" }
if (-not $cfg.EmployeeId -or $cfg.EmployeeId -match "YOUR_") { $cfgErrors += "EmployeeId" }
if ($cfgErrors.Count -gt 0) {
    [System.Windows.Forms.MessageBox]::Show(
        "config.ini has missing or placeholder values:`n`n" +
        ($cfgErrors | ForEach-Object { "  - $_" } | Out-String) +
        "`nEdit config.ini in the same folder as this script and set real values.",
        "Configuration Required", "OK", "Warning") | Out-Null
}

# --- API ---
function Get-H {
    $b = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($cfg.ApiKey):x"))
    @{ Authorization = "Basic $b"; Accept = "application/json"; "Content-Type" = "application/json" }
}
function Fetch-Entries($s, $e) {
    Invoke-RestMethod -Uri "https://$($cfg.Subdomain).bamboohr.com/api/v1/time_tracking/timesheet_entries?employeeIds=$($cfg.EmployeeId)&start=$s&end=$e" -Headers (Get-H) -Method GET -ErrorAction Stop
}
function Build-TOMap($s, $e) {
    $m = @{}
    try {
        foreach ($r in (Invoke-RestMethod -Uri "https://$($cfg.Subdomain).bamboohr.com/api/v1/time_off/requests/?employeeId=$($cfg.EmployeeId)&start=$s&end=$e&status=approved" -Headers (Get-H) -Method GET -ErrorAction Stop)) {
            $c = [datetime]::ParseExact($r.start,"yyyy-MM-dd",$null)
            $t = [datetime]::ParseExact($r.end,  "yyyy-MM-dd",$null)
            while ($c -le $t) { $m[$c.ToString("yyyy-MM-dd")] = $r.type.name; $c = $c.AddDays(1) }
        }
    } catch {}
    return $m
}
function Get-WorkDays([datetime]$s,[datetime]$e) {
    $d=@(); $c=$s.Date
    while ($c -le $e.Date) { if ([int]$c.DayOfWeek -le 4) { $d+=$c }; $c=$c.AddDays(1) }
    return $d
}
$dn = @("Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday")

# --- Palette ---
$cSide   = [System.Drawing.Color]::FromArgb(15,15,20)
$cBg     = [System.Drawing.Color]::FromArgb(22,22,30)
$cPanel  = [System.Drawing.Color]::FromArgb(32,32,42)
$cCard   = [System.Drawing.Color]::FromArgb(40,40,54)
$cBorder = [System.Drawing.Color]::FromArgb(55,55,72)
$cAccent = [System.Drawing.Color]::FromArgb(108,43,217)
$cHover  = [System.Drawing.Color]::FromArgb(42,20,80)
$cWhite  = [System.Drawing.Color]::FromArgb(225,225,235)
$cMuted  = [System.Drawing.Color]::FromArgb(110,110,130)
$cGreen  = [System.Drawing.Color]::FromArgb(60,195,105)
$cYellow = [System.Drawing.Color]::FromArgb(252,196,42)
$cCyan   = [System.Drawing.Color]::FromArgb(28,198,210)
$cRed    = [System.Drawing.Color]::FromArgb(238,72,72)
$cNavAct = [System.Drawing.Color]::FromArgb(38,18,72)

$fNorm  = [System.Drawing.Font]::new("Segoe UI", 9)
$fBold  = [System.Drawing.Font]::new("Segoe UI", 9,  [System.Drawing.FontStyle]::Bold)
$fLg    = [System.Drawing.Font]::new("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$fTitle = [System.Drawing.Font]::new("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
$fSm    = [System.Drawing.Font]::new("Segoe UI", 8)
$fNav   = [System.Drawing.Font]::new("Segoe UI", 10)
$fNavA  = [System.Drawing.Font]::new("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$fMono  = [System.Drawing.Font]::new("Consolas", 9)
$fNum   = [System.Drawing.Font]::new("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)

# --- Helpers ---
function New-Grid {
    $g = New-Object System.Windows.Forms.DataGridView
    $g.BackgroundColor = $cBg; $g.GridColor = $cBorder
    $g.DefaultCellStyle.BackColor = $cBg; $g.DefaultCellStyle.ForeColor = $cWhite
    $g.DefaultCellStyle.Font = $fMono; $g.DefaultCellStyle.SelectionBackColor = $cAccent
    $g.DefaultCellStyle.SelectionForeColor = $cWhite
    $g.DefaultCellStyle.Padding = [System.Windows.Forms.Padding]::new(6,0,0,0)
    $g.AlternatingRowsDefaultCellStyle.BackColor = [System.Drawing.Color]::FromArgb(28,28,38)
    $g.AlternatingRowsDefaultCellStyle.ForeColor = $cWhite
    $hdr = $g.ColumnHeadersDefaultCellStyle
    $hdr.BackColor = $cPanel; $hdr.ForeColor = $cMuted; $hdr.Font = $fSm
    $hdr.Padding = [System.Windows.Forms.Padding]::new(6,0,0,0)
    $g.ColumnHeadersHeight = 32; $g.RowTemplate.Height = 34
    $g.EnableHeadersVisualStyles = $false; $g.BorderStyle = "None"
    $g.RowHeadersVisible = $false; $g.AllowUserToAddRows = $false
    $g.ReadOnly = $true; $g.AutoSizeColumnsMode = "Fill"
    $g.SelectionMode = "FullRowSelect"; $g.CellBorderStyle = "None"
    $g.ColumnHeadersBorderStyle = "None"; $g.Dock = "Fill"
    return $g
}

function New-DTP($date) {
    $d = New-Object System.Windows.Forms.DateTimePicker
    $d.Size = [System.Drawing.Size]::new(160, 28)
    $d.Format = "Custom"; $d.CustomFormat = "yyyy-MM-dd"; $d.Value = $date
    return $d
}

function New-Btn($text, $w=140, $h=36, $primary=$true) {
    $b = New-Object System.Windows.Forms.Button
    $b.Text = $text; $b.Size = [System.Drawing.Size]::new($w,$h)
    $b.FlatStyle = "Flat"; $b.FlatAppearance.BorderSize = if ($primary) { 0 } else { 1 }
    $b.FlatAppearance.BorderColor = $cBorder
    $b.BackColor = if ($primary) { $cAccent } else { $cPanel }
    $b.ForeColor = $cWhite; $b.Font = if ($primary) { $fBold } else { $fNorm }
    $b.Cursor = "Hand"; return $b
}

function New-QuickBtn($text) {
    $b = New-Object System.Windows.Forms.Button
    $b.Text = $text; $b.Size = [System.Drawing.Size]::new(95, 26)
    $b.FlatStyle = "Flat"; $b.FlatAppearance.BorderColor = $cBorder; $b.FlatAppearance.BorderSize = 1
    $b.BackColor = $cPanel; $b.ForeColor = $cMuted; $b.Font = $fSm; $b.Cursor = "Hand"
    return $b
}

function New-StatCard($label, $parent, $x) {
    $card = New-Object System.Windows.Forms.Panel
    $card.Size = [System.Drawing.Size]::new(170, 80)
    $card.Location = [System.Drawing.Point]::new($x, 10)
    $card.BackColor = $cCard
    $valLbl = New-Object System.Windows.Forms.Label
    $valLbl.Text = "--"; $valLbl.Font = $fNum; $valLbl.ForeColor = $cWhite
    $valLbl.Location = [System.Drawing.Point]::new(15, 8); $valLbl.AutoSize = $true
    $namLbl = New-Object System.Windows.Forms.Label
    $namLbl.Text = $label; $namLbl.Font = $fSm; $namLbl.ForeColor = $cMuted
    $namLbl.Location = [System.Drawing.Point]::new(15, 52); $namLbl.AutoSize = $true
    $card.Controls.Add($valLbl); $card.Controls.Add($namLbl)
    $parent.Controls.Add($card)
    return $valLbl
}

# =====================================================================
# FORM
# =====================================================================
$form = New-Object System.Windows.Forms.Form
$form.Text = "BambooHR Tools"; $form.Size = [System.Drawing.Size]::new(1150, 700)
$form.MinimumSize = [System.Drawing.Size]::new(900, 550)
$form.StartPosition = "CenterScreen"; $form.BackColor = $cBg
$form.ForeColor = $cWhite; $form.Font = $fNorm

$strip = New-Object System.Windows.Forms.StatusStrip
$strip.BackColor = [System.Drawing.Color]::FromArgb(10,10,15); $strip.SizingGrip = $false
$stripLbl = New-Object System.Windows.Forms.ToolStripStatusLabel
$stripLbl.ForeColor = $cMuted
$stripLbl.Text = "  $($cfg.Subdomain).bamboohr.com   |   Employee $($cfg.EmployeeId)"
$strip.Items.Add($stripLbl) | Out-Null
$form.Controls.Add($strip)

# Content area (Fill - added first)
$content = New-Object System.Windows.Forms.Panel
$content.Dock = "Fill"; $content.BackColor = $cBg
$form.Controls.Add($content)

# Sidebar (Left - added after content)
$side = New-Object System.Windows.Forms.Panel
$side.Width = 220; $side.Dock = "Left"; $side.BackColor = $cSide
$form.Controls.Add($side)

# =====================================================================
# SIDEBAR CONTENTS  (Fill first, then Bottom, then Top for correct stacking)
# =====================================================================
$sideNav = New-Object System.Windows.Forms.Panel
$sideNav.Dock = "Fill"; $sideNav.BackColor = $cSide
$side.Controls.Add($sideNav)   # Fill - added first

$sideFoot = New-Object System.Windows.Forms.Panel
$sideFoot.Height = 65; $sideFoot.Dock = "Bottom"
$sideFoot.BackColor = [System.Drawing.Color]::FromArgb(10,10,14)
$side.Controls.Add($sideFoot)  # Bottom - added second

$sideHead = New-Object System.Windows.Forms.Panel
$sideHead.Height = 80; $sideHead.Dock = "Top"
$sideHead.BackColor = $cSide
$side.Controls.Add($sideHead)  # Top - added last (docks to top first in reverse processing)

$appNameLbl = New-Object System.Windows.Forms.Label
$appNameLbl.Text = "BambooHR"; $appNameLbl.Font = $fTitle; $appNameLbl.ForeColor = $cWhite
$appNameLbl.Location = [System.Drawing.Point]::new(22, 18); $appNameLbl.AutoSize = $true
$appSubLbl = New-Object System.Windows.Forms.Label
$appSubLbl.Text = "Time Tools"; $appSubLbl.Font = $fSm; $appSubLbl.ForeColor = $cMuted
$appSubLbl.Location = [System.Drawing.Point]::new(24, 48); $appSubLbl.AutoSize = $true
$sideHead.Controls.Add($appNameLbl); $sideHead.Controls.Add($appSubLbl)

$footLbl1 = New-Object System.Windows.Forms.Label
$footLbl1.Text = $cfg.Subdomain + ".bamboohr.com"
$footLbl1.Font = $fSm; $footLbl1.ForeColor = $cMuted
$footLbl1.Location = [System.Drawing.Point]::new(16, 12); $footLbl1.AutoSize = $true
$footLbl2 = New-Object System.Windows.Forms.Label
$footLbl2.Text = "Employee ID: " + $cfg.EmployeeId
$footLbl2.Font = $fSm; $footLbl2.ForeColor = [System.Drawing.Color]::FromArgb(70,70,90)
$footLbl2.Location = [System.Drawing.Point]::new(16, 34); $footLbl2.AutoSize = $true
$sideFoot.Controls.Add($footLbl1); $sideFoot.Controls.Add($footLbl2)

# Nav items (manually positioned in sideNav)
function New-NavItem($label, $y) {
    $p = New-Object System.Windows.Forms.Panel
    $p.Location = [System.Drawing.Point]::new(0, $y)
    $p.Size = [System.Drawing.Size]::new(220, 54)
    $p.BackColor = $cSide; $p.Cursor = "Hand"

    $bar = New-Object System.Windows.Forms.Panel
    $bar.Size = [System.Drawing.Size]::new(4, 54); $bar.Location = [System.Drawing.Point]::new(0,0)
    $bar.BackColor = $cSide

    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Text = $label; $lbl.Font = $fNav; $lbl.ForeColor = $cMuted
    $lbl.Location = [System.Drawing.Point]::new(24, 0)
    $lbl.Size = [System.Drawing.Size]::new(190, 54); $lbl.TextAlign = "MiddleLeft"

    $p.Controls.Add($bar); $p.Controls.Add($lbl)
    $sideNav.Controls.Add($p)
    return $p, $bar, $lbl
}

$navGet,   $navGetBar,   $navGetLbl   = New-NavItem "  Get Hours"     20
$navFill,  $navFillBar,  $navFillLbl  = New-NavItem "  Fill Hours"    80
$navTasks, $navTasksBar, $navTasksLbl = New-NavItem "  Browse Tasks" 140

# =====================================================================
# PAGE PANELS  (all same size, toggle visibility to switch)
# =====================================================================
$pageGet   = New-Object System.Windows.Forms.Panel
$pageFill  = New-Object System.Windows.Forms.Panel
$pageTasks = New-Object System.Windows.Forms.Panel

foreach ($pg in @($pageGet, $pageFill, $pageTasks)) {
    $pg.Location = [System.Drawing.Point]::new(0,0)
    $pg.BackColor = $cBg
    $content.Controls.Add($pg)
}
$pageFill.Visible = $false; $pageTasks.Visible = $false

function Resize-Pages {
    $sz = $content.ClientSize
    foreach ($pg in @($pageGet, $pageFill, $pageTasks)) { $pg.Size = $sz }
}
$content.Add_Resize({ Resize-Pages })

function Set-Nav($name) {
    $map = @{ Get=$navGet; Fill=$navFill; Tasks=$navTasks }
    $barMap = @{ Get=$navGetBar; Fill=$navFillBar; Tasks=$navTasksBar }
    $lblMap = @{ Get=$navGetLbl; Fill=$navFillLbl; Tasks=$navTasksLbl }
    $pgMap  = @{ Get=$pageGet;   Fill=$pageFill;   Tasks=$pageTasks   }

    foreach ($k in $map.Keys) {
        if ($k -eq $name) {
            $map[$k].BackColor = $cNavAct
            $barMap[$k].BackColor = $cAccent
            $lblMap[$k].ForeColor = $cWhite; $lblMap[$k].Font = $fNavA
            $pgMap[$k].Visible = $true; $pgMap[$k].BringToFront()
        } else {
            $map[$k].BackColor = $cSide
            $barMap[$k].BackColor = $cSide
            $lblMap[$k].ForeColor = $cMuted; $lblMap[$k].Font = $fNav
            $pgMap[$k].Visible = $false
        }
    }
}

$navGet.Add_Click({   Set-Nav "Get"   })
$navFill.Add_Click({  Set-Nav "Fill"  })
$navTasks.Add_Click({ Set-Nav "Tasks" })
foreach ($ctrl in @($navGetLbl, $navGetBar))     { $ctrl.Add_Click({ Set-Nav "Get"   }) }
foreach ($ctrl in @($navFillLbl, $navFillBar))   { $ctrl.Add_Click({ Set-Nav "Fill"  }) }
foreach ($ctrl in @($navTasksLbl, $navTasksBar)) { $ctrl.Add_Click({ Set-Nav "Tasks" }) }

# =====================================================================
# PAGE BUILDER HELPER
# =====================================================================
function New-PageControls($page, $title, $hasStats=$false) {
    # Grid first (Fill)
    $grid = New-Grid
    $page.Controls.Add($grid)

    # Stats row (Top) - only for Get Hours
    $statsPanel = $null
    $statVals   = $null
    if ($hasStats) {
        $statsPanel = New-Object System.Windows.Forms.Panel
        $statsPanel.Height = 100; $statsPanel.Dock = "Top"; $statsPanel.BackColor = $cBg
        $statsPanel.Visible = $false
        $page.Controls.Add($statsPanel)
        $statVals = @{
            Total  = New-StatCard "Total Hours"   $statsPanel 20
            Worked = New-StatCard "Days Worked"   $statsPanel 210
            Off    = New-StatCard "Days Off"      $statsPanel 400
            Avg    = New-StatCard "Avg / Day"     $statsPanel 590
        }
    }

    # Info bar (Top)
    $infoPanel = New-Object System.Windows.Forms.Panel
    $infoPanel.Height = 38; $infoPanel.Dock = "Top"; $infoPanel.BackColor = $cPanel
    $infoPanel.Visible = $false
    $infoLbl = New-Object System.Windows.Forms.Label
    $infoLbl.Dock = "Fill"; $infoLbl.ForeColor = $cYellow; $infoLbl.Font = $fSm
    $infoLbl.TextAlign = "MiddleLeft"
    $infoLbl.Padding = [System.Windows.Forms.Padding]::new(16,0,0,0)
    $infoPanel.Controls.Add($infoLbl)
    $page.Controls.Add($infoPanel)

    # Controls bar (Top - added last = docked at top)
    $ctrlBar = New-Object System.Windows.Forms.Panel
    $ctrlBar.Height = 80; $ctrlBar.Dock = "Top"; $ctrlBar.BackColor = $cPanel
    $page.Controls.Add($ctrlBar)

    # Title
    $titleLbl = New-Object System.Windows.Forms.Label
    $titleLbl.Text = $title; $titleLbl.Font = $fLg; $titleLbl.ForeColor = $cWhite
    $titleLbl.Location = [System.Drawing.Point]::new(20, 14); $titleLbl.AutoSize = $true
    $ctrlBar.Controls.Add($titleLbl)

    # Date pickers + quick buttons
    $dpStart = New-DTP (Get-Date -Day 1)
    $dpEnd   = New-DTP (Get-Date)
    $dpStart.Location = [System.Drawing.Point]::new(175, 28)
    $dpEnd.Location   = [System.Drawing.Point]::new(345, 28)

    $lblFrom = New-Object System.Windows.Forms.Label
    $lblFrom.Text = "From"; $lblFrom.Font = $fSm; $lblFrom.ForeColor = $cMuted
    $lblFrom.Location = [System.Drawing.Point]::new(175, 13); $lblFrom.AutoSize = $true
    $lblTo = New-Object System.Windows.Forms.Label
    $lblTo.Text = "To"; $lblTo.Font = $fSm; $lblTo.ForeColor = $cMuted
    $lblTo.Location = [System.Drawing.Point]::new(345, 13); $lblTo.AutoSize = $true

    $btnThisMonth = New-QuickBtn "This Month"
    $btnLastMonth = New-QuickBtn "Last Month"
    $btnThisMonth.Location = [System.Drawing.Point]::new(518, 27)
    $btnLastMonth.Location = [System.Drawing.Point]::new(607, 27)

    $btnThisMonth.Add_Click({
        $dpStart.Value = Get-Date -Day 1
        $dpEnd.Value   = Get-Date
    })
    $btnLastMonth.Add_Click({
        $first = (Get-Date -Day 1).AddMonths(-1)
        $dpStart.Value = $first
        $dpEnd.Value   = $first.AddMonths(1).AddDays(-1)
    })

    $ctrlBar.Controls.Add($lblFrom); $ctrlBar.Controls.Add($dpStart)
    $ctrlBar.Controls.Add($lblTo);   $ctrlBar.Controls.Add($dpEnd)
    $ctrlBar.Controls.Add($btnThisMonth); $ctrlBar.Controls.Add($btnLastMonth)

    return $grid, $infoPanel, $infoLbl, $ctrlBar, $dpStart, $dpEnd, $statVals, $statsPanel
}

# =====================================================================
# PAGE 1 - GET HOURS
# =====================================================================
$gG, $infoG, $infoGLbl, $ctrlG, $dpGS, $dpGE, $statsVals, $statsPanel = New-PageControls $pageGet "Get Hours" $true

$btnGetHours = New-Btn "Get Hours" 140 36
$btnGetHours.Location = [System.Drawing.Point]::new(700, 22)
$ctrlG.Controls.Add($btnGetHours)

$btnGetHours.Add_Click({
    $s = $dpGS.Value.ToString("yyyy-MM-dd")
    $e = $dpGE.Value.ToString("yyyy-MM-dd")
    $btnGetHours.Text = "Loading..."; $btnGetHours.Enabled = $false
    $gG.Rows.Clear(); $gG.Columns.Clear(); $infoG.Visible = $false; $statsPanel.Visible = $false

    try {
        $entries = Fetch-Entries $s $e
        $toMap   = Build-TOMap $s $e

        $gG.Columns.Add("Date",    "Date")     | Out-Null
        $gG.Columns.Add("Day",     "Day")      | Out-Null
        $gG.Columns.Add("Hours",   "Hours")    | Out-Null
        $gG.Columns.Add("Status",  "Status")   | Out-Null
        $gG.Columns.Add("Project", "Project")  | Out-Null
        $gG.Columns.Add("Time",    "Time")     | Out-Null
        $gG.Columns.Add("Task",    "Task")     | Out-Null
        $gG.Columns.Add("TimeOff", "Time Off") | Out-Null
        $gG.Columns["Date"].FillWeight    = 72
        $gG.Columns["Day"].FillWeight     = 62
        $gG.Columns["Hours"].FillWeight   = 48
        $gG.Columns["Status"].FillWeight  = 62
        $gG.Columns["Project"].FillWeight = 80
        $gG.Columns["Time"].FillWeight    = 70
        $gG.Columns["Task"].FillWeight    = 160
        $gG.Columns["TimeOff"].FillWeight = 88

        $byDate = $entries | Group-Object -Property date
        $wdays  = Get-WorkDays $dpGS.Value $dpGE.Value
        $totH = 0; $worked = 0; $offs = 0

        foreach ($day in $wdays) {
            $ds   = $day.ToString("yyyy-MM-dd"); $dname = $dn[[int]$day.DayOfWeek]
            $grp  = $byDate | Where-Object { $_.Name -eq $ds }
            $isOff = $toMap.ContainsKey($ds)
            $hrs  = if ($grp) { [math]::Round(($grp.Group | Measure-Object -Property hours -Sum).Sum,2) } else { 0 }

            if    ($hrs -ge 8) { $st="Full day"; $clr=$cGreen  }
            elseif($hrs -gt 0) { $st="Partial";  $clr=$cYellow }
            elseif($isOff)     { $st="Time off"; $clr=$cCyan   }
            else               { $st="No data";  $clr=$cMuted  }

            if ($hrs -gt 0) { $worked++; $totH += $hrs }
            if ($isOff) { $offs++ }

            if ($grp) {
                $first = $true
                foreach ($en in ($grp.Group | Sort-Object start)) {
                    $t1 = [datetime]::Parse($en.start).ToLocalTime().ToString("HH:mm")
                    $t2 = [datetime]::Parse($en.end).ToLocalTime().ToString("HH:mm")
                    $row = if ($first) {
                        $gG.Rows.Add($ds, $dname, "$hrs h", $st, $en.projectInfo.project.name, "$t1-$t2", $en.projectInfo.task.name, $(if($isOff){$toMap[$ds]}else{""}))
                    } else {
                        $gG.Rows.Add("","","","", $en.projectInfo.project.name, "$t1-$t2", $en.projectInfo.task.name, "")
                    }
                    $gG.Rows[$row].DefaultCellStyle.ForeColor = $clr
                    $first = $false
                }
            } else {
                $row = $gG.Rows.Add($ds, $dname, "---", $st, "", "", "", $(if($isOff){$toMap[$ds]}else{""}))
                $gG.Rows[$row].DefaultCellStyle.ForeColor = $clr
            }
        }

        $avg = if ($worked -gt 0) { [math]::Round($totH/$worked,2) } else { 0 }
        $statsVals.Total.Text  = "$totH h"
        $statsVals.Worked.Text = "$worked"
        $statsVals.Off.Text    = "$offs"
        $statsVals.Avg.Text    = "$avg h"
        $statsPanel.Visible    = $true

    } catch {
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,"Error","OK","Error") | Out-Null
    }
    $btnGetHours.Text = "Get Hours"; $btnGetHours.Enabled = $true
})

# =====================================================================
# PAGE 2 - FILL HOURS
# =====================================================================
$gF, $infoF, $infoFLbl, $ctrlF, $dpFS, $dpFE, $null, $null = New-PageControls $pageFill "Fill Hours"

$btnPreview = New-Btn "Preview" 110 36 $false
$btnPreview.BackColor = $cPanel
$btnPreview.FlatAppearance.BorderSize = 1; $btnPreview.FlatAppearance.BorderColor = $cBorder
$btnPreview.Font = $fNorm
$btnPreview.Location = [System.Drawing.Point]::new(688, 22)
$ctrlF.Controls.Add($btnPreview)

$btnDoFill = New-Btn "Fill Missing" 125 36
$btnDoFill.Location = [System.Drawing.Point]::new(793, 22); $btnDoFill.Enabled = $false
$btnDoFill.BackColor = [System.Drawing.Color]::FromArgb(55,55,70)
$ctrlF.Controls.Add($btnDoFill)

# --- Task selector row ---
$ctrlF.Height = 140

$script:task1Config = @{ projectId = 46; taskId = 170 }
$script:task2Config = @{ projectId = 46; taskId = 172 }
$script:taskChoices = @()

$sepLine = New-Object System.Windows.Forms.Panel
$sepLine.Height = 1; $sepLine.BackColor = $cBorder
$sepLine.Location = [System.Drawing.Point]::new(0, 73)
$sepLine.Anchor = [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right -bor [System.Windows.Forms.AnchorStyles]::Top
$sepLine.Width = 1200
$ctrlF.Controls.Add($sepLine)

$lblT1 = New-Object System.Windows.Forms.Label
$lblT1.Text = "Task 1  (7h, 09:00-16:00)"; $lblT1.Font = $fSm; $lblT1.ForeColor = $cMuted
$lblT1.Location = [System.Drawing.Point]::new(20, 83); $lblT1.AutoSize = $true
$ctrlF.Controls.Add($lblT1)

$cboTask1 = New-Object System.Windows.Forms.ComboBox
$cboTask1.Location = [System.Drawing.Point]::new(192, 79)
$cboTask1.Size = [System.Drawing.Size]::new(252, 26)
$cboTask1.DropDownStyle = "DropDownList"; $cboTask1.Font = $fSm
$cboTask1.BackColor = $cCard; $cboTask1.ForeColor = $cWhite
$cboTask1.Items.Add("(default: project 46, task 170)") | Out-Null
$cboTask1.SelectedIndex = 0
$ctrlF.Controls.Add($cboTask1)

$lblT2 = New-Object System.Windows.Forms.Label
$lblT2.Text = "Task 2  (2h, 16:00-18:00)"; $lblT2.Font = $fSm; $lblT2.ForeColor = $cMuted
$lblT2.Location = [System.Drawing.Point]::new(460, 83); $lblT2.AutoSize = $true
$ctrlF.Controls.Add($lblT2)

$cboTask2 = New-Object System.Windows.Forms.ComboBox
$cboTask2.Location = [System.Drawing.Point]::new(635, 79)
$cboTask2.Size = [System.Drawing.Size]::new(205, 26)
$cboTask2.DropDownStyle = "DropDownList"; $cboTask2.Font = $fSm
$cboTask2.BackColor = $cCard; $cboTask2.ForeColor = $cWhite
$cboTask2.Items.Add("(default: project 46, task 172)") | Out-Null
$cboTask2.SelectedIndex = 0
$ctrlF.Controls.Add($cboTask2)

$btnLoadFillTasks = New-Btn "Load Tasks" 90 26 $false
$btnLoadFillTasks.Location = [System.Drawing.Point]::new(850, 79)
$ctrlF.Controls.Add($btnLoadFillTasks)

$btnLoadFillTasks.Add_Click({
    $btnLoadFillTasks.Text = "..."; $btnLoadFillTasks.Enabled = $false
    try {
        $s = (Get-Date).AddDays(-90).ToString("yyyy-MM-dd")
        $e = (Get-Date).ToString("yyyy-MM-dd")
        $entries = Fetch-Entries $s $e
        $seen = @{}; $choices = @()
        foreach ($en in $entries) {
            $pId = [string]$en.projectInfo.project.id
            $tId = [string]$en.projectInfo.task.id
            $k   = "${pId}:${tId}"
            if (-not $seen.ContainsKey($k)) {
                $seen[$k] = $true
                $choices += @{ display = "$($en.projectInfo.project.name) / $($en.projectInfo.task.name)"; projectId = [int]$pId; taskId = [int]$tId }
            }
        }
        $script:taskChoices = $choices
        $cboTask1.Items.Clear(); $cboTask2.Items.Clear()
        foreach ($c in $choices) {
            $cboTask1.Items.Add($c.display) | Out-Null
            $cboTask2.Items.Add($c.display) | Out-Null
        }
        $idx1 = -1; $idx2 = -1
        for ($i = 0; $i -lt $choices.Count; $i++) {
            if ($choices[$i].taskId -eq 170) { $idx1 = $i }
            if ($choices[$i].taskId -eq 172) { $idx2 = $i }
        }
        $cboTask1.SelectedIndex = if ($idx1 -ge 0) { $idx1 } elseif ($choices.Count -gt 0) { 0 } else { -1 }
        $cboTask2.SelectedIndex = if ($idx2 -ge 0) { $idx2 } elseif ($choices.Count -gt 1) { 1 } elseif ($choices.Count -gt 0) { 0 } else { -1 }
        if ($cboTask1.SelectedIndex -ge 0) { $script:task1Config = $choices[$cboTask1.SelectedIndex] }
        if ($cboTask2.SelectedIndex -ge 0) { $script:task2Config = $choices[$cboTask2.SelectedIndex] }
    } catch {
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,"Error","OK","Error") | Out-Null
    }
    $btnLoadFillTasks.Text = "Load Tasks"; $btnLoadFillTasks.Enabled = $true
})

$cboTask1.Add_SelectedIndexChanged({
    if ($script:taskChoices.Count -gt 0 -and $cboTask1.SelectedIndex -ge 0) {
        $script:task1Config = $script:taskChoices[$cboTask1.SelectedIndex]
    }
})
$cboTask2.Add_SelectedIndexChanged({
    if ($script:taskChoices.Count -gt 0 -and $cboTask2.SelectedIndex -ge 0) {
        $script:task2Config = $script:taskChoices[$cboTask2.SelectedIndex]
    }
})

$script:pendingDays = @()

$btnPreview.Add_Click({
    $s = $dpFS.Value.ToString("yyyy-MM-dd")
    $e = $dpFE.Value.ToString("yyyy-MM-dd")
    $btnPreview.Text = "Loading..."; $btnPreview.Enabled = $false
    $btnDoFill.Enabled = $false; $btnDoFill.BackColor = [System.Drawing.Color]::FromArgb(55,55,70)
    $gF.Rows.Clear(); $gF.Columns.Clear(); $infoF.Visible = $false
    $script:pendingDays = @()

    try {
        $entries  = Fetch-Entries $s $e
        $hasDates = $entries | Select-Object -ExpandProperty date -Unique
        $toMap    = Build-TOMap $s $e
        $wdays    = Get-WorkDays $dpFS.Value $dpFE.Value

        $script:pendingDays = $wdays | Where-Object {
            $ds = $_.ToString("yyyy-MM-dd")
            $hasDates -notcontains $ds -and -not $toMap.ContainsKey($ds)
        }

        $gF.Columns.Add("Date",   "Date")   | Out-Null
        $gF.Columns.Add("Day",    "Day")    | Out-Null
        $gF.Columns.Add("Status", "Status") | Out-Null
        $gF.Columns["Date"].FillWeight   = 90
        $gF.Columns["Day"].FillWeight    = 90
        $gF.Columns["Status"].FillWeight = 400

        foreach ($day in $wdays) {
            $ds = $day.ToString("yyyy-MM-dd"); $dname = $dn[[int]$day.DayOfWeek]
            if      ($script:pendingDays -contains $day) { $st="Will be filled";       $clr=$cYellow }
            elseif  ($toMap.ContainsKey($ds))             { $st="Time off - skip";      $clr=$cCyan   }
            elseif  ($hasDates -contains $ds)             { $st="Already has entries";  $clr=$cGreen  }
            else                                          { $st="";                     $clr=$cMuted  }
            $row = $gF.Rows.Add($ds, $dname, $st)
            $gF.Rows[$row].DefaultCellStyle.ForeColor = $clr
        }

        if ($script:pendingDays.Count -gt 0) {
            $infoFLbl.Text = "  $($script:pendingDays.Count) day(s) will be filled: 09:00-16:00 (7h BLD) + 16:00-18:00 (2h OHD). Click Fill Missing to proceed."
            $infoFLbl.ForeColor = $cYellow
            $btnDoFill.Enabled = $true; $btnDoFill.BackColor = $cAccent
        } else {
            $infoFLbl.Text = "  All work days already have entries."; $infoFLbl.ForeColor = $cGreen
        }
        $infoF.Visible = $true

    } catch {
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,"Error","OK","Error") | Out-Null
    }
    $btnPreview.Text = "Preview"; $btnPreview.Enabled = $true
})

$btnDoFill.Add_Click({
    if ($script:pendingDays.Count -eq 0) { return }
    $list = ($script:pendingDays | ForEach-Object { $_.ToString("yyyy-MM-dd") + " (" + $dn[[int]$_.DayOfWeek] + ")" }) -join "`n"
    $ans  = [System.Windows.Forms.MessageBox]::Show("Fill $($script:pendingDays.Count) day(s)?`n`n$list`n`nEach day: 7h BLD + 2h OHD","Confirm","YesNo","Question")
    if ($ans -ne "Yes") { return }

    $btnDoFill.Text = "Filling..."; $btnDoFill.Enabled = $false
    $hdrs = Get-H; $url = "https://$($cfg.Subdomain).bamboohr.com/api/v1/time_tracking/clock_entries/store"
    $ok = 0; $fail = 0

    foreach ($day in $script:pendingDays) {
        $ds   = $day.ToString("yyyy-MM-dd")
        $body = @{
            entries = @(
                @{ employeeId=[int]$cfg.EmployeeId; date=$ds; start="09:00"; end="16:00"; projectId=$script:task1Config.projectId; taskId=$script:task1Config.taskId; note="" },
                @{ employeeId=[int]$cfg.EmployeeId; date=$ds; start="16:00"; end="18:00"; projectId=$script:task2Config.projectId; taskId=$script:task2Config.taskId; note="" }
            )
        } | ConvertTo-Json -Depth 5

        $success = $false
        try { Invoke-RestMethod -Uri $url -Headers $hdrs -Method POST -Body $body -ErrorAction Stop | Out-Null; $success=$true } catch {}

        foreach ($row in $gF.Rows) {
            if ($row.Cells["Date"].Value -eq $ds) {
                if ($success) { $row.Cells["Status"].Value="Filled"; $row.DefaultCellStyle.ForeColor=$cGreen; $ok++ }
                else          { $row.Cells["Status"].Value="FAILED"; $row.DefaultCellStyle.ForeColor=$cRed;   $fail++ }
            }
        }
    }

    $infoFLbl.Text = "  Done. Filled: $ok   Failed: $fail"
    $infoFLbl.ForeColor = if ($fail -eq 0) { $cGreen } else { $cYellow }
    $script:pendingDays = @(); $btnDoFill.Text = "Fill Missing"
})

# =====================================================================
# PAGE 3 - BROWSE TASKS
# =====================================================================
$gT, $infoT, $null, $ctrlT, $dpTS, $dpTE, $null, $null = New-PageControls $pageTasks "Browse Tasks"
$dpTS.Value = (Get-Date).AddDays(-90)

$btnFetchTasks = New-Btn "Fetch Tasks" 140 36
$btnFetchTasks.Location = [System.Drawing.Point]::new(700, 22)
$ctrlT.Controls.Add($btnFetchTasks)

$btnFetchTasks.Add_Click({
    $s = $dpTS.Value.ToString("yyyy-MM-dd")
    $e = $dpTE.Value.ToString("yyyy-MM-dd")
    $btnFetchTasks.Text = "Loading..."; $btnFetchTasks.Enabled = $false
    $gT.Rows.Clear(); $gT.Columns.Clear()

    try {
        $b64     = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($cfg.ApiKey):x"))
        $hdrs    = @{ Authorization = "Basic $b64"; Accept = "application/json" }
        $entries = Invoke-RestMethod -Uri "https://$($cfg.Subdomain).bamboohr.com/api/v1/time_tracking/timesheet_entries?employeeIds=$($cfg.EmployeeId)&start=$s&end=$e" -Headers $hdrs -Method GET -ErrorAction Stop

        $gT.Columns.Add("c0", "Project ID") | Out-Null
        $gT.Columns.Add("c1", "Project")    | Out-Null
        $gT.Columns.Add("c2", "Task ID")    | Out-Null
        $gT.Columns.Add("c3", "Task")       | Out-Null
        $gT.Columns["c0"].FillWeight = 55
        $gT.Columns["c1"].FillWeight = 160
        $gT.Columns["c2"].FillWeight = 55
        $gT.Columns["c3"].FillWeight = 230

        $seen = @{}
        foreach ($en in $entries) {
            $projId = [string]$en.projectInfo.project.id
            $taskId = [string]$en.projectInfo.task.id
            $k = "${projId}:${taskId}"
            if (-not $seen.ContainsKey($k)) {
                $seen[$k] = $true
                $i = $gT.Rows.Add()
                $gT.Rows[$i].Cells[0].Value = $projId
                $gT.Rows[$i].Cells[1].Value = [string]$en.projectInfo.project.name
                $gT.Rows[$i].Cells[2].Value = $taskId
                $gT.Rows[$i].Cells[3].Value = [string]$en.projectInfo.task.name
                $gT.Rows[$i].DefaultCellStyle.ForeColor = $cWhite
            }
        }

        $stripLbl.Text = "  $($cfg.Subdomain).bamboohr.com  |  Employee $($cfg.EmployeeId)  |  $($seen.Count) task(s) found"
        if ($seen.Count -eq 0) {
            [System.Windows.Forms.MessageBox]::Show("No entries found. Try a wider date range.","No Data","OK","Information") | Out-Null
        }
    } catch {
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message,"Error","OK","Error") | Out-Null
    }
    $btnFetchTasks.Text = "Fetch Tasks"; $btnFetchTasks.Enabled = $true
})

# =====================================================================
Set-Nav "Get"
Resize-Pages
$form.ShowDialog() | Out-Null
