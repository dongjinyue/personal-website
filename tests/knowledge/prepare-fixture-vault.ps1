$temporaryBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$fixtureRoot = [System.IO.Path]::GetFullPath((Join-Path $temporaryBase "my-space-knowledge-fixture"))

if ([System.IO.Path]::GetDirectoryName($fixtureRoot) -ne $temporaryBase.TrimEnd("\\")) {
  throw "夹具路径不在系统临时目录中"
}

if (Test-Path -LiteralPath $fixtureRoot) {
  Remove-Item -LiteralPath $fixtureRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
Copy-Item -LiteralPath "tests/fixtures/knowledge-vault/notes" -Destination $fixtureRoot -Recurse
git -C $fixtureRoot init --initial-branch=main
git -C $fixtureRoot config user.name "Knowledge Fixture"
git -C $fixtureRoot config user.email "knowledge-fixture@example.invalid"
git -C $fixtureRoot add notes
git -C $fixtureRoot commit -m "fixture"
Write-Output $fixtureRoot
