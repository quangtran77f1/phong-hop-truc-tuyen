const videoGrid = document.getElementById("video-grid");

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

// Lấy cam của user hiện tại
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    const myVideo = document.createElement("video");
    myVideo.muted = true;
    addVideoStream(myVideo, stream);
  });
