<#
.SYNOPSIS
    Atomic semver bump script for HushWrite across desktop and website codebases.

.DESCRIPTION
    Updates the version string in one pass across:
      - package.json
      - src-tauri/Cargo.toml
      - src-tauri/tauri.conf.json
      - website/src/components/Hero.tsx
      - website/src/components/DownloadSection.tsx
      - website/src/components/Footer.tsx
      - website/src/app/api/download/route.ts
      - website/src/app/page.tsx

.PARAMETER NewVersion
    The target semantic version string (e.g. "1.2.2", "1.3.0").

.PARAMETER DryRun
    When specified, previews changes without writing to disk.

.EXAMPLE
    .\scripts\bump_version.ps1 1.2.2
    .\scripts\bump_version.ps1 -NewVersion "1.3.0" -DryRun
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidatePattern('^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$')]
    [string]$NewVersion,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Determine repository root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
Set-Location $RepoRoot

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " HushWrite Atomic Version Bump -> v$NewVersion" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host " [DRY RUN MODE - No files will be modified]" -ForegroundColor Yellow
}
Write-Host "===========================================================`n" -ForegroundColor Cyan

$script:ModifiedCount = 0

function Update-File {
    param (
        [string]$RelativePath,
        [scriptblock]$Mutator
    )

    $FullPath = Join-Path $RepoRoot $RelativePath
    if (-not (Test-Path $FullPath)) {
        Write-Warning "File not found: $RelativePath (Skipping)"
        return
    }

    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $Original = [System.IO.File]::ReadAllText($FullPath, $Utf8NoBom)
    $Updated = & $Mutator $Original

    if ($Original -ne $Updated) {
        if (-not $DryRun) {
            [System.IO.File]::WriteAllText($FullPath, $Updated, $Utf8NoBom)
        }
        Write-Host "  [OK] Updated: $RelativePath" -ForegroundColor Green
        $script:ModifiedCount++
    } else {
        Write-Host "  [--] Unchanged: $RelativePath" -ForegroundColor DarkGray
    }
}

# 1. Root package.json
Update-File "package.json" {
    param($text)
    $text -replace '(?m)"version":\s*"[0-9]+\.[0-9]+\.[0-9]+[^"]*"', ('"version": "' + $NewVersion + '"')
}

# 2. src-tauri/Cargo.toml
Update-File "src-tauri\Cargo.toml" {
    param($text)
    $text -replace '(?m)^version\s*=\s*"[0-9]+\.[0-9]+\.[0-9]+[^"]*"', ('version = "' + $NewVersion + '"')
}

# 3. src-tauri/tauri.conf.json
Update-File "src-tauri\tauri.conf.json" {
    param($text)
    $text -replace '(?m)"version":\s*"[0-9]+\.[0-9]+\.[0-9]+[^"]*"', ('"version": "' + $NewVersion + '"')
}

# 4. website/src/components/Hero.tsx
Update-File "website\src\components\Hero.tsx" {
    param($text)
    $t = [System.Text.RegularExpressions.Regex]::Replace($text, 'HushWrite_[0-9]+\.[0-9]+\.[0-9]+[^_]*_x64-setup\.exe', "HushWrite_${NewVersion}_x64-setup.exe")
    $t = [System.Text.RegularExpressions.Regex]::Replace($t, 'Windows: Download Free \(v[0-9]+\.[0-9]+\.[0-9]+[^\)]*\)', "Windows: Download Free (v${NewVersion})")
    return $t
}

# 5. website/src/components/DownloadSection.tsx
Update-File "website\src\components\DownloadSection.tsx" {
    param($text)
    $t = [System.Text.RegularExpressions.Regex]::Replace($text, 'HushWrite_[0-9]+\.[0-9]+\.[0-9]+[^_]*_(x64-setup\.exe|x64_en-US\.msi|aarch64\.dmg|x64\.dmg)', "HushWrite_${NewVersion}_`$1")
    $t = [System.Text.RegularExpressions.Regex]::Replace($t, 'Download HushWrite v[0-9]+\.[0-9]+\.[0-9]+[^ <\r\n]*', "Download HushWrite v${NewVersion}")
    $t = [System.Text.RegularExpressions.Regex]::Replace($t, 'releases/tag/v[0-9]+\.[0-9]+\.[0-9]+[^" <\r\n]*', "releases/tag/v${NewVersion}")
    $t = [System.Text.RegularExpressions.Regex]::Replace($t, 'v[0-9]+\.[0-9]+\.[0-9]+[^ ]* · Stable Release', "v${NewVersion} · Stable Release")
    $t = [System.Text.RegularExpressions.Regex]::Replace($t, 'SHA256SUMS\.txt \(v[0-9]+\.[0-9]+\.[0-9]+[^\)]*\)', "SHA256SUMS.txt (v${NewVersion})")
    return $t
}

# 6. website/src/components/Footer.tsx
Update-File "website\src\components\Footer.tsx" {
    param($text)
    $t = [System.Text.RegularExpressions.Regex]::Replace($text, 'badge:\s*"v[0-9]+\.[0-9]+\.[0-9]+[^"]*"', "badge: `"v${NewVersion}`"")
    $t = [System.Text.RegularExpressions.Regex]::Replace($t, '(?m)^\s*v[0-9]+\.[0-9]+\.[0-9]+[^<\r\n]*\s*$', "                  v${NewVersion}")
    return $t
}

# 7. website/src/app/api/download/route.ts
Update-File "website\src\app\api\download\route.ts" {
    param($text)
    return [System.Text.RegularExpressions.Regex]::Replace($text, 'HushWrite_[0-9]+\.[0-9]+\.[0-9]+[^_]*_x64-setup\.exe', "HushWrite_${NewVersion}_x64-setup.exe")
}

# 8. website/src/app/page.tsx
Update-File "website\src\app\page.tsx" {
    param($text)
    $t = [System.Text.RegularExpressions.Regex]::Replace($text, 'HushWrite_[0-9]+\.[0-9]+\.[0-9]+[^_]*_x64-setup\.exe', "HushWrite_${NewVersion}_x64-setup.exe")
    $t = [System.Text.RegularExpressions.Regex]::Replace($t, 'softwareVersion:\s*"[0-9]+\.[0-9]+\.[0-9]+[^"]*"', "softwareVersion: `"${NewVersion}`"")
    return $t
}

Write-Host "`n===========================================================" -ForegroundColor Cyan
Write-Host " Bump Completed: $script:ModifiedCount files affected." -ForegroundColor Green
Write-Host "===========================================================`n" -ForegroundColor Cyan
