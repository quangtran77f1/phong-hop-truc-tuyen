
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = new Map();

io.on('connection', (socket) => {
  let joinedRoom = null;

  socket.on('join', ({ room, name }) => {
    joinedRoom = room || 'main';
    if (!rooms.has(joinedRoom)) rooms.set(joinedRoom, new Map());
    const r = rooms.get(joinedRoom);
    r.set(socket.id, { name });
    socket.join(joinedRoom);

    // gửi danh sách user hiện có
    socket.emit('users', [...r.entries()].filter(([id]) => id !== socket.id)
      .map(([id, u]) => ({ id, name: u.name })));

    socket.to(joinedRoom).emit('user-joined', { id: socket.id, name });
  });

  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('chat', (msg) => {
    const r = rooms.get(joinedRoom);
    const name = r?.get(socket.id)?.name || 'Unknown';
    io.to(joinedRoom).emit('chat', { from: { id: socket.id, name }, text: msg });
  });

  socket.on('disconnect', () => {
    const r = rooms.get(joinedRoom);
    const name = r?.get(socket.id)?.name;
    r?.delete(socket.id);
    socket.to(joinedRoom).emit('user-left', { id: socket.id, name });
  });
});

server.listen(3000, () => console.log('Server chạy http://localhost:3000'));
