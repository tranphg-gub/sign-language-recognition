import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';
import { Database, RotateCcw, CheckCircle2 } from 'lucide-react';

function GestureCollector() {
  const [gestureName, setGestureName] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const countRef = useRef(0);
  
  const targetCount = 100;

  useEffect(() => {
    countRef.current = savedCount;
  }, [savedCount]);

  useEffect(() => {
    const handleFramesReady = (e) => {
      const frames = e.detail;

      if (!gestureName.trim()) {
         return;
      }

      if (countRef.current >= targetCount) return;

      const currentIndex = countRef.current;
      socketService.sendFramesForCollection(frames, gestureName.trim().toUpperCase(), currentIndex);
    };

    const handleCollectSuccess = (data) => {
      if (data.gesture_name === gestureName.trim().toUpperCase()) {
        setSavedCount(prev => prev + 1);
      }
    };

    window.addEventListener('frames-ready', handleFramesReady);
    socketService.on('collect:success', handleCollectSuccess);
    
    return () => {
      window.removeEventListener('frames-ready', handleFramesReady);
      socketService.off('collect:success');
    };
  }, [gestureName]); 

  const handleReset = () => {
     if (window.confirm("Làm mới bộ đếm trên màn hình về 0? (Dữ liệu đã lưu sẽ không bị xóa)")) {
         setSavedCount(0);
     }
  };

  const renderHistoryBlocks = () => {
     const blocks = [];
     for(let i = 0; i < savedCount; i++) {
        blocks.push(
           <div key={i} className="w-8 h-8 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center rounded-lg text-xs font-bold animate-in zoom-in duration-150">
              {i + 1}
           </div>
        );
     }
     return blocks;
  };

  return (
     <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-6 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Thu Thập Dữ Liệu</h3>
            <p className="text-sm text-slate-400">Tự động hóa quá trình lấy mẫu AI</p>
          </div>
        </div>

        <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-300 mb-2">1. Nhập tên từ vựng cần thu thập:</label>
            <input
               type="text"
               value={gestureName}
               onChange={(e) => setGestureName(e.target.value)}
               placeholder="Ví dụ: XIN CHÀO"
               className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all uppercase placeholder:text-slate-600 placeholder:normal-case font-medium"
            />
        </div>

        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 mb-8">
            <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-slate-300">2. Tiến độ tự động lưu:</span>
                <span className={`font-bold font-mono text-lg ${savedCount >= targetCount ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {savedCount} / {targetCount}
                </span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 mb-4 overflow-hidden border border-slate-700">
                <div 
                  className={`h-full transition-all duration-300 ${savedCount >= targetCount ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min((savedCount / targetCount) * 100, 100)}%` }}
                />
            </div>

            {savedCount >= targetCount && (
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-medium bg-emerald-500/10 p-2 rounded-lg animate-in slide-in-from-bottom-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Đã thu đủ 100 mẫu! Bấm "Tạm Dừng" Camera.
                </div>
            )}
        </div>

        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Mẫu đã lưu phiên này</h4>
                <button 
                  onClick={handleReset} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                    Reset Counter
                </button>
            </div>

            <div className="flex-1 bg-slate-900/30 border border-slate-700/50 rounded-xl p-4 overflow-y-auto custom-scrollbar">
                <div className="flex flex-wrap gap-2 content-start h-full">
                  {savedCount === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-sm italic">
                          Nhập tên từ và bấm "Bắt Đầu Quay Mẫu" để lưu tự động
                      </div>
                  ) : (
                      renderHistoryBlocks()
                  )}
                </div>
            </div>
        </div>
     </div>
  );
}

export default GestureCollector;