param(
    [int] $RequiredMonitors = 1
)

$ErrorActionPreference = "Stop"
$reportPath = "C:\SidepadTest\report.json"
$stagePath = "C:\SidepadTest\stage.txt"
New-Item -ItemType Directory -Force (Split-Path $reportPath) | Out-Null
function Set-Stage([string] $stage) {
    "$(Get-Date -Format o) $stage" | Set-Content -Encoding UTF8 $stagePath
}
Set-Stage "started"
trap {
    Set-Stage "failed: $($_.Exception.Message)"
    [ordered]@{
        timestamp = (Get-Date).ToString("o")
        status = "failed"
        error = $_.Exception.Message
        script_stack = $_.ScriptStackTrace
    } | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $reportPath
    exit 1
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class SidepadWin32 {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);

    [DllImport("user32.dll")]
    public static extern IntPtr GetShellWindow();

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

function Get-SidepadWindows([int[]] $processIds) {
    $windows = [System.Collections.Generic.List[object]]::new()
    $callback = [SidepadWin32+EnumWindowsProc]{
        param([IntPtr] $handle, [IntPtr] $parameter)
        [uint32] $processId = 0
        [SidepadWin32]::GetWindowThreadProcessId($handle, [ref] $processId) | Out-Null
        if ($processIds -contains [int]$processId -and [SidepadWin32]::IsWindowVisible($handle)) {
            $rect = New-Object SidepadWin32+RECT
            if ([SidepadWin32]::GetWindowRect($handle, [ref]$rect)) {
                $windows.Add([pscustomobject]@{
                    Handle = $handle.ToInt64()
                    Left = $rect.Left
                    Top = $rect.Top
                    Right = $rect.Right
                    Bottom = $rect.Bottom
                    Width = $rect.Right - $rect.Left
                    Height = $rect.Bottom - $rect.Top
                })
            }
        }
        return $true
    }
    [SidepadWin32]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
    return @($windows)
}

$candidatePaths = @(
    "$env:LOCALAPPDATA\Programs\Sidepad\Sidepad.exe",
    "$env:LOCALAPPDATA\Programs\sidepad\Sidepad.exe",
    "$env:LOCALAPPDATA\Programs\sidepad-for-windows\Sidepad.exe",
    "$env:ProgramFiles\Sidepad\Sidepad.exe",
    "D:\payload\Sidepad-unpacked\Sidepad.exe",
    "C:\SidepadTest\Sidepad-portable.exe"
)
$sidepadExe = $candidatePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $sidepadExe) {
    $sidepadExe = Get-ChildItem "$env:LOCALAPPDATA\Programs" -Filter "Sidepad.exe" -File -Recurse -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty FullName -First 1
}
if (-not $sidepadExe) {
    throw "Sidepad.exe was not found after installation."
}
Set-Stage "executable-found"

Get-Process -Name Sidepad -ErrorAction SilentlyContinue |
    Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Set-Stage "old-processes-stopped"

$process = Start-Process -FilePath $sidepadExe -ArgumentList "--remote-debugging-port=9222" -PassThru
Set-Stage "process-started"
Start-Sleep -Seconds 8
Set-Stage "startup-wait-complete"
$processIds = @(Get-Process -Name Sidepad -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
if ($processIds.Count -eq 0) {
    throw "Sidepad process did not remain running."
}
Set-Stage "processes-found"

$monitorResults = @()
$screens = @([System.Windows.Forms.Screen]::AllScreens)
foreach ($screen in $screens) {
    Set-Stage "moving-to-edge-$($screen.DeviceName)"
    $bounds = $screen.Bounds
    [SidepadWin32]::SetCursorPos($bounds.Right - 1, $bounds.Top + [int]($bounds.Height / 2)) | Out-Null
    Start-Sleep -Seconds 3
    $expanded = Get-SidepadWindows $processIds |
        Where-Object {
            [Math]::Abs($_.Right - $bounds.Right) -le 8 -and
            $_.Bottom -gt $bounds.Top -and
            $_.Top -lt $bounds.Bottom
        }
    $expandedPanel = $expanded | Sort-Object Width -Descending | Select-Object -First 1
    Set-Stage "expanded-captured-$($screen.DeviceName)"

    [SidepadWin32]::SetCursorPos($bounds.Left + 20, $bounds.Top + [int]($bounds.Height / 2)) | Out-Null
    [SidepadWin32]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
    [SidepadWin32]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
    [SidepadWin32]::SetForegroundWindow([SidepadWin32]::GetShellWindow()) | Out-Null
    Start-Sleep -Seconds 4
    $collapsed = Get-SidepadWindows $processIds |
        Where-Object {
            [Math]::Abs($_.Right - $bounds.Right) -le 8 -and
            $_.Bottom -gt $bounds.Top -and
            $_.Top -lt $bounds.Bottom
        }
    $collapsedPanel = $collapsed | Sort-Object Width -Descending | Select-Object -First 1
    Set-Stage "collapsed-captured-$($screen.DeviceName)"

    $monitorResults += [pscustomobject]@{
        device_name = $screen.DeviceName
        bounds = [pscustomobject]@{
            left = $bounds.Left
            top = $bounds.Top
            width = $bounds.Width
            height = $bounds.Height
        }
        expanded_max_width = if ($expandedPanel) { $expandedPanel.Width } else { 0 }
        expanded_panel_left = if ($expandedPanel) { $expandedPanel.Left } else { $null }
        collapsed_max_width = if ($collapsedPanel) { $collapsedPanel.Width } else { 0 }
        edge_expand_pass = $expandedPanel -and $expandedPanel.Width -ge 300
        auto_hide_pass = (-not $collapsedPanel) -or $collapsedPanel.Width -le 100
    }
}

$expandedWidth = ($monitorResults | Measure-Object expanded_max_width -Maximum).Maximum
$collapsedWidth = ($monitorResults | Measure-Object collapsed_max_width -Maximum).Maximum

$cdpReady = $false
try {
    $targets = Invoke-RestMethod -Uri "http://127.0.0.1:9222/json" -TimeoutSec 5
    $cdpReady = @($targets).Count -gt 0
} catch {
    $cdpReady = $false
}

$edgeExpandPass = @($monitorResults | Where-Object { -not $_.edge_expand_pass }).Count -eq 0
$autoHidePass = @($monitorResults | Where-Object { -not $_.auto_hide_pass }).Count -eq 0
$dualMonitorPass = $screens.Count -ge $RequiredMonitors -and $edgeExpandPass

$report = [ordered]@{
    timestamp = (Get-Date).ToString("o")
    status = if ($edgeExpandPass -and $autoHidePass -and $dualMonitorPass) { "passed" } else { "failed" }
    os = (Get-CimInstance Win32_OperatingSystem).Caption
    os_build = (Get-CimInstance Win32_OperatingSystem).BuildNumber
    architecture = $env:PROCESSOR_ARCHITECTURE
    monitor_count = $screens.Count
    required_monitor_count = $RequiredMonitors
    sidepad_exe = $sidepadExe
    process_running = $processIds.Count -gt 0
    cdp_ready = $cdpReady
    expanded_max_width = $expandedWidth
    collapsed_max_width = $collapsedWidth
    monitors = $monitorResults
    edge_expand_pass = $edgeExpandPass
    auto_hide_pass = $autoHidePass
    dual_monitor_pass = $dualMonitorPass
}

Set-Stage "writing-report"
$report | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $reportPath
Set-Stage "report-written"
