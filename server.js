const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let users = {}; // lưu danh sách người dùng: socket.id -> name

io.on("connection", (socket) => {
  console.log("Kết nối mới:", socket.id);

  socket.on("join", (name) => {
    users[socket.id] = name;
    io.emit("user-list", users);
    console.log(`${name} đã tham gia`);
  });

  socket.on("chat", (msg) => {
    io.emit("chat", { name: users[socket.id], msg });
  });

  // Gửi tín hiệu WebRTC (camera + mic)
  socket.on("signal", (data) => {
    io.to(data.to).emit("signal", {
      from: socket.id,
      signal: data.signal,
      name: users[socket.id],
    });
  });

  socket.on("disconnect", () => {
    console.log(users[socket.id], "thoát");
    delete users[socket.id];
    io.emit("user-list", users);
  });
});

server.listen(3000, () => {
  console.log("Server chạy tại http://localhost:3000");
});
