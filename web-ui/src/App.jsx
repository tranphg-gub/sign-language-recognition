import React, { useState } from 'react';
import VideoCapture from './components/VideoCapture';
import TranslationDisplay from './components/TranslationDisplay';
import GestureCollector from './components/GestureCollector';

function App() {
  const [mode, setMode] = useState('predict');
  const [isTraining, setIsTraining] = useState(false);

  // Hàm gọi API Train xuống Python
  const handleTrainModel = async () => {
    if (!window.confirm("Bạn đã thu thập đủ data chưa? Quá trình huấn luyện có thể mất vài phút!")) return;
    
    setIsTraining(true);
    try {
      // Gọi thẳng xuống API của FastAPI (đang chạy ở cổng 8000)
      const response = await fetch('http://localhost:8000/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.error) {
        alert("Lỗi: " + data.error);
      } else {
        alert("Thành công: " + data.message);
      }
    } catch (error) {
      alert("Lỗi kết nối đến Server AI (Python). Hãy chắc chắn bạn đã chạy lệnh 'uvicorn main:app --port 8000'");
      console.error(error);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50' }}>VietSign AI - Hệ Thống Trí Tuệ Nhân Tạo</h1>
      
      <div style={{ textAlign: 'center', marginBottom: '30px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
        <button 
          onClick={() => setMode('predict')}
          style={{ padding: '12px 25px', backgroundColor: mode === 'predict' ? '#3498db' : '#95a5a6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
        >
          👁️ Phân Tích & Dịch (Predict)
        </button>
        
        <button 
          onClick={() => setMode('collect')}
          style={{ padding: '12px 25px', backgroundColor: mode === 'collect' ? '#e67e22' : '#95a5a6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
        >
          📦 Thu Thập Data (Collect)
        </button>

        {/* NÚT TRAIN MÔ HÌNH MỚI THÊM VÀO */}
        <button 
          onClick={handleTrainModel}
          disabled={isTraining}
          style={{ padding: '12px 25px', backgroundColor: isTraining ? '#7f8c8d' : '#2ecc71', color: 'white', border: 'none', borderRadius: '8px', cursor: isTraining ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold' }}
        >
          {isTraining ? '⏳ Đang Huấn Luyện...' : '🧠 Huấn Luyện AI (Train)'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
        <div style={{ width: '640px' }}>
          <VideoCapture mode={mode} />
        </div>
        <div style={{ width: '500px' }}>
          {mode === 'predict' ? <TranslationDisplay /> : <GestureCollector />}
        </div>
      </div>
    </div>
  );
}

export default App;