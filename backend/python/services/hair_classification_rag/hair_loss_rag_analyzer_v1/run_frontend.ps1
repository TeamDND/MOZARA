$ErrorActionPreference = 'Stop'
Push-Location "$PSScriptRoot\frontend"
if (Test-Path package-lock.json) {
  npm ci
} else {
  npm install
}
$env:REACT_APP_API_URL = 'http://localhost:8000/api'
npm start
Pop-Location
