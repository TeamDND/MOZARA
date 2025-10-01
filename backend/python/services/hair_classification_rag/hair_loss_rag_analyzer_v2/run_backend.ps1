param(
  [int]$Port = 8000
)
$ErrorActionPreference = 'Stop'
Push-Location "$PSScriptRoot\backend"
if (!(Test-Path .venv)) {
  python -m venv .venv
}
. .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:PYTHONPATH = (Get-Location).Path
uvicorn main:app --host 0.0.0.0 --port $Port --reload
Pop-Location
