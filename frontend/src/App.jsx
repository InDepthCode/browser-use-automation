import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket connection
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8001/ws');
    
    websocket.onopen = () => {
      setIsConnected(true);
      setWs(websocket);
      addMessage('system', 'Connected to browser agent!');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    websocket.onclose = () => {
      setIsConnected(false);
      setWs(null);
      addMessage('system', 'Disconnected from browser agent');
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addMessage('error', 'Connection error occurred');
    };

    return () => {
      websocket.close();
    };
  }, []);

  const addMessage = (role, content, type = 'message') => {
    const newMessage = {
      id: Date.now(),
      role,
      content,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'status':
        addMessage('agent', data.message, 'status');
        break;
      case 'action':
        addMessage('agent', `${data.action}: ${data.message}`, 'action');
        break;
      case 'result':
        addMessage('agent', `Result: ${JSON.stringify(data.data, null, 2)}`, 'result');
        break;
      case 'error':
        addMessage('error', data.message, 'error');
        break;
      default:
        addMessage('agent', data.message || 'Unknown message', 'message');
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !ws || !isConnected) return;

    // Add user message
    addMessage('user', input);
    
    // Send to WebSocket
    ws.send(JSON.stringify({ task: input }));
    
    // Clear input
    setInput('');
  };

  const exampleTasks = [
    "Find MacBook Air 13-inch under ₹1,00,000 on Flipkart and give me top 3 with ratings",
    "Search for 'Python programming books' on Amazon and extract the first 5 results",
    "Go to GitHub trending repositories and get the top 3 trending Python projects",
    "Find the latest iPhone models on Apple website with their prices"
  ];

  const handleExampleClick = (task) => {
    setInput(task);
  };

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <h1>Browser Agent</h1>
          <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '●' : '○'}
          </div>
        </div>

        <div className="chat-window">
          {messages.length === 0 && (
            <div className="welcome">
              <p>Try these examples:</p>
              {exampleTasks.slice(0, 2).map((task, index) => (
                <button
                  key={index}
                  className="example"
                  onClick={() => handleExampleClick(task)}
                >
                  {task}
                </button>
              ))}
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="content">
                {message.type === 'result' ? (
                  <pre>{message.content}</pre>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a task..."
            disabled={!isConnected}
          />
          <button 
            type="submit" 
            disabled={!isConnected || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
