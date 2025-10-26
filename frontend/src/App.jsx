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
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    websocket.onclose = () => {
      setIsConnected(false);
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
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
        // Parse and format the result nicely
        try {
          const resultData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
          if (resultData.products && Array.isArray(resultData.products)) {
            // Format product results nicely
            const formattedResult = resultData.products.slice(0, 5).map(product => 
              `📱 ${product.name}\n💰 ${product.price}\n⭐ ${product.rating || 'N/A'}\n🔗 ${product.url || 'N/A'}`
            ).join('\n\n');
            addMessage('agent', `Found ${resultData.total_found || resultData.products.length} products:\n\n${formattedResult}`, 'result');
          } else {
            addMessage('agent', `Result: ${JSON.stringify(resultData, null, 2)}`, 'result');
          }
        } catch (e) {
          addMessage('agent', `Result: ${data.data}`, 'result');
        }
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


  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-content">
            <div className="agent-info">
              <div className="agent-avatar">🤖</div>
              <div className="agent-details">
                <h1>Browser Agent</h1>
                <span className="agent-subtitle">AI-powered web automation</span>
              </div>
            </div>
            <div className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="indicator-dot"></div>
              <span>{isConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        <div className="chat-window">
          <div className="messages-container">
            {messages.map((message) => (
              <div key={message.id} className={`message-wrapper ${message.role}`}>
                {message.role === 'user' && (
                  <div className="message-avatar user-avatar">👤</div>
                )}
                <div className={`message-bubble ${message.type || 'default'}`}>
                  <div className="message-content">
                    {message.content}
                  </div>
                  <div className="message-time">{message.timestamp}</div>
                </div>
                {message.role === 'agent' && (
                  <div className="message-avatar agent-avatar">🤖</div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="input-container">
          <form onSubmit={sendMessage} className="input-form">
            <div className="input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe what you want the browser to do..."
                disabled={!isConnected}
                className="message-input"
              />
              <button 
                type="submit" 
                disabled={!isConnected || !input.trim()}
                className="send-button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22,2 15,22 11,13 2,9"></polygon>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
