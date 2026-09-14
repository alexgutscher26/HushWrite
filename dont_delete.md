# 1. Set Tenant ID (if in a new PowerShell session)

$env:AZURE_TENANT_ID = "744bdc23-0b2e-4bfd-811e-c142a64b68fd"

# 1. Sign the NSIS Setup (.exe)
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign `
  /v /debug `
  /fd SHA256 `
  /tr "http://timestamp.acs.microsoft.com" `
  /td SHA256 `
  /dlib ".\dlib\bin\x64\Azure.CodeSigning.Dlib.dll" `
  /dmdf ".\metadata.json" `
  "website\public\downloads\HushWrite_1.2.1_x64-setup.exe"

# 2. Sign the MSI Package (.msi)
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign `
  /v /debug `
  /fd SHA256 `
  /tr "http://timestamp.acs.microsoft.com" `
  /td SHA256 `
  /dlib ".\dlib\bin\x64\Azure.CodeSigning.Dlib.dll" `
  /dmdf ".\metadata.json" `
  "website\public\downloads\HushWrite_1.2.1_x64_en-US.msi"
