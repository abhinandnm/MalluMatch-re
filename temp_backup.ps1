$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$backupName = "snapshot_$timestamp"
$backupPath = Join-Path "backups" $backupName

if (-not (Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" -Force
}

New-Item -ItemType Directory -Path $backupPath -Force

$excludeList = @("node_modules", "backups", ".git", "dist", ".next", "out")
Get-ChildItem -Path . -Exclude $excludeList | Copy-Item -Destination $backupPath -Recurse -Force

Write-Host "Backup created at: $backupPath"
