require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const apiRoutes = require('./src/routes/api.routes');
const socketHandler = require('./src/sockets/index');

const app = express();
const server = http.createServer(app);

// ============= MIDDLEWARE =============
app.use(cors());
app.use(express.json());

// Phục vụ giao diện React tĩnh từ Vite
app.use(express.static(path.join(__dirname, '../web-ui/dist')));

// ============= SOCKET.IO SETUP =============
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const activeUsers = new Map();

app.use('/api', apiRoutes(activeUsers));
socketHandler(io, activeUsers);

const PORT = process.env.PORT || 5000;

console.log(`\n${"=".repeat(70)}\n🚀 VIETNAMESE SIGN LANGUAGE BACKEND - REFACTORED\n${"=".repeat(70)}\n`);

server.listen(PORT, () => {
  console.log(`✅ Backend Server Started`);
  console.log(`   HTTP:       http://localhost:${PORT}`);
  console.log(`   WebSocket:  ws://localhost:${PORT}`);
  console.log(`\n${"=".repeat(70)}\n`);
});