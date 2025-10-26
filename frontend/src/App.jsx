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
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'status':
        // Check if it's a completion message
        const isCompletion = data.message && data.message.includes('✅');
        addMessage('agent', data.message, isCompletion ? 'completion' : 'status');
        break;
      case 'action':
        addMessage('agent', `${data.action}: ${data.message}`, 'action');
        break;
        case 'result':
        // Parse and format the result nicely
        try {
          const resultData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
          const taskType = data.task_type || 'search';
          
          if (taskType === 'form_fill' && resultData.fields_filled) {
            // Format form results nicely
            const formattedResult = resultData.fields_filled.map(field => 
              `📝 ${field.field_name} (${field.field_type}): ${field.field_value}`
            ).join('\n');
            addMessage('agent', `✅ Form filled successfully!\n\n📋 Fields filled:\n${formattedResult}\n\n🌐 URL: ${resultData.form_url}\n📊 Status: ${resultData.submission_status}`, 'form-result');
          } else if (resultData.products && Array.isArray(resultData.products)) {
            // Store full product data for rendering with images
            addMessage('agent', { 
              products: resultData.products.slice(0, 5), 
              total: resultData.total_found || resultData.products.length 
            }, 'products');
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

    // Detect task type based on keywords
    const taskText = input.toLowerCase();
    let taskType = 'search';
    
    if (taskText.includes('fill') || taskText.includes('form') || taskText.includes('submit') || 
        taskText.includes('register') || taskText.includes('signup') || taskText.includes('login')) {
      taskType = 'form_fill';
    }

    // Add user message
    addMessage('user', input);
    
    // Send task with type information
    const taskData = {
      task: input,
      task_type: taskType
    };
    
    ws.send(JSON.stringify(taskData));
    
    // Clear input
    setInput('');
  };

  // Helper function to format URLs
  const formatUrl = (url) => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return 'https://' + url;
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
                {message.role === 'agent' && (
                  <div className="message-avatar agent-avatar">🤖</div>
                )}
                <div className={`message-bubble ${message.type || 'default'}`}>
                  <div className="message-content">
                    {message.type === 'products' && typeof message.content === 'object' ? (
                      <div className="products-container">
                        <div className="products-header">Found {message.content.total} products:</div>
                        {message.content.products.map((product, idx) => (
                          <div key={idx} className="product-card">
                            {product.image && (
                              <img 
                                src={product.image.startsWith('http') ? product.image : `https://${product.image}`} 
                                alt={product.name} 
                                className="product-image" 
                                onError={(e) => { e.target.style.display = 'none'; }} 
                              />
                            )}
                            <div className="product-info">
                              <div className="product-name">{product.name}</div>
                              <div className="product-price">{product.price}</div>
                              {product.rating && <div className="product-rating">⭐ {product.rating}</div>}
                              {product.url && (
                                <a href={formatUrl(product.url)} target="_blank" rel="noopener noreferrer" className="product-link">
                                  View on Website →
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                  <div className="message-time">{message.timestamp}</div>
                </div>
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
                       placeholder="Try: 'Find laptops on Flipkart' or 'Fill contact form on example.com'"
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
