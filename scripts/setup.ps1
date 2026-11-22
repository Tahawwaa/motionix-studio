$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
npm ci --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { throw 'Node dependency installation failed' }
npm run setup
if ($LASTEXITCODE -ne 0) { throw 'Backend setup failed' }
