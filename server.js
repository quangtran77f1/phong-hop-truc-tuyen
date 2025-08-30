const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// rooms: { roomId: { socketId: username } }
const rooms = {};

io.on('connection', socket => {
  console.log('Socket connected', socket.id);

  socket.on('join-room', ({ roomId, username }) => {
    socket.data.username = username;
    socket.data.roomId = roomId;

    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] = username;
    socket.join(roomId);

    // send existing users to newcomer
    const existing = Object.entries(rooms[roomId])
      .filter(([id]) => id !== socket.id)
      .map(([id, name]) => ({ id, name }));
    socket.emit('existing-users', existing);

    // notify others
    socket.to(roomId).emit('user-joined', { id: socket.id, name: username });
  });

  socket.on('webrtc-offer', ({ to, sdp }) => {
    io.to(to).emit('webrtc-offer', { from: socket.id, sdp, name: socket.data.username });
  });

  socket.on('webrtc-answer', ({ to, sdp }) => {
    io.to(to).emit('webrtc-answer', { from: socket.id, sdp });
  });

  socket.on('webrtc-ice', ({ to, candidate }) => {
    io.to(to).emit('webrtc-ice', { from: socket.id, candidate });
  });

  socket.on('chat-message', ({ roomId, text }) => {
    io.to(roomId).emit('chat-message', { from: socket.id, username: socket.data.username, text, t: Date.now() });
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const username = socket.data.username;
    if (roomId && rooms[roomId]) {
      delete rooms[roomId][socket.id];
      socket.to(roomId).emit('user-left', { id: socket.id, name: username });
      if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

