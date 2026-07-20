[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Destination,

  [ValidateRange(1, 3650)]
  [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
$source = Join-Path $env:APPDATA "sidepad-for-windows"

if (Get-Process -Name "Sidepad" -ErrorAction SilentlyContinue) {
  throw "Exit Sidepad before creating a backup."
}

if (-not (Test-Path -LiteralPath $source -PathType Container)) {
  throw "Sidepad user data was not found at $source."
}

New-Item -ItemType Directory -Path $Destination -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archive = Join-Path $Destination "sidepad-user-data-$stamp.zip"

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $source,
  $archive,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)

$hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $(Split-Path $archive -Leaf)" | Set-Content -LiteralPath "$archive.sha256" -Encoding ascii

$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -LiteralPath $Destination -Filter "sidepad-user-data-*.zip" -File |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
    Remove-Item -LiteralPath "$($_.FullName).sha256" -Force -ErrorAction SilentlyContinue
  }

Write-Output "Backup created: $archive"
Write-Output "SHA-256: $hash"
