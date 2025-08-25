// Khởi tạo server và socket.io
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

io.on("connection", socket => {
  socket.on("join-room", (roomId, userId, username) => {
    socket.join(roomId);
    socket.broadcast.to(roomId).emit("user-connected", userId, username);

    socket.on("message", msg => {
      io.to(roomId).emit("createMessage", msg, username);
    });

    socket.on("disconnect", () => {
      io.to(roomId).emit("user-disconnected", userId);
    });
  });
});

http.listen(3000, () => console.log("Server running on http://localhost:3000"));
