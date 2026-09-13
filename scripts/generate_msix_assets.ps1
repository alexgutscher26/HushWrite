Add-Type -AssemblyName System.Drawing

$src = "assets\logo-2160x2160.png"
$outDir = "msix-assets"
if (-not (Test-Path $outDir)) { 
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

$srcImg = [System.Drawing.Image]::FromFile((Resolve-Path $src).Path)

function Resize-Square($image, $size, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($image, 0, 0, $size, $size)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

function Resize-Wide($image, $w, $h, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $iconSize = [Math]::Min($h, $w)
    $x = [int](($w - $iconSize) / 2)
    $y = [int](($h - $iconSize) / 2)
    $g.DrawImage($image, $x, $y, $iconSize, $iconSize)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

Resize-Square $srcImg 50 (Join-Path $outDir "StoreLogo.png")
Resize-Square $srcImg 44 (Join-Path $outDir "Square44x44Logo.png")
Resize-Square $srcImg 150 (Join-Path $outDir "Square150x150Logo.png")
Resize-Wide $srcImg 310 150 (Join-Path $outDir "Wide310x150Logo.png")
Resize-Wide $srcImg 620 300 (Join-Path $outDir "SplashScreen.png")

$srcImg.Dispose()
Write-Host "Generated all MSIX tile images successfully in $outDir"
