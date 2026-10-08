#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

$semverTagRegex = 'v[0-9]+\.[0-9]+\.[0-9]+$'
$semverTagGlob = 'v[0-9].[0-9].[0-9]*'
$gitRemote = 'origin'
$majorSemverTagRegex = '^(v[0-9]+)'

function ExecSafe([scriptblock] $ScriptBlock, [switch] $AllowFailure) {
    & $ScriptBlock
    if ($LASTEXITCODE -ne 0 -and -not $AllowFailure) {
        exit $LASTEXITCODE
    }
}

# 1. Retrieve the latest release tag
$latestTag = ExecSafe { git describe --abbrev=0 --match="$semverTagGlob" 2>$null } -AllowFailure
if ($LASTEXITCODE -ne 0) {
    Write-Host 'No tags found (yet) - Continue to create and push your first tag'
    $latestTag = '[unknown]'
}

# 2. Display the latest release tag
Write-Host "The latest release tag is: $latestTag"

# 3. Prompt the user for a new release tag
$newTag = Read-Host 'Enter a new release tag (vX.X.X format)'

# 4. Validate the new release tag
if ($newTag -cmatch $semverTagRegex) {
    Write-Host "Tag: $newTag is valid syntax"
}
else {
    Write-Host "Tag: $newTag is not valid (must be in vX.X.X format)"
    exit 1
}

# 5. Remind user to update the version field in package.json
$confirmation = Read-Host "Make sure the version field in package.json is $newTag. Yes? [Y/n] "
if ($confirmation -cne 'y' -and $confirmation -cne 'Y') {
    Write-Host "Please update the package.json version to $newTag and commit your changes"
    exit 1
}

# 6. Tag a new release
ExecSafe { git tag $newTag --annotate --message "$newTag Release" }
Write-Host "Tagged: $newTag"

# 7. Set 'is_major_release' variable
$latestMajorReleaseTag = [regex]::Match([string]$latestTag, $majorSemverTagRegex).Groups[1].Value
$newMajorReleaseTag = [regex]::Match($newTag, $majorSemverTagRegex).Groups[1].Value
$isMajorRelease = $newMajorReleaseTag -cne $latestMajorReleaseTag

# 8. Point separate major release tag (e.g. v1, v2) to the new release
if ($isMajorRelease) {
    ExecSafe { git tag $newMajorReleaseTag --annotate --message "$newMajorReleaseTag Release" }
    Write-Host "New major version tag: $newMajorReleaseTag"
}
else {
    ExecSafe { git tag $latestMajorReleaseTag --force --annotate --message "Sync $latestMajorReleaseTag tag with $newTag" }
    Write-Host "Synced $latestMajorReleaseTag with $newTag"
}

# 9. Push the new tags (with commits, if any) to remote
ExecSafe { git push --follow-tags }

if ($isMajorRelease) {
    Write-Host "Tags: $newMajorReleaseTag and $newTag pushed to remote"
}
else {
    ExecSafe { git push $gitRemote $latestMajorReleaseTag --force }
    Write-Host "Tags: $latestMajorReleaseTag and $newTag pushed to remote"
}

# 10. If this is a major release, create a 'releases/v#' branch and push
if ($isMajorRelease) {
    ExecSafe { git branch "releases/$newMajorReleaseTag" $newMajorReleaseTag }
    Write-Host "Branch: releases/$newMajorReleaseTag created from $newMajorReleaseTag tag"
    ExecSafe { git push --set-upstream $gitRemote "releases/$newMajorReleaseTag" }
    Write-Host "Branch: releases/$newMajorReleaseTag pushed to remote"
}

# Completed
Write-Host 'Done!'