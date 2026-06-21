param(
  [string]$Destination = "$HOME\.codex\skills\edge-chatgpt-web-research"
)

$ErrorActionPreference = "Stop"
$Repo = Resolve-Path (Join-Path $PSScriptRoot "..")
$Dest = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Destination)

New-Item -ItemType Directory -Force -Path $Dest | Out-Null

$items = @(
  "SKILL.md",
  "README.md",
  "LICENSE",
  "package.json",
  "package-lock.json",
  "agents",
  "examples",
  "scripts",
  "src"
)

foreach ($item in $items) {
  $source = Join-Path $Repo $item
  if (Test-Path $source) {
    Copy-Item -Path $source -Destination $Dest -Recurse -Force
  }
}

Write-Output "Installed edge-chatgpt-web-research skill to $Dest"
Write-Output "Restart Codex to pick up new or updated skills."
