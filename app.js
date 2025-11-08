// Elements
const qrFile = document.getElementById('qrFile');
const scanFileBtn = document.getElementById('scanFileBtn');
const scanCameraBtn = document.getElementById('scanCameraBtn');
const cameraPreview = document.getElementById('cameraPreview');
const wifiDetails = document.getElementById('wifiDetails');
const ssidEl = document.getElementById('ssid');
const passwordEl = document.getElementById('password');
const encryptionEl = document.getElementById('encryption');
const hiddenEl = document.getElementById('hidden');
const scannedEl = document.getElementById('scanned');
const rawDataEl = document.getElementById('rawData');
const historyList = document.getElementById('historyList');
const exportBtn = document.getElementById('exportBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const themeSelect = document.getElementById('themeSelect');
const installBtn = document.getElementById('installBtn');

const HISTORY_KEY = "wifi_qr_history_v3";
let deferredPrompt = null;

/* ---------- HISTORY ---------- */
function loadHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
}
function saveHistory(entry) {
  const arr = loadHistory();
  arr.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
}
function renderHistory() {
  const arr = loadHistory();
  historyList.innerHTML = arr.length
    ? arr.map(it => `<div class="history-entry"><span>${it.ssid}</span> | ${new Date(it.date).toLocaleString()}</div>`).join('')
    : "<p>No history yet.</p>";
}
renderHistory();

/* ---------- FILE SCAN ---------- */
scanFileBtn.addEventListener('click', () => qrFile.click());
qrFile.addEventListener('change', e => handleFile(e.target.files[0]));
function handleFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => processImage(reader.result);
  reader.readAsDataURL(file);
}

/* ---------- LIVE CAMERA SCAN ---------- */
scanCameraBtn.addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  const video = document.createElement('video');
  video.srcObject = stream;
  video.play();
  cameraPreview.innerHTML = '';
  cameraPreview.appendChild(video);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const interval = setInterval(() => {
    if(video.readyState === video.HAVE_ENOUGH_DATA){
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video,0,0);
      const code = jsQR(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
      if(code){
        stopCamera(stream, video, interval);
        processQR(code.data);
      }
    }
  }, 400);
});
function stopCamera(stream, video, interval){
  clearInterval(interval);
  stream.getTracks().forEach(t=>t.stop());
  video.remove();
  cameraPreview.innerHTML = '';
}

/* ---------- PROCESS QR ---------- */
function processImage(dataUrl){
  const img = new Image();
  img.src = dataUrl;
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img,0,0);
    const code = jsQR(ctx.getImageData(0,0,canvas.width,canvas.height).data, canvas.width, canvas.height);
    if(code) processQR(code.data);
    else alert("No QR code found.");
  };
}
function processQR(data){
  const ssid = /S:([^;]*)/.exec(data)?.[1]||"N/A";
  const password = /P:([^;]*)/.exec(data)?.[1]||"N/A";
  const encryption = /T:([^;]*)/.exec(data)?.[1]||"N/A";
  const hidden = /H:([^;]*)/.exec(data)?.[1]||"No";
  const date = new Date();

  ssidEl.textContent = ssid;
  passwordEl.textContent = password;
  encryptionEl.textContent = encryption;
  hiddenEl.textContent = hidden;
  scannedEl.textContent = date.toLocaleString();
  rawDataEl.textContent = data;
  wifiDetails.classList.add('fade-in');

  saveHistory({ssid,password,encryption,hidden,date,raw:data});
  renderHistory();
}

/* ---------- EXPORT / CLEAR ---------- */
exportBtn.addEventListener('click', ()=>{
  const arr = loadHistory();
  if(!arr.length) return alert("No history to export.");
  const opt = prompt('Type "csv" or "json" to export:');
  if(!opt) return;
  if(opt.toLowerCase()==="json"){
    const blob = new Blob([JSON.stringify(arr,null,2)],{type:"application/json"});
    download(blob,"wifi_history.json");
  } else if(opt.toLowerCase()==="csv"){
    const csv = ["SSID,Password,Encryption,Hidden,Date,Raw",...arr.map(it=>`"${it.ssid}","${it.password}","${it.encryption}","${it.hidden}","${it.date}","${it.raw}"`)].join("\n");
    download(new Blob([csv],{type:"text/csv"}),"wifi_history.csv");
  } else alert("Invalid format.");
});
function download(blob,filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

clearHistoryBtn.addEventListener('click',()=>{
  if(confirm("Clear full history?")){
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  }
});

/* ---------- THEME ---------- */
themeSelect.addEventListener('change',()=>{
  document.body.className = themeSelect.value;
});

/* ---------- INSTALL PWA ---------- */
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredPrompt=e;
  installBtn.style.display='inline-block';
});
installBtn.addEventListener('click',async ()=>{
  if(!deferredPrompt) return alert("Install prompt not ready.");
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  if(choice.outcome==="accepted") alert("App installed!");
  deferredPrompt=null;
});

/* ---------- SERVICE WORKER ---------- */
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
