import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

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

  sendFramesForPrediction(frames) {
    this.socket.emit('predict:gesture', { frames, timestamp: new Date().toLocaleTimeString() });
  }

  sendFramesForCollection(frames, gesture_name, sequence_index) {
    this.socket.emit('collect:gesture', { frames, gesture_name, sequence_index });
  }

  trainModel() {
    this.socket.emit('train:model');
  }
}

export const socketService = new SocketService();