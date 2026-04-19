# BambooHR Tools

## Configuration — `config.ini`

All user-specific settings live **exclusively in `config.ini`**. No credentials are hardcoded in any script.

```ini
[BambooHR]
Subdomain  = your-company    # the part before .bamboohr.com
ApiKey     = xxxxxxxxxxxx    # from BambooHR > top-right menu > API Keys
EmployeeId = 123             # your employee ID (visible in the URL of your profile page)
```

Every script reads `config.ini` automatically on startup. For the CLI scripts, any value can also be overridden per-run with a flag (e.g. `-ApiKey`, `-EmployeeId`, `-Subdomain`), but `config.ini` is always the default source.

> **Security note:** `config.ini` contains your API key. Do not commit it to a public repository.

---

## Running on Windows

**One-time setup** — allow local scripts:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**GUI app** (all features in one window):
```powershell
.\BambooHR-v2.ps1
```

**CLI scripts:**
```powershell
.\Get-BambooHRHours.ps1  -StartDate "2026-04-01" -EndDate "2026-04-30"
.\Fill-BambooHRHours.ps1 -StartDate "2026-04-01" -EndDate "2026-04-30"
.\Get-BambooHRTasks.ps1
```

---

## Running on macOS

**Prerequisite:** install [PowerShell for macOS](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-macos).

**Web app** (recommended — replaces the Windows GUI):
```bash
pwsh ./BambooHR-Web.ps1
```
Opens a browser automatically at `http://localhost:8787/`. Press `Ctrl+C` in the terminal to stop.

**CLI scripts** (same as Windows, using `pwsh` and `/` instead of `.\`):
```bash
pwsh ./Get-BambooHRHours.ps1  -StartDate "2026-04-01" -EndDate "2026-04-30"
pwsh ./Fill-BambooHRHours.ps1 -StartDate "2026-04-01" -EndDate "2026-04-30"
pwsh ./Get-BambooHRTasks.ps1
```

> `BambooHR-v2.ps1` uses Windows-only APIs (WinForms) and **cannot run on macOS**. Use `BambooHR-Web.ps1` instead.

---

## Feature overview

| Feature | Windows | macOS |
|---------|---------|-------|
| GUI / Web app | `BambooHR-v2.ps1` | `BambooHR-Web.ps1` |
| Get Hours | ✓ | ✓ |
| Fill Hours (with task picker) | ✓ | ✓ |
| Browse Tasks | ✓ | ✓ |
| CLI scripts | ✓ | ✓ |

### Get Hours
Shows logged hours per work day (Sun–Thu). Color-coded: green = full day, yellow = partial, cyan = time off, gray = missing. Summary cards show total hours, days worked, days off, and daily average.

### Fill Hours
Preview missing days first, then fill them with 7h BLD + 2h OHD. Requires confirmation before writing. Use **Load Tasks** to pick your project/task from a dropdown instead of the hardcoded defaults (project 46, tasks 170/172).

### Browse Tasks
Lists all unique project/task ID combos found in your timesheet history. Use these IDs to customize what Fill Hours submits.

All sections have **This Month** / **Last Month** quick-select buttons.

---

## TODO

- [x] **Fill Hours: task picker dropdowns** — Fill Hours now has a second row with two dropdowns (Task 1 and Task 2). Click **Load Tasks** to populate them from your timesheet history (last 90 days), then select the tasks you want. Falls back to hardcoded defaults (project 46, tasks 170/172) if Load Tasks is not clicked. `Fill-BambooHRHours.ps1` still uses hardcoded IDs.
- [x] **macOS support** — `BambooHR-Web.ps1` provides a cross-platform browser-based UI equivalent to the Windows GUI.
