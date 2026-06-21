param(
  [string]$Prompt,
  [string]$PromptFile,
  [string]$Topic = "chatgpt-web-research",
  [int]$TimeoutMinutes = 45,
  [int]$PollMs = 3000,
  [int]$Port = 9223,
  [string]$OutDir = "reports",
  [switch]$KeepMarker
)

$ErrorActionPreference = "Stop"
$Repo = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $Repo
try {
  if (-not (Test-Path ".\node_modules\playwright-core")) {
    npm install
  }

  $args = @(
    ".\src\cli.js",
    "run",
    "--topic", $Topic,
    "--timeout-minutes", "$TimeoutMinutes",
    "--poll-ms", "$PollMs",
    "--port", "$Port",
    "--out-dir", $OutDir
  )

  if ($PromptFile) {
    $args += @("--prompt-file", $PromptFile)
  } elseif ($Prompt) {
    $args += @("--prompt", $Prompt)
  } else {
    throw "Pass -Prompt or -PromptFile."
  }

  if ($KeepMarker) {
    $args += "--keep-marker"
  }

  & node @args
  if ($LASTEXITCODE -eq 0) {
    return
  }

  Write-Warning "Primary run failed; attempting to recover the latest marked ChatGPT response from the current Edge page."
  $recoverArgs = @(
    ".\src\cli.js",
    "recover",
    "--topic", $Topic,
    "--port", "$Port",
    "--out-dir", $OutDir
  )
  if ($KeepMarker) {
    $recoverArgs += "--keep-marker"
  }
  & node @recoverArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Run and recovery both failed."
  }
} finally {
  Pop-Location
}
