[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath
)

$ErrorActionPreference = "Stop"

if (Get-Process -Name "Sidepad" -ErrorAction SilentlyContinue) {
  throw "Exit Sidepad before restoring user data."
}

if (-not (Test-Path -LiteralPath $BackupPath -PathType Leaf)) {
  throw "Backup archive was not found: $BackupPath"
}

$checksumPath = "$BackupPath.sha256"
if (-not (Test-Path -LiteralPath $checksumPath -PathType Leaf)) {
  throw "Checksum file was not found: $checksumPath"
}

$expected = ((Get-Content -LiteralPath $checksumPath -TotalCount 1) -split "\s+")[0].ToLowerInvariant()
$actual = (Get-FileHash -LiteralPath $BackupPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expected -ne $actual) {
  throw "Backup checksum verification failed."
}

$target = Join-Path $env:APPDATA "sidepad-for-windows"
$parent = Split-Path $target -Parent
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$temporary = Join-Path $parent "sidepad-restore-$stamp"
$rollback = "$target.rollback-$stamp"

New-Item -ItemType Directory -Path $parent -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($BackupPath, $temporary)

$hasRollback = $false
try {
  if (Test-Path -LiteralPath $target) {
    Move-Item -LiteralPath $target -Destination $rollback
    $hasRollback = $true
  }
  Move-Item -LiteralPath $temporary -Destination $target
} catch {
  if (Test-Path -LiteralPath $temporary) {
    Remove-Item -LiteralPath $temporary -Recurse -Force
  }
  if ($hasRollback -and -not (Test-Path -LiteralPath $target)) {
    Move-Item -LiteralPath $rollback -Destination $target
  }
  throw
}

Write-Output "Restore completed: $target"
if ($hasRollback) {
  Write-Output "Previous data retained for rollback: $rollback"
}
