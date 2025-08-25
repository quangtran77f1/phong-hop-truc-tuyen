const socket = io("/");
const videoGrid = document.getElementById("videos");
const myVideo = document.createElement("video");
myVideo.muted = true;

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream);
});

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

// Chat
const msgInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messages = document.getElementById("messages");

sendBtn.onclick = () => {
  const message = msgInput.value;
  socket.emit("message", "room1", message);
  msgInput.value = "";
};

socket.on("createMessage", message => {
  const li = document.createElement("li");
  li.innerText = message;
  messages.appendChild(li);
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
