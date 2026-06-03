/**
 * REACT COMPONENT: TranslationDisplay.jsx
 * PURPOSE: Display LSTM predictions, buffer keywords, and translate via Gemini AI
 */

import React, { useState, useEffect } from 'react';
import { socketService } from '../src/services/socketService';
import './TranslationDisplay.css';

function TranslationDisplay() {
  // ============= STATE =============
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [wordBuffer, setWordBuffer] = useState([]);
  const [geminiSentence, setGeminiSentence] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  // ============= SOCKET LISTENERS =============
  useEffect(() => {
    socketService.on('predict:result', (data) => {
      setPrediction(data);
      setIsLoading(false);

      setHistory(prev => [
        {
          gesture: data.gesture,
          confidence: data.confidence,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ].slice(0, 10));

      setWordBuffer(prev => {
        if (prev.length === 0 || prev[prev.length - 1] !== data.gesture) {
          if (data.gesture !== "Không rõ" && data.gesture !== "TRẠNG THÁI NGHỈ") {
             return [...prev, data.gesture];
          }
        }
        return prev;
      });
    });

    socketService.on('predict:error', (error) => {
      console.error('Prediction error:', error);
      setIsLoading(false);
    });

    return () => {
      socketService.off('predict:result');
      socketService.off('predict:error');
    };
  }, []);

  // ============= GEMINI TRANSLATION & TTS =============
  const handleTranslateWithGemini = async () => {
    if (wordBuffer.length === 0) return;
    
    setIsTranslating(true);
    setGeminiSentence("⏳ Đang xử lý ngôn ngữ...");

    try {
      const response = await fetch('http://localhost:5000/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordBuffer })
      });
      
      const data = await response.json();

      if (data.success) {
        setGeminiSentence(data.sentence);
        
        if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(data.sentence);
          utterance.lang = 'vi-VN';
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      } else {
        setGeminiSentence("❌ Lỗi: Không thể dịch câu này.");
      }
    } catch (error) {
      console.error("Gemini connection error:", error);
      setGeminiSentence("❌ Lỗi mất kết nối máy chủ.");
    }
    
    setIsTranslating(false);
  };

  const handleClearBuffer = () => {
    setWordBuffer([]);
    setGeminiSentence("");
  };

  // ============= RENDER =============
  return (
    <div className="translation-display-container">
      
      <div className="gemini-section" style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px', marginBottom: '20px', border: '2px solid #0056b3' }}>
        <h2 style={{ marginTop: 0, color: '#0056b3' }}>🧠 Dịch Nghĩa & Phát Âm</h2>
        
        <div style={{ marginBottom: '15px', fontSize: '18px' }}>
          <strong>Từ khóa nhận diện: </strong> 
          {wordBuffer.length > 0 ? (
            <span style={{ color: '#d35400', fontWeight: 'bold' }}>[ {wordBuffer.join(" + ")} ]</span>
          ) : (
            <span style={{ color: '#7f8c8d', fontStyle: 'italic' }}>Đang chờ cử chỉ...</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button 
            onClick={handleTranslateWithGemini} 
            disabled={wordBuffer.length === 0 || isTranslating}
            style={{ padding: '12px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}
          >
            {isTranslating ? "⏳ AI Đang Xử Lý..." : "🔊 Dịch Thành Câu & Đọc To"}
          </button>
          
          <button 
            onClick={handleClearBuffer}
            disabled={wordBuffer.length === 0}
            style={{ padding: '12px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            🗑️ Xóa làm lại
          </button>
        </div>

        <div style={{ padding: '15px', backgroundColor: '#fff', borderLeft: '6px solid #28a745', fontSize: '22px', minHeight: '60px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <strong>{geminiSentence || "Kết quả dịch sẽ hiển thị ở đây..."}</strong>
        </div>
      </div>

      <div className="prediction-section">
        <h2>🔍 Trạng Thái Hiện Tại</h2>
        
        {isLoading ? (
          <div className="loading">
            <div className="mini-spinner"></div>
            <p>Đang xử lý...</p>
          </div>
        ) : prediction ? (
          <div className="prediction-card">
            <div className="gesture-text" style={{ color: prediction.gesture === 'TRẠNG THÁI NGHỈ' ? '#7f8c8d' : '#000' }}>
              {prediction.gesture}
            </div>
            <div className="confidence-bar">
              <div 
                className="confidence-fill" 
                style={{ width: `${prediction.confidence * 100}%`, backgroundColor: prediction.gesture === 'TRẠNG THÁI NGHỈ' ? '#bdc3c7' : '#007bff' }}
              ></div>
            </div>
            <div className="confidence-text">
              Độ chính xác: {(prediction.confidence * 100).toFixed(2)}%
            </div>
          </div>
        ) : (
          <div className="placeholder">
            <i className="fas fa-hand-paper"></i>
            <p>Đang chờ cử chỉ...</p>
          </div>
        )}
      </div>

      <div className="history-section">
        <h2>📈 Lịch sử nhận diện</h2>
        <div className="history-list">
          {history.length > 0 ? (
            history.map((item, idx) => (
              <div key={idx} className="history-item">
                <div className="history-gesture">{item.gesture}</div>
                <div className="history-meta">
                  <span className="confidence">{(item.confidence * 100).toFixed(0)}%</span>
                  <span className="time">{item.timestamp}</span>
                </div>
              </div>
            ))
          ) : (
             <p className="empty-history">Chưa có dữ liệu</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TranslationDisplay;