import React, { useState, useEffect, useRef } from 'react';

function TranslationDisplay() {
  const [recognizedWords, setRecognizedWords] = useState([]);
  const [currentGesture, setCurrentGesture] = useState('');
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [history, setHistory] = useState([]);
  
  // Dùng useRef để tránh bị lỗi render liên tục khi đọc giọng nói
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    const handlePredict = async (e) => {
      const frames = e.detail;
      try {
        const response = await fetch('http://localhost:8000/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frames })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.error) return;

          const { gesture, confidence } = data;
          const confPercent = (confidence * 100).toFixed(2);

          setCurrentGesture(gesture);
          setCurrentConfidence(confPercent);

          if (gesture !== 'TRẠNG THÁI NGHỈ' && gesture !== 'Không rõ' && confidence > 0.75) {
            
            const timeString = new Date().toLocaleTimeString('vi-VN', { hour12: false });
            setHistory(prev => [{ gesture, confPercent, time: timeString }, ...prev].slice(0, 10)); 
            
            setRecognizedWords(prev => {
              // Lọc từ lặp. Nếu là từ mới hoàn toàn thì thêm vào và TỰ ĐỘNG ĐỌC
              if (prev.length === 0 || prev[prev.length - 1] !== gesture) {
                
                // --- TÍNH NĂNG TỰ ĐỘNG PHÁT ÂM NGAY LẬP TỨC ---
                if (!isSpeakingRef.current) {
                    const utterance = new SpeechSynthesisUtterance(gesture);
                    utterance.lang = 'vi-VN';
                    utterance.onstart = () => { isSpeakingRef.current = true; };
                    utterance.onend = () => { isSpeakingRef.current = false; };
                    window.speechSynthesis.speak(utterance);
                }
                
                return [...prev, gesture];
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error("Lỗi kết nối AI Python:", error);
      }
    };

    window.addEventListener('frames-predict-ready', handlePredict);
    return () => window.removeEventListener('frames-predict-ready', handlePredict);
  }, []);

  // Nút đọc thủ công (đọc toàn bộ câu dài)
  const handleSpeakFullSentence = () => {
    if (recognizedWords.length === 0) return;
    const textToSpeak = recognizedWords.join(' ');
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'vi-VN';
    window.speechSynthesis.speak(utterance);
  };

  const handleClear = () => {
    setRecognizedWords([]);
    setCurrentGesture('');
    setCurrentConfidence(0);
    setHistory([]);
    window.speechSynthesis.cancel(); // Ngắt giọng đọc nếu đang nói dở
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #3498db', borderRadius: '12px', backgroundColor: '#f0f8ff' }}>
      <h3 style={{ textAlign: 'center', color: '#2980b9', marginTop: 0 }}>🧠 Dịch Nghĩa & Phát Âm</h3>
      
      <div style={{ textAlign: 'center', margin: '15px 0' }}>
        <span style={{ fontWeight: 'bold' }}>Từ khóa nhận diện: </span>
        <span style={{ color: '#d35400', fontWeight: 'bold', fontSize: '18px' }}>
          [{recognizedWords.join(' - ')}]
        </span>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
        <button onClick={handleSpeakFullSentence} style={{ padding: '10px 15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          🔊 Đọc Lại Cả Câu
        </button>
        <button onClick={handleClear} style={{ padding: '10px 15px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          🗑️ Xóa làm lại
        </button>
      </div>

      <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', borderLeft: '5px solid #2ecc71', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '20px' }}>
         {recognizedWords.length > 0 ? recognizedWords.join(' ') : 'Kết quả dịch sẽ tự động đọc thành tiếng...'}
      </div>

      <div style={{ borderTop: '1px solid #bdc3c7', paddingTop: '15px' }}>
        <h4 style={{ textAlign: 'center', margin: '0 0 10px 0', color: '#34495e' }}>🔍 Trạng Thái Hiện Tại</h4>
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
           <p style={{ margin: '5px 0' }}>Cử chỉ: <b>{currentGesture || 'Đang chờ...'}</b></p>
           <p style={{ margin: '5px 0' }}>Độ chính xác: <b style={{ color: currentConfidence > 75 ? '#27ae60' : '#e74c3c' }}>{currentConfidence}%</b></p>
        </div>

        <h4 style={{ textAlign: 'center', margin: '0 0 10px 0', color: '#34495e' }}>📈 Lịch sử nhận diện</h4>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '10px', maxHeight: '150px', overflowY: 'auto' }}>
          {history.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#7f8c8d', margin: 0 }}>Chưa có dữ liệu</p>
          ) : (
            history.map((item, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #ecf0f1' }}>
                <span><b>{item.gesture}</b> <span style={{ color: '#27ae60' }}>({item.confPercent}%)</span></span>
                <span style={{ color: '#7f8c8d', fontSize: '12px' }}>{item.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TranslationDisplay;