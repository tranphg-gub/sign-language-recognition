import React, { useEffect, useRef, useState } from 'react';
import { socketService } from '../services/socketService';
import { Camera, Radio, Square, Loader2 } from 'lucide-react';

function VideoCapture({ mode = 'predict' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const frameBufferRef = useRef([]);
  const isRecordingRef = useRef(false);
  
  const modeRef = useRef(mode);

  const [isLoading, setIsLoading] = useState(true);
  const [frameCount, setFrameCount] = useState(0);
  const [status, setStatus] = useState('Đang khởi tạo AI...');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    modeRef.current = mode;
    stopRecording();
  }, [mode]);

  useEffect(() => {
    const checkMediaPipeReady = () => {
      if (window.Hands && window.Camera && window.drawConnectors) {
        setupMediaPipe();
      } else {
        setTimeout(checkMediaPipeReady, 100);
      }
    };

    const setupMediaPipe = async () => {
      try {
        const hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);
        handsRef.current = hands;

        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            await hands.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
          facingMode: 'user'
        });

        cameraRef.current = camera;
        camera.start();
        setIsLoading(false);
        setStatus('Camera Sẵn sàng');
      } catch (error) {
        console.error('Lỗi khởi tạo Camera:', error);
        setStatus('Lỗi tải Camera');
      }
    };

    checkMediaPipeReady(); 

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, []);

  const extractLandmarks = (results) => {
    const landmarks = new Array(126).fill(0);
    if (results.multiHandLandmarks) {
      results.multiHandLandmarks.forEach((hand, handIdx) => {
        if (handIdx > 1) return;
        hand.forEach((point, pointIdx) => {
          const startIdx = handIdx * 63 + pointIdx * 3;
          landmarks[startIdx] = point.x;
          landmarks[startIdx + 1] = point.y;
          landmarks[startIdx + 2] = point.z;
        });
      });
    }
    return landmarks;
  };

  const onResults = (results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#10b981', lineWidth: 2 });
        window.drawLandmarks(ctx, landmarks, { color: '#3b82f6', lineWidth: 1, radius: 3 });
      }
    }
    ctx.restore();

    if (isRecordingRef.current) {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = extractLandmarks(results);
        frameBufferRef.current.push(landmarks);
        setFrameCount(frameBufferRef.current.length);

        if (frameBufferRef.current.length >= 30) {
          const framesToSend = frameBufferRef.current.slice(0, 30);
          
          if (modeRef.current === 'predict') {
            socketService.sendFramesForPrediction(framesToSend);
            frameBufferRef.current = [];
            setFrameCount(0);
          } else if (modeRef.current === 'collect') {
            window.dispatchEvent(new CustomEvent('frames-ready', { detail: framesToSend }));
            setStatus('📸 Đã gửi! Đang quét tiếp...');
            frameBufferRef.current = [];
            setFrameCount(0);
          }
        }
      } else {
        setStatus('Đang chờ tay xuất hiện...');
      }
    }
  };

  const startRecording = () => {
    isRecordingRef.current = true;
    setIsRecording(true);
    frameBufferRef.current = [];
    setFrameCount(0);
    setStatus('Đang chờ tay xuất hiện...');
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setStatus('Đã tạm dừng');
  };

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        <video ref={videoRef} className="hidden" />
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={480} 
          className="w-full h-full object-cover"
        />
        
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur flex flex-col items-center justify-center text-slate-300">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className="font-medium animate-pulse">Khởi tạo MediaPipe AI...</p>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full border border-red-500/30 backdrop-blur-sm text-sm font-medium animate-in fade-in">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
            Đang quét
          </div>
        )}
      </div>
      
      <div className="p-6 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${mode === 'predict' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Trạng thái Camera</p>
              <p className="text-sm font-medium text-slate-200">{status}</p>
            </div>
          </div>
          
          {mode === 'collect' && isRecording && (
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-400 mb-1">Khung hình (30 frames)</span>
              <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-75"
                  style={{ width: `${(frameCount / 30) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-4">
          {!isRecording ? (
            <button 
              onClick={startRecording}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${mode === 'predict' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'}`}
            >
              <Radio className="w-5 h-5" />
              {mode === 'predict' ? 'Bật AI Nhận Diện' : 'Bắt Đầu Quay Mẫu'}
            </button>
          ) : (
            <button 
              onClick={stopRecording}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all"
            >
              <Square className="w-5 h-5" />
              Tạm Dừng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoCapture;