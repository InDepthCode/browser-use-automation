@echo off
echo 🚀 Starting Conversational Browser Agent...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist "backend\.env" (
    echo ⚠️  .env file not found. Creating from template...
    copy env.example backend\.env
    echo 📝 Please edit backend\.env and add your OpenAI API key
    echo    Then run this script again.
    pause
    exit /b 1
)

echo 📦 Installing Python dependencies...
cd backend
pip install -r ..\requirements.txt
python -m playwright install

echo 📦 Installing Node.js dependencies...
cd ..\frontend
npm install

echo 🎉 Setup complete!
echo.
echo To start the application:
echo 1. Edit backend\.env and add your OpenAI API key
echo 2. Run: python backend\main.py (in one terminal)
echo 3. Run: npm run dev (in frontend directory, in another terminal)
echo 4. Open http://localhost:3000 in your browser
echo.
echo Happy browsing! 🤖
pause
