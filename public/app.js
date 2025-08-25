const socket = io();
let localStream;
let peers = {};
let username;
let roomId = new URLSearchParams(window.location.search).get("room") || "default";

document.getElementById("joinBtn").onclick = async () => {
  username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Vui lòng nhập tên!");
    return;
  }
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("meeting-screen").style.display = "block";

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  addVideoStream(localStream, username + " (Bạn)");

  socket.emit("join-room", { roomId, username });
};

socket.on("user-connected", ({ id, username }) => {
  createPeerConnection(id, username, true);
});

socket.on("signal", async ({ from, signal, username }) => {
  if (!peers[from]) {
    createPeerConnection(from, username, false);
  }
  const pc = peers[from].pc;
  await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
  if (signal.sdp.type === "offer") {
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("signal", { to: from, signal: { sdp: pc.localDescription } });
  }
});

socket.on("user-disconnected", ({ id, username }) => {
  if (peers[id]) {
    peers[id].pc.close();
    peers[id].video.remove();
    delete peers[id];
  }
});

function createPeerConnection(id, username, initiator) {
  const pc = new RTCPeerConnection();
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("data-id", id);
  document.getElementById("video-grid").appendChild(video);

  pc.ontrack = (event) => {
    video.srcObject = event.streams[0];
  };

  peers[id] = { pc, video, username };

  if (initiator) {
    pc.onnegotiationneeded = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("signal", { to: id, signal: { sdp: pc.localDescription } });
    };
  }
}

function addVideoStream(stream, label) {
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = stream;
  video.setAttribute("data-self", true);
  document.getElementById("video-grid").appendChild(video);
}

// 🔹 Chat
document.getElementById("sendBtn").onclick = () => {
  const msg = document.getElementById("msgInput").value;
  if (msg.trim()) {
    socket.emit("chat-message", msg);
    document.getElementById("msgInput").value = "";
  }
};

socket.on("chat-message", ({ username, message }) => {
  const div = document.createElement("div");
  div.textContent = username + ": " + message;
  document.getElementById("messages").appendChild(div);
});
// Screen sharing
const shareBtn = document.getElementById("shareScreen");
shareBtn.onclick = async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenVideo = document.createElement("video");
    addVideoStream(screenVideo, screenStream);
  } catch (err) {
    console.error("Không thể chia sẻ màn hình:", err);
  }
};
