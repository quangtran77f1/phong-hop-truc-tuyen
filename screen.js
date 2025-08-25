async function shareScreen() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true
    });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.controls = true;
    document.getElementById("video-grid").append(video);
  } catch (err) {
    console.error("Lỗi chia sẻ màn hình:", err);
  }
}

document.getElementById("btnShareScreen").addEventListener("click", shareScreen);
