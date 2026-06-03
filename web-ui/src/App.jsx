import React, { useState, useEffect } from 'react';
import VideoCapture from './components/VideoCapture';
import TranslationDisplay from './components/TranslationDisplay';
import GestureCollector from './components/GestureCollector';
import { socketService } from './services/socketService';
import { Brain, PackagePlus, Eye } from 'lucide-react';

function App() {
  const [mode, setMode] = useState('predict');
  const [isTraining, setIsTraining] = useState(false);
  const [trainStatus, setTrainStatus] = useState('');

  useEffect(() => {
    socketService.on('train:started', (data) => {
      setIsTraining(true);
      setTrainStatus(data.message);
    });

    socketService.on('train:completed', (data) => {
      setIsTraining(false);
      setTrainStatus(data.message);
      setTimeout(() => setTrainStatus(''), 5000);
    });

    socketService.on('train:error', (data) => {
      setIsTraining(false);
      setTrainStatus(`Lỗi: ${data.message}`);
      setTimeout(() => setTrainStatus(''), 5000);
    });

    return () => {
      socketService.off('train:started');
      socketService.off('train:completed');
      socketService.off('train:error');
    };
  }, []);

  const handleTrainModel = () => {
    if (!window.confirm("Bạn đã thu thập đủ data chưa? Quá trình huấn luyện có thể mất vài phút!")) return;
    socketService.trainModel();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-xl bg-opacity-20">
              <Brain className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                VietSign AI
              </h1>
              <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Hybrid Edge-Cloud System</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => setMode('predict')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${mode === 'predict' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <Eye className="w-5 h-5" />
              Phân Tích & Dịch
            </button>
            <button 
              onClick={() => setMode('collect')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${mode === 'collect' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <PackagePlus className="w-5 h-5" />
              Thu Thập Data
            </button>
            <button 
              onClick={handleTrainModel}
              disabled={isTraining}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 ${isTraining ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'}`}
            >
              <Brain className={`w-5 h-5 ${isTraining ? 'animate-pulse' : ''}`} />
              {isTraining ? 'Đang Huấn Luyện...' : 'Huấn Luyện AI'}
            </button>
          </div>
        </div>
      </header>

      {trainStatus && (
        <div className="max-w-7xl mx-auto w-full px-6 mt-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-center text-slate-300 animate-in fade-in slide-in-from-top-4">
            {trainStatus}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex gap-8">
        <div className="w-[640px] shrink-0">
          <VideoCapture mode={mode} />
        </div>
        <div className="flex-1 min-w-0">
          {mode === 'predict' ? <TranslationDisplay /> : <GestureCollector />}
        </div>
      </main>
    </div>
  );
}

export default App;