const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with permissive CORS for your React Native app
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

// Make the io instance accessible inside our routes
app.set('io', io);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/gatepasses', require('./routes/gatepassRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.log(err));

// Listen for connections (Great for checking logs in Render)
io.on('connection', (socket) => {
  console.log(`Mobile client connected to socket: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// VERY IMPORTANT: Use server.listen, not app.listen!
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));