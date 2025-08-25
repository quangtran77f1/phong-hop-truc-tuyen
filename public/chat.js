const socket = io("/");
const msgInput = document.getElementById("chat_message");
const msgContainer = document.querySelector(".messages");

document.addEventListener("keydown", e => {
  if (e.key === "Enter" && msgInput.value !== "") {
    socket.emit("message", msgInput.value);
    msgInput.value = "";
  }
});

socket.on("createMessage", (msg, username) => {
  msgContainer.innerHTML += `<div><b>${username}</b>: ${msg}</div>`;
});
