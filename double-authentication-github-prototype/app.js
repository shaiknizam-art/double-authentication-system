const $ = (id) => document.getElementById(id);

const state = {
  stream: null,
  modelsReady: false,
  descriptor: null,
  name: "Demo User",
  pin: "123",
  faceVerified: false,
  blinkMode: false,
  blinkCount: 0,
  digits: [],
  eyeClosed: false,
  lastBlinkAt: 0,
  lastFaceAt: 0,
  detectionLoop: null,
  descriptorReady: false,
};

const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
const STORAGE_KEY = "doubleAuthPrototype";

function toast(message, type="") {
  const el = $("toast");
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => el.className = "toast", 3000);
}

function setModelStatus(text, ready=false) {
  $("modelStatus").innerHTML = `<span class="dot"></span> ${text}`;
  if (ready) $("modelStatus").classList.add("ready");
}

async function loadModels() {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    state.modelsReady = true;
    setModelStatus("AI models ready", true);
    $("cameraStatus").textContent = "Ready — start camera";
  } catch (e) {
    console.error(e);
    setModelStatus("Model load failed");
    toast("AI models could not load. Check your internet connection.", "error");
  }
}

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved) {
      state.name = saved.name || state.name;
      state.pin = saved.pin || state.pin;
      state.descriptor = saved.descriptor ? new Float32Array(saved.descriptor) : null;
      state.descriptorReady = !!state.descriptor;
    }
  } catch(e) { console.warn(e); }
}

function saveSaved() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    name: state.name,
    pin: state.pin,
    descriptor: state.descriptor ? Array.from(state.descriptor) : null
  }));
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast("Camera API is not available in this browser.", "error");
    return;
  }
  try {
    if (!state.modelsReady) {
      toast("Please wait for the AI models to finish loading.", "error");
      return;
    }
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: {ideal: 960}, height: {ideal: 720} },
      audio: false
    });
    $("video").srcObject = state.stream;
    $("cameraPlaceholder").classList.add("hidden");
    $("cameraStatus").textContent = "Camera active — position your face";
    $("liveBadge").textContent = "LIVE";
    $("liveBadge").classList.add("on");
    $("camera-wrap")?.classList.add("scanning");
    document.querySelector(".camera-wrap").classList.add("scanning");
    $("startBtn").textContent = "Camera active";
    $("startBtn").disabled = true;
    beginDetection();
  } catch(e) {
    toast("Camera permission was denied or unavailable.", "error");
  }
}

function stopCamera() {
  if (state.stream) state.stream.getTracks().forEach(t => t.stop());
  state.stream = null;
  if (state.detectionLoop) cancelAnimationFrame(state.detectionLoop);
  $("liveBadge").textContent = "OFFLINE";
  $("liveBadge").classList.remove("on");
  $("cameraPlaceholder").classList.remove("hidden");
  $("cameraStatus").textContent = "Camera stopped";
  $("startBtn").disabled = false;
  $("startBtn").textContent = "Start camera";
}

function eyeAspectRatio(landmarks) {
  // face-api 68-point landmark indices for the left eye: 36-41
  const p = landmarks.positions;
  const d = (a,b) => Math.hypot(p[a].x-p[b].x, p[a].y-p[b].y);
  const vertical = d(37,41) + d(38,40);
  const horizontal = 2 * d(36,39);
  return vertical / horizontal;
}

function setOverlay(detection) {
  const canvas = $("overlay");
  const video = $("video");
  const rect = video.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (!detection) return;
  const b = detection.detection.box;
  ctx.strokeStyle = "#61e6c1";
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x*scaleX,b.y*scaleY,b.width*scaleX,b.height*scaleY);
}

async function beginDetection() {
  const video = $("video");
  await video.play();
  const detect = async () => {
    if (!state.stream) return;
    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({inputSize:320, scoreThreshold:.5}))
        .withFaceLandmarks()
        .withFaceDescriptor();

      setOverlay(detection);

      if (detection) {
        $("cameraStatus").textContent = state.faceVerified ? "Identity verified — enter blink PIN" : "Face detected — verifying identity";
        state.lastFaceAt = Date.now();

        const score = state.descriptor
          ? faceapi.euclideanDistance(state.descriptor, detection.descriptor)
          : 0.0;

        if (state.descriptor) {
          const percent = Math.max(0, Math.min(99.9, (1 - score) * 100));
          $("faceScore").textContent = `${percent.toFixed(0)}%`;
          if (score < 0.52 && !state.faceVerified) verifyFace();
        } else {
          $("faceScore").textContent = "Demo";
        }

        if (state.blinkMode) processBlink(detection.landmarks);
      } else {
        $("faceScore").textContent = "—";
      }
    } catch(e) {
      console.warn("Detection:", e);
    }
    state.detectionLoop = requestAnimationFrame(detect);
  };
  detect();
}

function verifyFace() {
  state.faceVerified = true;
  state.blinkMode = true;
  $("stepLabel").textContent = "STEP 2";
  $("stageTitle").textContent = "Enter blink PIN";
  $("faceStep").classList.add("done");
  $("faceState").textContent = "Verified";
  $("blinkStep").classList.add("active");
  $("blinkState").textContent = "Ready";
  $("sessionStatus").textContent = "2FA active";
  $("lockIcon").textContent = "🔓";
  toast(`Face verified. Welcome, ${state.name}. Now enter your blink PIN.`, "success");
}

function processBlink(landmarks) {
  const ear = eyeAspectRatio(landmarks);
  const threshold = 0.22;
  const now = Date.now();

  if (ear < threshold && !state.eyeClosed && now - state.lastBlinkAt > 280) {
    state.eyeClosed = true;
    state.blinkCount++;
    $("blinkCount").textContent = state.blinkCount;
  }

  if (ear >= threshold && state.eyeClosed) {
    state.eyeClosed = false;
    state.lastBlinkAt = now;
    $("blinkCount").textContent = state.blinkCount;
  }

  // A pause after a blink group commits the digit.
  if (state.blinkCount > 0 && now - state.lastBlinkAt > 1050) {
    commitBlinkDigit();
  }
}

function commitBlinkDigit() {
  const digit = state.blinkCount;
  state.digits.push(digit);
  state.blinkCount = 0;
  $("blinkCount").textContent = "0";
  renderDots();

  if (state.digits.length >= 3) {
    const entered = state.digits.join("");
    if (entered === state.pin) {
      grantAccess();
    } else {
      toast(`Incorrect blink PIN. You entered ${entered}. Try again.`, "error");
      state.digits = [];
      renderDots();
    }
  }
}

function renderDots() {
  [...$("pinDots").children].forEach((dot,i) => dot.classList.toggle("filled", i < state.digits.length));
}

function grantAccess() {
  $("blinkStep").classList.add("done");
  $("blinkState").textContent = "Verified";
  $("sessionStatus").textContent = "Unlocked";
  $("lockIcon").textContent = "🔓";
  $("protectedPanel").classList.add("show");
  toast("Authentication successful — access granted.", "success");
}

function lockSession() {
  state.faceVerified = false;
  state.blinkMode = false;
  state.blinkCount = 0;
  state.digits = [];
  state.eyeClosed = false;
  $("stepLabel").textContent = "STEP 1";
  $("stageTitle").textContent = "Face verification";
  $("faceStep").classList.remove("done");
  $("blinkStep").classList.remove("done");
  $("blinkStep").classList.remove("active");
  $("faceState").textContent = "Waiting";
  $("blinkState").textContent = "Locked";
  $("sessionStatus").textContent = "Locked";
  $("lockIcon").textContent = "🔒";
  $("blinkCount").textContent = "0";
  $("faceScore").textContent = "—";
  $("protectedPanel").classList.remove("show");
  renderDots();
  toast("Session locked.");
}

async function captureEnrollment() {
  const name = $("nameInput").value.trim();
  const pin = $("pinInput").value.trim();

  if (!name) return toast("Enter a display name.", "error");
  if (!/^[1-5]{3}$/.test(pin)) return toast("PIN must contain exactly 3 digits, each from 1 to 5.", "error");
  if (!state.stream) await startCamera();
  if (!state.stream) return;

  toast("Look directly at the camera and hold still…");
  await new Promise(r => setTimeout(r, 1300));

  try {
    const detection = await faceapi
      .detectSingleFace($("video"), new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:.5}))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return toast("No clear face detected. Move closer and try again.", "error");

    state.name = name;
    state.pin = pin;
    state.descriptor = detection.descriptor;
    state.descriptorReady = true;
    saveSaved();

    $("enrollDialog").close();
    state.faceVerified = false;
    lockSession();
    $("cameraStatus").textContent = "Identity enrolled — verify your face";
    toast("Enrollment complete. Your prototype identity is saved locally.", "success");
  } catch(e) {
    toast("Enrollment failed. Please try again.", "error");
  }
}

function demoIdentity() {
  state.name = "Demo User";
  state.pin = "123";
  state.descriptor = null;
  state.descriptorReady = false;
  state.faceVerified = false;
  state.blinkMode = false;
  state.digits = [];
  renderDots();
  $("cameraStatus").textContent = "Demo mode — face presence will unlock step 2";
  $("faceScore").textContent = "Demo";
  $("faceStep").classList.add("done");
  $("faceState").textContent = "Verified";
  $("blinkStep").classList.add("active");
  $("blinkState").textContent = "Ready";
  $("stepLabel").textContent = "STEP 2";
  $("stageTitle").textContent = "Enter blink PIN";
  state.faceVerified = true;
  state.blinkMode = true;
  toast("Demo identity active. Enter 1 blink, pause; 2 blinks, pause; 3 blinks.", "success");
}

$("startBtn").addEventListener("click", startCamera);
$("resetBtn").addEventListener("click", lockSession);
$("logoutBtn").addEventListener("click", lockSession);
$("demoBtn").addEventListener("click", demoIdentity);

$("enrollBtn").addEventListener("click", () => {
  if (!state.modelsReady) return toast("Wait for AI models to load first.", "error");
  $("enrollDialog").showModal();
});
$("closeDialog").addEventListener("click", () => $("enrollDialog").close());
$("saveEnroll").addEventListener("click", captureEnrollment);

window.addEventListener("resize", () => {
  const c = $("overlay");
  c.width = $("video").clientWidth;
  c.height = $("video").clientHeight;
});

loadSaved();
loadModels();
