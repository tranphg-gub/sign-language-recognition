import React, { useState, useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';
import { translateWordsToSentence } from '../services/api';
import { Volume2, RefreshCw, Sparkles, MessageSquareText, Activity } from 'lucide-react';

function TranslationDisplay() {
  const [recognizedWords, setRecognizedWords] = useState([]);
  const [currentGesture, setCurrentGesture] = useState('');
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [history, setHistory] = useState([]);
  const [translatedSentence, setTranslatedSentence] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const isSpeakingRef = useRef(false);
  const translateTimeoutRef = useRef(null);

  useEffect(() => {
    const handlePredictResult = (data) => {
      const { gesture, confidence, latency } = data;
      const confPercent = (confidence * 100).toFixed(2);

      setCurrentGesture(gesture);
      setCurrentConfidence(confPercent);

      if (gesture !== 'TRẠNG THÁI NGHỈ' && gesture !== 'Không rõ' && confidence > 0.75) {
        const timeString = new Date().toLocaleTimeString('vi-VN', { hour12: false });
        
        setHistory(prev => [{ gesture, confPercent, time: timeString, latency }, ...prev].slice(0, 10)); 
        
        setRecognizedWords(prev => {
          if (prev.length === 0 || prev[prev.length - 1] !== gesture) {
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
    };

    socketService.on('predict:result', handlePredictResult);
    return () => socketService.off('predict:result');
  }, []);

  useEffect(() => {
    if (recognizedWords.length > 0) {
      if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
      
      translateTimeoutRef.current = setTimeout(async () => {
        setIsTranslating(true);
        const res = await translateWordsToSentence(recognizedWords);
        setIsTranslating(false);
        
        if (res && res.success) {
          setTranslatedSentence(res.sentence);
          const utterance = new SpeechSynthesisUtterance(res.sentence);
          utterance.lang = 'vi-VN';
          window.speechSynthesis.speak(utterance);
        }
      }, 2000); // 2 seconds idle timeout before sending to Gemini
    }
  }, [recognizedWords]);

  const handleSpeakFullSentence = () => {
    if (!translatedSentence) return;
    const utterance = new SpeechSynthesisUtterance(translatedSentence);
    utterance.lang = 'vi-VN';
    window.speechSynthesis.speak(utterance);
  };

  const handleClear = () => {
    setRecognizedWords([]);
    setCurrentGesture('');
    setCurrentConfidence(0);
    setHistory([]);
    setTranslatedSentence('');
    if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
    window.speechSynthesis.cancel(); 
  };

  return (
    <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 h-full flex flex-col overflow-hidden">
      <div className="bg-slate-800/80 p-6 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-100">
            <MessageSquareText className="w-6 h-6 text-blue-400" />
            Dịch Nghĩa & Phát Âm
          </h3>
          <button 
            onClick={handleClear}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
            title="Xóa làm lại"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4 min-h-[40px]">
          {recognizedWords.length === 0 ? (
            <span className="text-slate-500 italic text-sm">Chưa nhận diện được từ nào...</span>
          ) : (
            recognizedWords.map((word, idx) => (
              <span key={idx} className="bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-600 animate-in zoom-in duration-200">
                {word}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Gemini Dịch Tự Nhiên</h4>
        </div>
        
        <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/50 min-h-[100px] relative flex flex-col justify-center">
          {isTranslating ? (
            <div className="flex items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>AI đang phân tích câu...</span>
            </div>
          ) : translatedSentence ? (
            <div>
              <p className="text-2xl font-medium text-white leading-relaxed pr-12">{translatedSentence}</p>
              <button 
                onClick={handleSpeakFullSentence}
                className="absolute bottom-4 right-4 p-3 bg-blue-500 hover:bg-blue-400 text-white rounded-full shadow-lg shadow-blue-500/20 transition-transform hover:scale-105 active:scale-95"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <p className="text-slate-500 text-center italic text-sm">Đợi người dùng ngừng ký hiệu 2 giây để AI Cloud dịch...</p>
          )}
        </div>
      </div>

      <div className="p-6 flex-1 bg-slate-900/30">
        <div className="grid grid-cols-2 gap-6 h-full">
          <div>
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Real-time Status
            </h4>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-sm mb-1">Cử chỉ đang quét</p>
              <p className="text-lg font-bold text-white mb-4">{currentGesture || '--'}</p>
              
              <p className="text-slate-400 text-sm mb-1">Độ chính xác</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${currentConfidence > 75 ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${currentConfidence}%` }}
                  />
                </div>
                <span className="font-mono font-medium text-sm text-slate-300 w-12">{currentConfidence}%</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Lịch sử</h4>
            <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-y-auto max-h-[200px] p-2 space-y-1 custom-scrollbar">
              {history.length === 0 ? (
                <p className="text-slate-500 text-center text-sm mt-4 italic">Chưa có dữ liệu</p>
              ) : (
                history.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-200 text-sm">{item.gesture}</span>
                      <span className="text-xs text-slate-500">{item.time} • {item.latency}ms</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                      {item.confPercent}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TranslationDisplay;