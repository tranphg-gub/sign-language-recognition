const {
  callPythonPredictor,
  saveFramesToNpy,
  getDatasetStats,
  trainLSTMModel
} = require('../controllers/python.controller');

module.exports = function(io, activeUsers) {
  io.on('connection', (socket) => {
    console.log(`✅ [${new Date().toLocaleTimeString()}] New client connected | Socket ID: ${socket.id}`);
    
    activeUsers.set(socket.id, { connected_at: new Date(), frames_received: 0, predictions: 0 });
    io.emit('server:stats', { active_users: activeUsers.size, timestamp: new Date() });

    socket.on('collect:gesture', async (data) => {
      try {
        const { frames, gesture_name, sequence_index } = data;

        if (!frames || frames.length !== 30) {
          socket.emit('collect:error', { message: `Expected 30 frames, got ${frames?.length}` });
          return;
        }
        if (!gesture_name) {
          socket.emit('collect:error', { message: 'Gesture name is required' });
          return;
        }

        const saveSuccess = await saveFramesToNpy(gesture_name, frames, sequence_index);
        if (saveSuccess) {
          const user = activeUsers.get(socket.id);
          if (user) user.frames_received += frames.length;
          socket.emit('collect:success', { gesture_name, sequence_index, message: `✅ Saved sequence ${sequence_index} for "${gesture_name}"` });
        } else {
          socket.emit('collect:error', { message: 'Lỗi lưu dữ liệu' });
        }
      } catch (error) {
        socket.emit('collect:error', { message: error.message });
      }
    });

    socket.on('predict:gesture', async (data) => {
      try {
        const { frames, timestamp } = data;
        if (!frames || frames.length !== 30) return socket.emit('predict:error', { message: `Invalid frame count` });

        const startTime = Date.now();
        const prediction = await callPythonPredictor(frames);
        const latency = Date.now() - startTime;

        if (prediction && !prediction.error) {
          const user = activeUsers.get(socket.id);
          if (user) user.predictions++;
          
          socket.emit('predict:result', {
            gesture: prediction.gesture,
            confidence: prediction.confidence,
            timestamp,
            latency,
            message: `Predicted: ${prediction.gesture}`
          });
        } else {
          socket.emit('predict:error', { message: prediction?.error || 'AI model failed to predict' });
        }
      } catch (error) {
        socket.emit('predict:error', { message: error.message });
      }
    });

    socket.on('dataset:stats', async () => {
      const stats = await getDatasetStats();
      socket.emit('dataset:stats:response', stats);
    });

    socket.on('train:model', async () => {
      try {
        socket.emit('train:started', { message: '🔄 Đã gửi yêu cầu huấn luyện đến AI Core...' });
        const result = await trainLSTMModel();
        if (result.success) {
          socket.emit('train:completed', result);
        } else {
          socket.emit('train:error', result);
        }
      } catch (error) {
        socket.emit('train:error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ [${new Date().toLocaleTimeString()}] Client disconnected | Socket ID: ${socket.id}`);
      activeUsers.delete(socket.id);
      io.emit('server:stats', { active_users: activeUsers.size, timestamp: new Date() });
    });
  });
};
