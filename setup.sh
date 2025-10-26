#!/bin/bash

echo "🚀 Starting Conversational Browser Agent..."

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example backend/.env
    echo "📝 Please edit backend/.env and add your OpenAI API key"
    echo "   Then run this script again."
    exit 1
fi

echo "📦 Installing Python dependencies..."
cd backend
pip install -r ../requirements.txt
python -m playwright install

echo "📦 Installing Node.js dependencies..."
cd ../frontend
npm install

echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "1. Edit backend/.env and add your OpenAI API key"
echo "2. Run: python backend/main.py (in one terminal)"
echo "3. Run: npm run dev (in frontend directory, in another terminal)"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "Happy browsing! 🤖"
