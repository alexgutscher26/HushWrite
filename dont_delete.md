# Release Workflow Cheat Sheet

## 1. Version Bump
```powershell
# Preview changes:
bun run version:bump 1.3.0 -DryRun

# Apply atomic version bump across codebase:
bun run version:bump 1.3.0
```

## 2. Build Tauri Installers
```powershell
bun run tauri:build
```

## 3. Copy Built Installers to Website Downloads
```powershell
Copy-Item "src-tauri\target\release\bundle\nsis\HushWrite_1.3.0_x64-setup.exe" "website\public\downloads\" -Force
Copy-Item "src-tauri\target\release\bundle\msi\HushWrite_1.3.0_x64_en-US.msi" "website\public\downloads\" -Force
```

## 4. Azure Code Signing

```powershell
# Set Tenant ID (if starting a new PowerShell session)
$env:AZURE_TENANT_ID = "744bdc23-0b2e-4bfd-811e-c142a64b68fd"

# Sign the NSIS Setup (.exe)
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign `
  /v /debug `
  /fd SHA256 `
  /tr "http://timestamp.acs.microsoft.com" `
  /td SHA256 `
  /dlib ".\dlib\bin\x64\Azure.CodeSigning.Dlib.dll" `
  /dmdf ".\metadata.json" `
  "website\public\downloads\HushWrite_1.3.0_x64-setup.exe"

# Sign the MSI Package (.msi)
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign `
  /v /debug `
  /fd SHA256 `
  /tr "http://timestamp.acs.microsoft.com" `
  /td SHA256 `
  /dlib ".\dlib\bin\x64\Azure.CodeSigning.Dlib.dll" `
  /dmdf ".\metadata.json" `
  "website\public\downloads\HushWrite_1.3.0_x64_en-US.msi"
```
