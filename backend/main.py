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
    image: Optional[str] = None

class SearchResults(BaseModel):
    products: List[Product]
    total_found: int

class FormField(BaseModel):
    field_name: str
    field_type: str  # text, email, password, select, checkbox, etc.
    field_value: str
    field_selector: Optional[str] = None

class FormResult(BaseModel):
    form_url: str
    fields_filled: List[FormField]
    submission_status: str  # success, failed, partial
    message: str

class TaskRequest(BaseModel):
    task: str
    task_type: Optional[str] = "search"  # search, form_fill, general

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
        
        # Determine output model based on task type
        if request.task_type == "form_fill":
            controller = Controller(output_model=FormResult)
        else:
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
        
        return {"result": final_result, "status": "completed", "task_type": request.task_type}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Task failed: {str(e)}")

@app.post("/fill-form")
async def fill_form_task(request: TaskRequest):
    """Specifically handle form filling tasks"""
    try:
        # Create browser instance
        browser = Browser()
        
        # Create controller for form results
        controller = Controller(output_model=FormResult)
        
        # Create agent with form-specific instructions
        form_task = f"""
        Fill out the form on the specified website with appropriate data.
        Task: {request.task}
        
        Instructions:
        1. Navigate to the form page
        2. Identify all form fields
        3. Fill each field with appropriate sample data
        4. Submit the form if requested
        5. Return details of what was filled
        
        Generate realistic sample data for each field type:
        - Names: Use common names
        - Emails: Use format like test@example.com
        - Phone: Use format like +91-9876543210
        - Address: Use sample addresses
        - Passwords: Use format like TestPass123!
        """
        
        agent = Agent(
            task=form_task,
            llm=llm,
            browser=browser,
            controller=controller
        )
        
        # Run the task
        result = await agent.run()
        await browser.close()
        
        # Process result
        final_result = result.final_result() if hasattr(result, 'final_result') else str(result)
        
        return {"result": final_result, "status": "completed", "task_type": "form_fill"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Form filling failed: {str(e)}")

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
            task_type = task_data.get("task_type", "search")
            await process_task_with_streaming(task_data["task"], websocket, task_type)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def process_task_with_streaming(task: str, websocket: WebSocket, task_type: str = "search"):
    """Process a task with real-time streaming updates"""
    try:
        # Send initial status
        await manager.send_personal_message({
            "type": "status",
            "message": f"Analyzing {task_type} task...",
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
        
        # Create browser instance
        browser = Browser()
        
        # Determine output model and instructions based on task type
        if task_type == "form_fill":
            controller = Controller(output_model=FormResult)
            enhanced_task = f"""
            Fill out the form on the specified website with appropriate data.
            Task: {task}
            
            Instructions:
            1. Navigate to the form page
            2. Identify all form fields
            3. Fill each field with appropriate sample data
            4. Submit the form if requested
            5. Return details of what was filled
            
            Generate realistic sample data for each field type:
            - Names: Use common names like John Smith, Sarah Johnson
            - Emails: Use format like test@example.com
            - Phone: Use format like +91-9876543210
            - Address: Use sample addresses
            - Passwords: Use format like TestPass123!
            - Dates: Use current or future dates
            """
        else:
            controller = Controller(output_model=SearchResults)
            enhanced_task = f"""
            {task}
            
            IMPORTANT INSTRUCTIONS:
            1. For each product, extract the PRODUCT PAGE URL (click link/href) - not the image URL
            2. Extract the product image URL (img src) separately for the image field
            3. The 'url' field should be the link to view the full product on the website
            4. The 'image' field should be the product image thumbnail URL
            """
        
        # Create agent
        agent = Agent(
            task=enhanced_task,
            llm=llm,
            browser=browser,
            controller=controller
        )
        
        # Send status update based on task type
        if task_type == "form_fill":
            action_message = "Opening browser and navigating to form page..."
            action_type = "navigate"
        else:
            action_message = "Opening browser and navigating to target site..."
            action_type = "navigate"
            
        await manager.send_personal_message({
            "type": "action",
            "action": action_type,
            "message": action_message,
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
        
        # Run the agent
        result = await agent.run()
        await browser.close()
        
        # Send completion status
        completion_message = "Extracting and processing results..." if task_type == "search" else "Processing form submission..."
        await manager.send_personal_message({
            "type": "action",
            "action": "extract" if task_type == "search" else "submit",
            "message": completion_message,
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
        
        # Process and send final result
        final_result = result.final_result() if hasattr(result, 'final_result') else str(result)
        
        # Send completion notification
        success_message = "✅ Task completed successfully!" if task_type == "search" else "✅ Form filled successfully!"
        await manager.send_personal_message({
            "type": "status",
            "message": success_message,
            "timestamp": asyncio.get_event_loop().time()
        }, websocket)
        
        await manager.send_personal_message({
            "type": "result",
            "data": final_result,
            "message": "Here are the results:",
            "task_type": task_type,
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
