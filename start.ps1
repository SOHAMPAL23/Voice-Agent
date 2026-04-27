# Start script for the Voice-Based AI Agent Web App

Write-Host "Starting Backend FastAPI server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd backend; if (-not (Test-Path venv)) { python -m venv venv }; .\venv\Scripts\activate; pip install -r requirements.txt; uvicorn main:app --reload`""

Write-Host "Starting Frontend Vite server..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit -Command `"cd frontend; npm run dev`""

Write-Host "Both servers are starting! A new browser window should open shortly." -ForegroundColor Green
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
