const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("🔌 Người dùng kết nối:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", { id: socket.id, username });
    socket.data.username = username;
    socket.data.roomId = roomId;
  });

  socket.on("signal", (data) => {
    io.to(data.to).emit("signal", {
      from: socket.id,
      signal: data.signal,
      username: socket.data.username,
    });
  });

  socket.on("chat-message", (msg) => {
    io.to(socket.data.roomId).emit("chat-message", {
      username: socket.data.username,
      message: msg,
    });
  });

  socket.on("disconnect", () => {
    if (socket.data.roomId) {
      io.to(socket.data.roomId).emit("user-disconnected", {
        id: socket.id,
        username: socket.data.username,
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`));
