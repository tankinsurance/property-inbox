# github-setup.ps1
# Run this once after generating a new GitHub PAT (classic token, repo + org scope)
# Usage: .\scripts\github-setup.ps1 -Token ghp_YOUR_NEW_TOKEN

param(
  [Parameter(Mandatory=$true)]
  [string]$Token
)

$OWNER = "tankinsurance"
$REPO  = "property-inbox"

$headers = @{
  "Authorization"        = "Bearer $Token"
  "Accept"               = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
  "User-Agent"           = "pencev-setup/1.0"
}

Write-Host "[1/4] Verifying token..." -ForegroundColor Cyan
$me = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
Write-Host "  Authenticated as: $($me.login)" -ForegroundColor Green

Write-Host "[2/4] Creating repo $OWNER/$REPO..." -ForegroundColor Cyan
$body = @{
  name        = $REPO
  description = "Pencev Capital — Property Management Inbox (Kanban UI)"
  private     = $false
  auto_init   = $false
} | ConvertTo-Json

try {
  $repo = Invoke-RestMethod -Uri "https://api.github.com/orgs/$OWNER/repos" -Method POST -Headers $headers -Body $body -ContentType "application/json"
  Write-Host "  Repo created: $($repo.html_url)" -ForegroundColor Green
} catch {
  if ($_.Exception.Response.StatusCode -eq 422) {
    Write-Host "  Repo already exists (skipping creation)" -ForegroundColor Yellow
  } else {
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
  }
}

Write-Host "[3/4] Setting remote and pushing..." -ForegroundColor Cyan
$repoDir = Split-Path -Parent $PSScriptRoot

Push-Location $repoDir
try {
  git remote add origin "https://$Token@github.com/$OWNER/$REPO.git" 2>$null
  git remote set-url origin "https://$Token@github.com/$OWNER/$REPO.git"
  git branch -M main
  git push -u origin main
  Write-Host "  Pushed successfully" -ForegroundColor Green
} finally {
  Pop-Location
}

Write-Host "[4/4] Done!" -ForegroundColor Green
Write-Host ""
Write-Host "  GitHub repo:    https://github.com/$OWNER/$REPO" -ForegroundColor Cyan
Write-Host "  Raw queue URL:  https://raw.githubusercontent.com/$OWNER/$REPO/main/queue.json" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next: Connect to Cloudflare Pages:" -ForegroundColor Yellow
Write-Host "    1. dash.cloudflare.com -> Workers & Pages -> Create -> Pages -> Connect to Git"
Write-Host "    2. Select: tankinsurance/property-inbox"
Write-Host "    3. Framework: None | Build command: (blank) | Output dir: /"
Write-Host "    4. Deploy"
