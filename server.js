const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Replace with your frontend URL in production
    methods: ["GET", "POST"]
  }
});

// Store active users and chat history
const users = new Map();
const chatHistory = [];

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Handle socket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('join', (username) => {
    users.set(socket.id, username);
    socket.broadcast.emit('message', {
      sender: 'System',
      text: `${username} joined the chat`,
      time: new Date()
    });
    
    // Send chat history to new user
    socket.emit('message', {
      sender: 'System',
      text: `Welcome to the chat, ${username}!`,
      time: new Date()
    });
    
    chatHistory.forEach(msg => socket.emit('message', msg));
    
    // Update online count
    io.emit('onlineCount', users.size);
  });

  // Handle chat messages
  socket.on('chatMessage', (data) => {
    const username = users.get(socket.id);
    if (!username) return;
    
    // Handle both regular messages and replies
    const message = {
      sender: username,
      text: data.text || data,
      time: new Date(),
      replyTo: data.replyTo || null
    };
    
    // Add to chat history (limit to last 100 messages)
    chatHistory.push(message);
    if (chatHistory.length > 100) chatHistory.shift();
    
    // Broadcast to all users
    io.emit('message', message);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);
      io.emit('message', {
        sender: 'System',
        text: `${username} left the chat`,
        time: new Date()
      });
      io.emit('onlineCount', users.size);
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
