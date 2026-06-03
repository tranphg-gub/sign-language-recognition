/**
 * Vietnamese Sign Language Backend Server
 * * FILE: backend/server.js
 * PURPOSE: Main WebSocket server that bridges React frontend with Python AI
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios'); // Đã gom import axios lên đầu
const { GoogleGenerativeAI } = require('@google/generative-ai'); // IMPORT GEMINI
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ============= SOCKET.IO SETUP =============
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// ============= EXPRESS MIDDLEWARE =============
app.use(cors());
app.use(express.json());
app.use(express.static('frontend/build'));

// ============= CONFIGURATION =============
const PORT = process.env.PORT || 5000;
const PYTHON_API = process.env.PYTHON_API || 'http://localhost:8000';

// KHỞI TẠO BỘ NÃO GEMINI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============= CONNECTION TRACKING =============
const activeUsers = new Map();

console.log(`\n${"=".repeat(70)}\n🚀 VIETNAMESE SIGN LANGUAGE BACKEND - PRODUCTION SERVER\n${"=".repeat(70)}\n`);

// ============= SOCKET.IO EVENT HANDLERS =============
io.on('connection', (socket) => {
  console.log(`✅ [${new Date().toLocaleTimeString()}] New client connected\n   Socket ID: ${socket.id}`);
  
  activeUsers.set(socket.id, { connected_at: new Date(), frames_received: 0, predictions: 0 });
  io.emit('server:stats', { active_users: activeUsers.size, timestamp: new Date() });

  // [MODE 1: DATA COLLECTION]
  socket.on('collect:gesture', async (data) => {
    try {
      const { frames, gesture_name, sequence_index } = data;
      console.log(`🎬 [COLLECTION] Received ${frames.length} frames | Gesture: "${gesture_name}" | Sequence: ${sequence_index}`);

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
        console.log(`✅ [SAVED] ${gesture_name}/${sequence_index}.npy`);
      } else {
        socket.emit('collect:error', { message: 'Failed to save sequence' });
      }
    } catch (error) {
      console.error('❌ Collection error:', error.message);
      socket.emit('collect:error', { message: error.message });
    }
  });

  // [MODE 2: GESTURE PREDICTION]
  socket.on('predict:gesture', async (data) => {
    try {
      const { frames, timestamp } = data;
      if (!frames || frames.length !== 30) {
        socket.emit('predict:error', { message: `Invalid frame count: ${frames?.length}` });
        return;
      }

      console.log(`🤖 [PREDICTION] Processing 30 frames...`);
      const startTime = Date.now();
      const prediction = await callPythonPredictor(frames);
      const latency = Date.now() - startTime;

      if (prediction) {
        const user = activeUsers.get(socket.id);
        if (user) user.predictions++;
        console.log(`✅ [PREDICTION] ${prediction.gesture} (${(prediction.confidence * 100).toFixed(2)}%) - ${latency}ms`);
        socket.emit('predict:result', {
          gesture: prediction.gesture,
          confidence: prediction.confidence,
          timestamp,
          latency,
          message: `Predicted: ${prediction.gesture} (${(prediction.confidence * 100).toFixed(2)}%)`
        });
      } else {
        socket.emit('predict:error', { message: 'AI model failed to predict' });
      }
    } catch (error) {
      console.error('❌ Prediction error:', error.message);
      socket.emit('predict:error', { message: error.message });
    }
  });

  // [DATASET STATISTICS]
  socket.on('dataset:stats', async () => {
    try {
      const stats = await getDatasetStats();
      socket.emit('dataset:stats:response', stats);
      console.log('📊 Dataset stats requested');
    } catch (error) {
      socket.emit('dataset:error', { message: error.message });
    }
  });

  // [MODEL TRAINING]
  socket.on('train:model', async () => {
    try {
      console.log('\n🔥 [TRAINING] Starting model training...');
      socket.emit('train:started', { message: '🔄 Training started...' });
      const result = await trainLSTMModel();
      if (result.success) {
        socket.emit('train:completed', result);
        console.log('✅ [TRAINING] Completed successfully!');
      } else {
        socket.emit('train:error', result);
        console.error('❌ [TRAINING] Failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Training error:', error.message);
      socket.emit('train:error', { message: error.message });
    }
  });

  // [DISCONNECTION]
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    console.log(`\n❌ [${new Date().toLocaleTimeString()}] Client disconnected\n   Socket ID: ${socket.id}`);
    if (user) console.log(`   Stats: ${user.predictions} predictions, ${user.frames_received} frames received`);
    activeUsers.delete(socket.id);
    io.emit('server:stats', { active_users: activeUsers.size, timestamp: new Date() });
    console.log(`   Active users: ${activeUsers.size}\n`);
  });
});

// ============= HELPER FUNCTIONS =============
async function callPythonPredictor(frames) {
  try {
    const response = await axios.post(`${PYTHON_API}/predict`, { frames }, { timeout: 10000 });
    return response.data;
  } catch (error) {
    console.error('❌ Python Predictor Error:', error.message);
    return null;
  }
}

async function saveFramesToNpy(gestureName, frames, index) {
  try {
    await axios.post(`${PYTHON_API}/collect`, { gesture_name: gestureName, sequence_index: index, frames: frames }, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('❌ Save to NPY Error:', error.message);
    return false;
  }
}

async function getDatasetStats() {
  try {
    const response = await axios.get(`${PYTHON_API}/stats`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('❌ Get Stats Error:', error.message);
    return { error: 'Failed to fetch stats' };
  }
}

async function trainLSTMModel() {
  try {
    const response = await axios.post(`${PYTHON_API}/train`, {}, { timeout: 1800000 });
    return { success: true, message: response.data.message };
  } catch (error) {
    console.error('❌ Train Model Error:', error.message);
    return { success: false, message: error.message };
  }
}

// ============= REST API ENDPOINTS =============

// [API MỚI ĐƯỢC CHÈN VÀO ĐÂY: DỊCH NGÔN NGỮ TỰ NHIÊN BẰNG GEMINI]
app.post('/api/translate', async (req, res) => {
  try {
    const { words } = req.body;
    if (!words || words.length === 0) {
      return res.json({ success: false, message: "Không có từ khóa nào." });
    }

    const prompt = `Bạn là một trợ lý phiên dịch ngôn ngữ ký hiệu. 
    Hãy ghép các từ khóa thô ráp này thành một câu giao tiếp tiếng Việt hoàn chỉnh, tự nhiên và ngắn gọn nhất. 
    Chỉ trả về đúng nội dung câu kết quả, không giải thích gì thêm.
    Các từ khóa: ${words.join(", ")}`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const sentence = result.response.text().trim();

    res.json({ success: true, sentence: sentence });
  } catch (error) {
    console.error("❌ Lỗi từ Gemini:", error.message);
    res.status(500).json({ success: false, error: "Hệ thống AI đang bận." });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', active_users: activeUsers.size, timestamp: new Date() });
});

app.get('/api/stats', (req, res) => {
  const stats = Array.from(activeUsers.entries()).map(([id, data]) => ({ id, ...data }));
  res.json(stats);
});

// ============= START SERVER =============
server.listen(PORT, () => {
  console.log(`✅ Backend Server Started`);
  console.log(`   HTTP:       http://localhost:${PORT}`);
  console.log(`   WebSocket:  ws://localhost:${PORT}`);
  console.log(`   Python AI:  ${PYTHON_API}`);
  console.log(`\n${"=".repeat(70)}\n`);
});

module.exports = { io, app };