const qs = new URLSearchParams(location.search);
const roomId = qs.get('room');
const username = qs.get('name') || 'Ẩn danh';
document.getElementById('roomLabel').textContent = `Phòng: ${roomId} • Bạn là ${username}`;

const socket = io();
const grid = document.getElementById('grid');
const chat = document.getElementById('chat');
const messages = document.getElementById('messages');
const btnSend = document.getElementById('sendBtn');
const chatInput = document.getElementById('chatInput');
const btnChat = document.getElementById('btnChat');
const btnMic = document.getElementById('btnMic');
const btnCam = document.getElementById('btnCam');
const btnScreen = document.getElementById('btnScreen');

const peers = new Map();
const streams = new Map();
let localStream;
let usingScreen = false;
let myId;

btnChat.onclick = ()=> chat.classList.toggle('hidden');
btnSend.onclick = sendMessage;
chatInput.addEventListener('keydown', e => { if(e.key==='Enter') sendMessage(); });

btnMic.onclick = ()=> {
  localStream.getAudioTracks().forEach(t=> t.enabled = !t.enabled);
  btnMic.textContent = localStream.getAudioTracks()[0].enabled ? '🎙️' : '🔇';
};
btnCam.onclick = ()=> {
  localStream.getVideoTracks().forEach(t=> t.enabled = !t.enabled);
  btnCam.textContent = localStream.getVideoTracks()[0].enabled ? '📷' : '❌';
};
btnScreen.onclick = async ()=> {
  try{
    if(!usingScreen){
      const scr = await navigator.mediaDevices.getDisplayMedia({video:true});
      usingScreen = true;
      replaceVideoTrack(scr.getVideoTracks()[0]);
      scr.getVideoTracks()[0].onended = ()=> { usingScreen=false; replaceVideoTrack(localStream.getVideoTracks()[0]); };
    } else {
      usingScreen=false;
      replaceVideoTrack(localStream.getVideoTracks()[0]);
    }
  }catch(e){ console.error(e); }
};

function replaceVideoTrack(track){
  // update local tile
  const tile = document.getElementById(`tile-${myId}`);
  if(tile){
    const v = tile.querySelector('video');
    v.srcObject = new MediaStream([track, ...localStream.getAudioTracks()]);
  }
  // replace in RTCPeerConnection senders
  peers.forEach(pc => {
    const sender = pc.getSenders().find(s=> s.track && s.track.kind==='video');
    if(sender) sender.replaceTrack(track);
  });
}

(async function init(){
  localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
  myId = 'local-'+Math.random().toString(36).substr(2,9);
  addTile(myId, username, localStream, true);

  socket.emit('join-room', { roomId, username });
})();

socket.on('existing-users', async users => {
  for(const u of users){
    const pc = createPeer(u.id);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc-offer', { to: u.id, sdp: offer });
  }
  layout();
});

socket.on('user-joined', ({ id, name }) => {
  // do nothing here; we'll get offer/answer flow
  console.log('joined', id, name);
  layout();
});

socket.on('user-left', ({ id }) => {
  removeTile(id);
  const pc = peers.get(id);
  if(pc) pc.close();
  peers.delete(id);
  streams.delete(id);
  layout();
});

socket.on('webrtc-offer', async ({ from, sdp, name }) => {
  const pc = createPeer(from);
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('webrtc-answer', { to: from, sdp: answer });
});

socket.on('webrtc-answer', async ({ from, sdp }) => {
  const pc = peers.get(from);
  if(!pc) return;
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
});

socket.on('webrtc-ice', async ({ from, candidate }) => {
  const pc = peers.get(from);
  if(!pc || !candidate) return;
  try{ await pc.addIceCandidate(new RTCIceCandidate(candidate)); }catch(e){}
});

socket.on('chat-message', ({ username, text }) => {
  const b = document.createElement('div'); b.className='bubble'; b.textContent = `${username}: ${text}`;
  messages.appendChild(b); messages.scrollTop = messages.scrollHeight;
});

function sendMessage(){
  const t = chatInput.value.trim(); if(!t) return;
  socket.emit('chat-message', { roomId, text: t });
  chatInput.value='';
}

function createPeer(remoteId){
  const pc = new RTCPeerConnection();
  peers.set(remoteId, pc);
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.onicecandidate = e => { if(e.candidate) socket.emit('webrtc-ice', { to: remoteId, candidate: e.candidate }); };
  pc.ontrack = e => {
    const ms = e.streams[0];
    streams.set(remoteId, ms);
    addTile(remoteId, 'Thành viên', ms, false);
    layout();
  };
  return pc;
}

function addTile(id, name, stream, isMe){
  let tile = document.getElementById(`tile-${id}`);
  if(!tile){
    tile = document.createElement('div'); tile.className='tile'; tile.id = `tile-${id}`;
    const v = document.createElement('video'); v.autoplay=true; v.playsInline=true; v.muted = isMe;
    v.srcObject = stream; const label = document.createElement('div'); label.className='name'; label.textContent = name + (isMe ? ' (Bạn)' : '');
    tile.appendChild(v); tile.appendChild(label); grid.appendChild(tile);
  } else {
    tile.querySelector('video').srcObject = stream;
  }
}

function removeTile(id){ const el = document.getElementById(`tile-${id}`); if(el) el.remove(); }

function layout(){ const count = grid.querySelectorAll('.tile').length; grid.classList.toggle('grid-2', count===2); }
