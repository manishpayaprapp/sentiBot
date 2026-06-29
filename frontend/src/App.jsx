import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { text: "System ready. Model trained on Sentiment140. Waiting for input...", sender: "bot" }
  ]);
  const [dashboardData, setDashboardData] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const currentText = inputText;
    setInputText('');
    setChatHistory(prev => [...prev, { text: currentText, sender: "user" }]);

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText })
      });
      
      const data = await response.json();
      setDashboardData(data);
      setSessionCount(prev => prev + 1);

      const { positive, negative, neutral } = data.aggregate;
      const maxScore = Math.max(positive, negative, neutral);
      let dominant = "Neutral";
      if (maxScore === positive) dominant = "Positive";
      if (maxScore === negative) dominant = "Negative";

      setChatHistory(prev => [...prev, { 
        text: `Analysis complete. Primary sentiment: **${dominant}**`, 
        sender: "bot" 
      }]);

    } catch (error) {
      setChatHistory(prev => [...prev, { 
        text: "Error: Could not connect to Python backend. Ensure it is running on port 5000.", 
        sender: "bot" 
      }]);
    }
  };

  const handleExample = (text) => {
    setInputText(text);
  };

  return (
    <div className="container">
      <div className="chat-section">
        <div className="header">
          <span>SentiBot Terminal</span>
          <span className="stats">Analyzed: {sessionCount}</span>
        </div>
        
        <div className="chat-history">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`message ${msg.sender === 'user' ? 'msg-user' : 'msg-bot'}`}>
              {msg.text.includes('**') ? (
                <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              ) : (
                msg.text
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="input-area">
          <div className="example-buttons">
            <button onClick={() => handleExample("The new update is absolutely brilliant! 🚀 love it")}>Joy / Positive</button>
            <button onClick={() => handleExample("This service is terrible. I hate how slow it is ugh 😡")}>Frustration / Negative</button>
            <button onClick={() => handleExample("Oh great, another bug. Just what I needed smh.")}>Sarcasm / Slang</button>
          </div>
          <div className="input-box">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Enter tweet or text to analyze..." 
            />
            <button className="send-btn" onClick={handleSend}>Analyze</button>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dash-card">
          <h3>Sentiment140 Model Scoring</h3>
          
          <div className="bar-container">
            <div className="bar-label"><span>Positive</span><span>{dashboardData?.aggregate.positive || 0}%</span></div>
            <div className="bar-bg">
              <div className="bar-fill pos-fill" style={{ width: `${dashboardData?.aggregate.positive || 0}%` }}></div>
            </div>
          </div>
          
          <div className="bar-container">
            <div className="bar-label"><span>Neutral</span><span>{dashboardData?.aggregate.neutral || 0}%</span></div>
            <div className="bar-bg">
              <div className="bar-fill neu-fill" style={{ width: `${dashboardData?.aggregate.neutral || 0}%` }}></div>
            </div>
          </div>
          
          <div className="bar-container">
            <div className="bar-label"><span>Negative</span><span>{dashboardData?.aggregate.negative || 0}%</span></div>
            <div className="bar-bg">
              <div className="bar-fill neg-fill" style={{ width: `${dashboardData?.aggregate.negative || 0}%` }}></div>
            </div>
          </div>
        </div>

        <div className="dash-card">
          <h3>Multi-Class Tags</h3>
          <div className="tags">
            {dashboardData ? (
              dashboardData.emotions.map((emotion, idx) => (
                <div key={idx} className="tag active">{emotion}</div>
              ))
            ) : (
              <span className="placeholder">Awaiting input...</span>
            )}
          </div>
        </div>

        <div className="dash-card flex-1">
          <h3>Lexicon Tokenization</h3>
          <div className="token-display">
            {dashboardData ? (
              dashboardData.tokens.map((t, idx) => (
                <span key={idx} className={`token ${t.type}`}>{t.word}</span>
              ))
            ) : (
              <span className="placeholder">Tokens will appear here...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
