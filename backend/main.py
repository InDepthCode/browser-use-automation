import os
import asyncio
import json
from typing import List, Dict, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from browser_use import Agent, Browser, BrowserConfig, Controller
from langchain_openai import ChatOpenAI

# Load environment variables
load_dotenv()

app = FastAPI(title="Conversational Browser Agent", version="1.0.0")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for structured output
class Product(BaseModel):
    name: str
    price: str
    rating: Optional[str] = None
    url: str

class SearchResults(BaseModel):
    products: List[Product]
    total_found: int

class TaskRequest(BaseModel):
    task: str

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                # Remove disconnected connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

# Initialize LLM
llm = ChatOpenAI(model="gpt-4o", api_key=os.getenv("OPENAI_API_KEY"))

@app.get("/")
async def root():
    return {"message": "Conversational Browser Agent API", "status": "running"}

@app.post("/scrape")
async def run_scraping_task(request: TaskRequest):
    """Run a browser automation task"""
    try:
        # Create browser instance
        browser = Browser()
        
        # Create controller for structured output
        controller = Controller(output_model=SearchResults)
        
        # Create agent
        agent = Agent(
            task=request.task,
            llm=llm,
            browser=browser,
            controller=controller
        )
        
        # Run the task
        result = await agent.run()
        await browser.close()
        
        # Process result
        final_result = result.final_result() if hasattr(result, 'final_result') else str(result)
        
        return {"result": final_result, "status": "completed"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Task failed: {str(e)}")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Receive task from client
            data = await websocket.receive_text()
            task_data = json.loads(data)
            
            await manager.send_personal_message({
                "type": "status",
                "message": "Starting browser automation...",
                "timestamp": asyncio.get_event_loop().time()
            }, websocket)
            
            # Process the task with live updates
            await process_task_with_streaming(task_data["task"], websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def process_task_with_streaming(task: str, websocket: WebSocket):
    """Process a task with real-time streaming updates"""
    try:
        # Send initial status
        await manager.send_personal_message({
            "type": "status",
            "message": "Analyzing task...",
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
        
        # Create browser and agent
        browser = Browser()
        controller = Controller(output_model=SearchResults)
        
        agent = Agent(
            task=task,
            llm=llm,
            browser=browser,
            controller=controller
        )
        
        # Send navigation status
        await manager.send_personal_message({
            "type": "action",
            "action": "navigate",
            "message": "Opening browser and navigating to target site...",
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
        
        # Run the agent
        result = await agent.run()
        await browser.close()
        
        # Send completion status
        await manager.send_personal_message({
            "type": "action",
            "action": "extract",
            "message": "Extracting and processing results...",
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
        
        # Process and send final result
        final_result = result.final_result() if hasattr(result, 'final_result') else str(result)
        
        await manager.send_personal_message({
            "type": "result",
            "data": final_result,
            "message": "Task completed successfully!",
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
        
    except Exception as e:
        await manager.send_personal_message({
            "type": "error",
            "message": f"Task failed: {str(e)}",
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
