$ErrorActionPreference = "Stop"

function S {
  param([int[]]$Codes)
  $value = ""
  foreach ($code in $Codes) {
    $value += [string]([char]$code)
  }
  return $value
}

$badPatterns = @(
  (S @(0x00C3,0x00A9)),
  (S @(0x00C3,0x00A8)),
  (S @(0x00C3,0x00AA)),
  (S @(0x00C3,0x0192)),
  (S @(0x00C2,0x00A9)),
  (S @(0x00C2,0x00A8)),
  (S @(0x00C2,0x00AA)),
  (S @(0x00F0,0x0178)),
  (S @(0x00E2,0x20AC)),
  (S @(0x00E2,0x0161)),
  (S @(0xFFFD))
)

$files = Get-ChildItem ".\src" -Recurse -Include *.ts,*.tsx,*.js,*.jsx |
  Where-Object {
    $_.FullName -notmatch "\\.next\\" -and
    $_.Name -notmatch "\.backup" -and
    $_.FullName -notmatch "backup-avant" -and
    $_.FullName -notmatch "backup-ajout" -and
    $_.FullName -notmatch "backup-clean"
  }

$badFiles = @()

foreach ($file in $files) {
  $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)

  foreach ($pattern in $badPatterns) {
    if ($content.Contains($pattern)) {
      $badFiles += $file.FullName
      break
    }
  }
}

if ($badFiles.Count -gt 0) {
  Write-Host ""
  Write-Host "ENCODING ERROR: corrupted text detected." -ForegroundColor Red

  $badFiles | Sort-Object -Unique | ForEach-Object {
    Write-Host " - $_" -ForegroundColor Yellow
  }

  Write-Host ""
  Write-Host "Build blocked. Fix encoding before deploy." -ForegroundColor Red
  exit 1
}

Write-Host "Encoding OK." -ForegroundColor Green