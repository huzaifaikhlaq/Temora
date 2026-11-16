param(
    [ValidateSet("small", "medium", "large")]
    [string]$Size = "medium",
    [ValidateRange(0, 999999999)]
    [int]$Seed = 41,
    [string[]]$AdditionalMemberId = @(),
    [switch]$Cleanup,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ($env:TEMORA_SEEDING_ENABLED -ne "true") {
    throw 'Set $env:TEMORA_SEEDING_ENABLED = "true" explicitly before running the development seeder.'
}
if ($env:TEMORA_ENVIRONMENT -notin @("development", "local", "test")) {
    throw 'Set $env:TEMORA_ENVIRONMENT to "development", "local", or "test" before running the development seeder.'
}

$docker = (Get-Command docker.exe -ErrorAction SilentlyContinue).Source
if (-not $docker) {
    $docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
}
if (-not (Test-Path -LiteralPath $docker)) {
    throw "Docker CLI was not found at '$docker'."
}

function Invoke-SeedPhase {
    param(
        [string]$Service,
        [string[]]$Options = @(),
        [object]$Manifest = $null
    )
    $arguments = @("compose", "exec", "-T", $Service, "python", "manage.py", "seed_demo", "--seed", "$Seed") + $Options
    if ($Manifest) {
        $json = ConvertTo-Json -InputObject $Manifest -Depth 50 -Compress
        $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
        $arguments += @("--manifest-base64", $encoded)
    }
    $output = & $docker @arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "$Service seeder command failed with exit code $exitCode."
    }
    $text = ($output -join "`n").Trim()
    try {
        return $text | ConvertFrom-Json
    }
    catch {
        throw "$Service seeder returned invalid JSON: $text"
    }
}

if ($Cleanup) {
    $identityPreview = Invoke-SeedPhase -Service "identity" -Options @("--cleanup", "--dry-run")
    $issueOptions = @("--cleanup")
    if ($DryRun) { $issueOptions += "--dry-run" }
    $issuePreview = Invoke-SeedPhase -Service "issue" -Options $issueOptions

    $projectOptions = @("--cleanup")
    if ($DryRun) { $projectOptions += "--dry-run" }
    foreach ($projectId in $issuePreview.preserved_project_ids) {
        $projectOptions += @("--preserve-project-id", [string]$projectId)
    }
    $projectPreview = Invoke-SeedPhase -Service "project" -Options $projectOptions

    $workspaceOptions = @("--cleanup")
    if ($DryRun) { $workspaceOptions += "--dry-run" }
    foreach ($workspaceId in $projectPreview.preserved_workspace_ids) {
        $workspaceOptions += @("--preserve-workspace-id", [string]$workspaceId)
    }
    foreach ($userId in $identityPreview.generated_user_ids) {
        $workspaceOptions += @("--generated-user-id", [string]$userId)
    }
    foreach ($memberId in $AdditionalMemberId) {
        $parsedId = [guid]::Empty
        if (-not [guid]::TryParse($memberId, [ref]$parsedId)) {
            throw "AdditionalMemberId must be a UUID: '$memberId'."
        }
        $workspaceOptions += @("--additional-member-id", $parsedId.ToString())
    }
    $workspacePreview = Invoke-SeedPhase -Service "workspace" -Options $workspaceOptions

    $identityOptions = @("--cleanup")
    if ($DryRun) { $identityOptions += "--dry-run" }
    $referencedUsers = @($workspacePreview.preserved_user_ids)
    foreach ($userId in $identityPreview.generated_user_ids) {
        if ($referencedUsers -contains [string]$userId) {
            $identityOptions += @("--preserve-user-id", [string]$userId)
        }
    }
    $identityResult = Invoke-SeedPhase -Service "identity" -Options $identityOptions
    Write-Host "Issue cleanup: $($issuePreview | ConvertTo-Json -Compress)"
    Write-Host "Project cleanup: $($projectPreview | ConvertTo-Json -Compress)"
    Write-Host "Workspace cleanup: $($workspacePreview | ConvertTo-Json -Compress)"
    Write-Host "Identity cleanup: $($identityResult | ConvertTo-Json -Compress)"
    return
}

$identityOptions = @("--size", $Size)
if ($DryRun) { $identityOptions += "--dry-run" }
$manifest = Invoke-SeedPhase -Service "identity" -Options $identityOptions
if ($DryRun) {
    Write-Host "Dry run: $($manifest | ConvertTo-Json -Compress)"
    Write-Host "No demo records were created."
    return
}

$workspaceOptions = @()
foreach ($memberId in $AdditionalMemberId) {
    $parsedId = [guid]::Empty
    if (-not [guid]::TryParse($memberId, [ref]$parsedId)) {
        throw "AdditionalMemberId must be a UUID: '$memberId'."
    }
    $workspaceOptions += @("--additional-member-id", $parsedId.ToString())
}
$manifest = Invoke-SeedPhase -Service "workspace" -Options $workspaceOptions -Manifest $manifest
$manifest = Invoke-SeedPhase -Service "project" -Manifest $manifest
$issueResult = Invoke-SeedPhase -Service "issue" -Manifest $manifest
Write-Host "Seed complete: $($issueResult | ConvertTo-Json -Compress)"
