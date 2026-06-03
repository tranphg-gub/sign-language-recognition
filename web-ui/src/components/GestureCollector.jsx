import React, { useState, useEffect, useRef } from 'react';

function GestureCollector() {
  const [gestureName, setGestureName] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const countRef = useRef(0);
  
  // Đặt mục tiêu thu thập 100 mẫu cho mỗi từ
  const targetCount = 100;

  useEffect(() => {
    countRef.current = savedCount;
  }, [savedCount]);

  useEffect(() => {
    const handleFramesReady = async (e) => {
      const frames = e.detail;

      if (!gestureName.trim()) {
         console.warn("Chưa nhập tên từ vựng, không thể lưu tự động.");
         return;
      }

      // Đã thu đủ 100 thì tự động ngưng lưu
      if (countRef.current >= targetCount) return;

      const currentIndex = countRef.current;

      try {
        // Tự động ném Data xuống Backend mà KHÔNG CẦN BẤM NÚT
        const response = await fetch('http://localhost:8000/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gesture_name: gestureName.trim().toUpperCase(),
            sequence_index: currentIndex,
            frames: frames
          })
        });

        if (response.ok) {
           setSavedCount(prev => prev + 1);
        }
      } catch (err) {
        console.error('Lỗi khi lưu tự động:', err);
      }
    };

    window.addEventListener('frames-ready', handleFramesReady);
    return () => window.removeEventListener('frames-ready', handleFramesReady);
  }, [gestureName]); 

  const handleReset = () => {
     if (window.confirm("Làm mới bộ đếm trên màn hình về 0? (Yên tâm, các file đã lưu trong máy tính sẽ không bị xóa)")) {
         setSavedCount(0);
     }
  };

  // Render lịch sử thành các ô vuông xếp gọn gàng thay vì hàng dọc
  const renderHistoryBlocks = () => {
     const blocks = [];
     for(let i = 0; i < savedCount; i++) {
        blocks.push(
           <div key={i} style={{ width: '32px', height: '32px', backgroundColor: '#2ecc71', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
              {i + 1}
           </div>
        );
     }
     return blocks;
  };

  return (
     <div style={{ padding: '25px', border: '1px solid #bdc3c7', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h3 style={{ textAlign: 'center', color: '#2c3e50', marginTop: 0, marginBottom: '20px' }}>📦 Thu Thập Dữ Liệu Tự Động</h3>

        <div style={{ marginBottom: '25px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#34495e' }}>1. Nhập tên từ vựng (Tiếng Việt):</label>
            <input
               type="text"
               value={gestureName}
               onChange={(e) => setGestureName(e.target.value)}
               placeholder="VD: XIN CHÀO"
               style={{ padding: '12px', width: '92%', borderRadius: '8px', border: '2px solid #3498db', fontSize: '16px', textTransform: 'uppercase', outline: 'none' }}
            />
        </div>

        <div style={{ marginBottom: '25px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ecf0f1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', color: '#34495e' }}>2. Tiến độ thu thập:</span>
                <span style={{ fontWeight: 'bold', color: savedCount >= targetCount ? '#27ae60' : '#e67e22', fontSize: '16px' }}>{savedCount} / {targetCount}</span>
            </div>

            <div style={{ width: '100%', backgroundColor: '#ecf0f1', borderRadius: '10px', overflow: 'hidden', height: '22px' }}>
                <div style={{ width: `${Math.min((savedCount / targetCount) * 100, 100)}%`, backgroundColor: savedCount >= targetCount ? '#27ae60' : '#e67e22', height: '100%', transition: 'width 0.1s ease-in-out' }}></div>
            </div>

            {savedCount >= targetCount && (
                <p style={{ color: '#27ae60', fontWeight: 'bold', textAlign: 'center', marginTop: '15px', marginBottom: 0 }}>
                    🎉 Đã thu đủ 100 mẫu! Bấm "Dừng Lại" dưới Camera.
                </p>
            )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ margin: 0, color: '#34495e' }}>Kho Dữ Liệu:</h4>
            <button onClick={handleReset} style={{ padding: '8px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                🔄 Đếm Lại Từ Đầu
            </button>
        </div>

        {/* Khung chứa các ô vuông lịch sử */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '220px', overflowY: 'auto', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fdfdfd' }}>
            {savedCount === 0 ? (
                <p style={{ color: '#7f8c8d', width: '100%', textAlign: 'center', margin: '30px 0', fontSize: '14px' }}>
                    Chưa có mẫu nào.<br/>Nhập tên từ và bấm <b>Bắt Đầu Quay</b>.
                </p>
            ) : (
                renderHistoryBlocks()
            )}
        </div>
     </div>
  );
}

export default GestureCollector;