# scripts/recolor-muscles.ps1
# Recoloration des 11 illustrations musculaires en noir & or et redimensionnement 144x144

param(
    [string]$SourceDir = "$PSScriptRoot\..\design\muscles",
    [string]$TargetDir = "$PSScriptRoot\..\src\assets\muscles",
    [int]$TargetSize = 144
)

Add-Type -AssemblyName System.Drawing

if (!(Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

# Mapping source -> destination
$muscles = @{
    'abdos' = 'abdos.png'
    'avant-bras' = 'avant-bras.png'
    'biceps' = 'biceps.png'
    'dos' = 'grand-dorsal.png'
    'epaules' = 'epaules.png'
    'fessiers' = 'fessiers.png'
    'ischios' = 'Ischios.png'
    'mollets' = 'mollets.png'
    'pectoraux' = 'pectoraux.png'
    'quadriceps' = 'quadriceps.png'
    'triceps' = 'triceps.png'
}

# Couleurs du design (tokens index.css)
$cGold = [System.Drawing.ColorTranslator]::FromHtml('#E8B931')      # --color-gold (muscle visé)
$cGoldDark = [System.Drawing.ColorTranslator]::FromHtml('#9E7A18')  # Or plus sombre (muscle secondaire)
$cDarkGray = [System.Drawing.ColorTranslator]::FromHtml('#262626')  # --color-line (contour foncé)
$cMedGray = [System.Drawing.ColorTranslator]::FromHtml('#52524E')   # Gris moyen harmonisé (muscles clairs)

Write-Host "Traitement des 11 groupes musculaires..." -ForegroundColor Cyan

foreach ($name in $muscles.Keys | Sort-Object) {
    $srcFileName = $muscles[$name]
    $srcPath = Join-Path $SourceDir $srcFileName
    $dstPath = Join-Path $TargetDir "$name.png"
    
    if (!(Test-Path $srcPath)) {
        Write-Warning "Fichier source introuvable: $srcPath"
        continue
    }

    $srcBmp = New-Object System.Drawing.Bitmap($srcPath)
    $recolored = New-Object System.Drawing.Bitmap($srcBmp.Width, $srcBmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($y = 0; $y -lt $srcBmp.Height; $y++) {
        for ($x = 0; $x -lt $srcBmp.Width; $x++) {
            $p = $srcBmp.GetPixel($x, $y)
            if ($p.A -eq 0) {
                $recolored.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                continue
            }

            $h = $p.GetHue()
            $s = $p.GetSaturation()
            $b = $p.GetBrightness()

            # Classification par teinte et saturation (robuste à l'anticrénelage)
            $targetCol = $null
            if ($s -gt 0.35) {
                if ($h -ge 320 -or $h -le 5) {
                    # Rouge -> or
                    $targetCol = $cGold
                } elseif ($h -gt 5 -and $h -lt 40) {
                    # Orange -> or sombre
                    $targetCol = $cGoldDark
                }
            }

            if ($null -eq $targetCol) {
                # Bleu-gris ou désaturé
                if ($b -lt 0.50) {
                    # Contour foncé
                    $targetCol = $cDarkGray
                } else {
                    # Muscles clairs
                    $targetCol = $cMedGray
                }
            }

            # Alpha d'origine conservé
            $newPixel = [System.Drawing.Color]::FromArgb($p.A, $targetCol.R, $targetCol.G, $targetCol.B)
            $recolored.SetPixel($x, $y, $newPixel)
        }
    }

    # Redimensionnement haute qualité
    $destBmp = New-Object System.Drawing.Bitmap($TargetSize, $TargetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($recolored, 0, 0, $TargetSize, $TargetSize)

    $destBmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Si c'est dos.png, on génère aussi grand-dorsal.png pour rétrocompatibilité
    if ($name -eq 'dos') {
        $aliasPath = Join-Path $TargetDir "grand-dorsal.png"
        $destBmp.Save($aliasPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }

    $g.Dispose()
    $destBmp.Dispose()
    $recolored.Dispose()
    $srcBmp.Dispose()

    Write-Host "  -> $name.png (144x144)" -ForegroundColor Green
}

Write-Host "Recoloration terminée avec succès." -ForegroundColor Cyan
