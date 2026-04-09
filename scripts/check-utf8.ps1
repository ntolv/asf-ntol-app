Set-Location $PSScriptRoot\..

$ErrorActionPreference = "Stop"

$extensions = @("*.ts","*.tsx","*.js","*.jsx","*.mjs","*.cjs","*.json","*.css","*.scss","*.md","*.sql","*.yml","*.yaml")
$roots = @("src","public","scripts",".vscode") | Where-Object { Test-Path $_ }

$patterns = @("Ã","","â€","â€œ","â€")

$files = foreach ($root in $roots) {
  foreach ($ext in $extensions) {
    Get-ChildItem -Path $root -Recurse -File -Filter $ext -ErrorAction SilentlyContinue
  }
}

$files = $files | Sort-Object FullName -Unique

$issues = @()

foreach ($file in $files) {
  $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
  foreach ($pattern in $patterns) {
    if ($content.Contains($pattern)) {
      $issues += [pscustomobject]@{
        File = $file.FullName
        Pattern = $pattern
      }
    }
  }
}

if ($issues.Count -eq 0) {
  Write-Host "Aucun motif suspect detecte." -ForegroundColor Green
  exit 0
}

$issues | Sort-Object File, Pattern | Format-Table -AutoSize
Write-Host ""
Write-Host "Des motifs suspects ont ete detectes." -ForegroundColor Yellow
exit 1
