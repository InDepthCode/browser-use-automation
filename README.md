# Conversational Browser Agent

A fully functional MVP that combines AI-powered browser automation with a conversational chat interface. Built with Browser Use, FastAPI, and React.

## Features

- 🤖 **AI-Powered Browser Control**: Uses OpenAI GPT-4o to understand natural language commands
- 🌐 **Real Browser Automation**: Leverages Playwright for reliable web interactions
- 💬 **Live Chat Interface**: Real-time WebSocket streaming of browser actions
- 📊 **Structured Data Extraction**: Returns clean JSON results using Pydantic models
- 🎯 **Example Tasks**: Pre-built examples for common use cases

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- OpenAI API Key

### Backend Setup

1. **Install Python dependencies:**
```bash
cd backend
pip install -r ../requirements.txt
python -m playwright install
```

2. **Set up environment variables:**
```bash
cp ../env.example .env
# Edit .env and add your OpenAI API key
```

3. **Run the backend:**
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Start the development server:**
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

1. Open `http://localhost:3000` in your browser
2. Wait for the "Connected" status
3. Try example tasks or enter your own commands like:
   - "Find MacBook Air 13-inch under ₹1,00,000 on Flipkart and give me top 3 with ratings"
   - "Search for 'Python programming books' on Amazon and extract the first 5 results"
   - "Go to GitHub trending repositories and get the top 3 trending Python projects"

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Chat    │◄──►│   FastAPI       │◄──►│   Browser Use   │
│   Frontend      │    │   Backend       │    │   Agent         │
│                 │    │                 │    │                 │
│ • Chat UI       │    │ • WebSocket     │    │ • LLM Control   │
│ • Action Cards  │    │ • NLU/Planning  │    │ • Playwright    │
│ • Live Updates  │    │ • Task Queue    │    │ • Extraction    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints

- `GET /` - Health check
- `POST /scrape` - Run a browser automation task
- `WebSocket /ws` - Real-time communication for live updates

## Example Tasks

The application comes with pre-built example tasks:

1. **Product Search**: Find specific products with price filters
2. **Book Search**: Search for books on Amazon
3. **GitHub Trending**: Get trending repositories
4. **Apple Products**: Find latest iPhone models

## Technical Stack

- **Backend**: FastAPI, Browser Use, Playwright, LangChain
- **Frontend**: React, Vite, WebSocket API
- **AI**: OpenAI GPT-4o
- **Data**: Pydantic models for structured output

## Error Handling

The application includes robust error handling:
- WebSocket connection management
- Browser automation retries
- Graceful error messages in chat
- Connection status indicators

## Development

### Backend Development
```bash
cd backend
python main.py
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Testing
Open both applications and try the example tasks to verify functionality.

## License

MIT License - feel free to use and modify as needed.
