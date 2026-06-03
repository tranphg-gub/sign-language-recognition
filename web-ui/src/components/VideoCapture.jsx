import React, { useEffect, useRef, useState } from 'react';
import './VideoCapture.css';

function VideoCapture({ mode = 'predict' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const handsRef = useRef(null);
  const frameBufferRef = useRef([]);
  const isRecordingRef = useRef(false);
  const frameCountRef = useRef(0);
  
  const modeRef = useRef(mode);

  const [isLoading, setIsLoading] = useState(true);
  const [frameCount, setFrameCount] = useState(0);
  const [status, setStatus] = useState('Đang khởi tạo AI...');

  useEffect(() => {
    modeRef.current = mode;
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
        setStatus('Sẵn sàng');
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
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        window.drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });
      }
    }

    if (isRecordingRef.current) {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = extractLandmarks(results);
        frameBufferRef.current.push(landmarks);
        frameCountRef.current++;
        setFrameCount(frameCountRef.current);

        if (frameBufferRef.current.length >= 30) {
          const framesToSend = frameBufferRef.current.slice(0, 30);
          
          if (modeRef.current === 'predict') {
            // NÉM TRỰC TIẾP DATA SANG CHO BẢNG DỊCH NGHĨA
            window.dispatchEvent(new CustomEvent('frames-predict-ready', { detail: framesToSend }));
            frameBufferRef.current = [];
            frameCountRef.current = 0;
            setFrameCount(0);
          } else if (modeRef.current === 'collect') {
            window.dispatchEvent(new CustomEvent('frames-ready', { detail: framesToSend }));
            setStatus('📸 Đã lưu tự động! Đang quay tiếp...');
            frameBufferRef.current = [];
            frameCountRef.current = 0;
            setFrameCount(0);
          }
        }
      } else {
        setStatus('Đang chờ bạn giơ tay...');
      }
    }
  };

  const startRecording = () => {
    isRecordingRef.current = true;
    frameBufferRef.current = [];
    frameCountRef.current = 0;
    setFrameCount(0);
    setStatus('Đang chờ bạn giơ tay...');
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setStatus('Đã dừng quay');
  };

  return (
    <div className="video-capture-container">
      <div className="video-wrapper">
        <video ref={videoRef} className="video-input" style={{ display: 'none' }} />
        <canvas ref={canvasRef} width={640} height={480} className="video-canvas" />
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Đang tải AI...</p>
          </div>
        )}
      </div>
      
      <div className="video-controls">
        <div className="status-badge" style={{ backgroundColor: mode === 'predict' ? '#3498db' : '#e67e22', color: 'white', padding: '5px 15px', borderRadius: '20px', display: 'inline-block', marginBottom: '10px' }}>
          {mode === 'predict' 
            ? (isRecordingRef.current ? '👁️ Đang quét liên tục...' : 'Trạng thái: Tạm dừng') 
            : status}
        </div>
        
        {mode === 'collect' && (
           <div className="frame-counter" style={{ fontWeight: 'bold', marginBottom: '10px' }}>
             Frames: {frameCount}/30
           </div>
        )}
        
        <div className="control-buttons">
          <button onClick={startRecording} style={{ padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px', fontWeight: 'bold' }}>
            {mode === 'predict' ? '🔴 Bật AI Nhận Diện' : '🔴 Bắt Đầu Quay Mẫu'}
          </button>
          <button onClick={stopRecording} style={{ padding: '10px 20px', backgroundColor: '#7f8c8d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            ⏹️ Dừng Lại
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoCapture;