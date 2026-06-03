import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000'; // Khớp với cổng của Backend Node.js

class SocketService {
  constructor() {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ Đã kết nối với Trạm trung chuyển Node.js');
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Lỗi kết nối WebSocket:', err.message);
    });
  }

  on(eventName, callback) {
    this.socket.on(eventName, callback);
  }

  off(eventName) {
    this.socket.off(eventName);
  }

  // Gửi data cho Gemini phân tích (Chế độ Predict)
  sendFramesForPrediction(frames) {
    this.socket.emit('predict:gesture', { frames, timestamp: new Date().toLocaleTimeString() });
  }

  // Gửi data để lưu file npy (Chế độ Collect)
  sendFramesForCollection(frames, gesture_name, sequence_index) {
    this.socket.emit('collect:gesture', { frames, gesture_name, sequence_index });
  }
}

export const socketService = new SocketService();