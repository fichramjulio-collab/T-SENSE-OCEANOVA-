import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, sendEmailVerification,
  sendPasswordResetEmail, onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const authScreen = document.getElementById("authScreen");
const dashboard = document.getElementById("dashboard");
const authMessage = document.getElementById("authMessage");
const configNotice = document.getElementById("configNotice");
const configReady = firebaseConfig.apiKey !== "PASTE_API_KEY_HERE" &&
  firebaseConfig.projectId !== "PASTE_PROJECT_ID" &&
  firebaseConfig.apiKey && firebaseConfig.projectId;
let auth = null;

function showMessage(message, type="info") {
  authMessage.textContent = message;
  authMessage.className = `message ${type}`;
}
function setMode(mode) {
  const login = mode === "login";
  document.getElementById("loginForm").classList.toggle("hidden", !login);
  document.getElementById("registerForm").classList.toggle("hidden", login);
  document.getElementById("showRegister").classList.toggle("hidden", !login);
  document.getElementById("showLogin").classList.toggle("hidden", login);
  document.getElementById("forgotPassword").classList.toggle("hidden", !login);
  document.getElementById("authEyebrow").textContent = login ? "SECURE ACCESS" : "JOIN OCEANOVA";
  document.getElementById("authTitle").textContent = login ? "Selamat datang kembali" : "Buat akun T-SENSE";
  document.getElementById("authDescription").textContent = login
    ? "Masuk untuk membuka pusat pemantauan pesisir T-SENSE."
    : "Daftarkan email dan buat password untuk mengakses dashboard.";
  showMessage("");
}
document.getElementById("showRegister").addEventListener("click", () => setMode("register"));
document.getElementById("showLogin").addEventListener("click", () => setMode("login"));

function friendlyError(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use":"Email ini sudah terdaftar. Silakan masuk.",
    "auth/invalid-email":"Format email tidak valid.",
    "auth/weak-password":"Password terlalu lemah. Gunakan minimal 6 karakter.",
    "auth/user-not-found":"Akun tidak ditemukan. Periksa email atau daftar dahulu.",
    "auth/wrong-password":"Password tidak sesuai.",
    "auth/invalid-credential":"Email atau password tidak sesuai.",
    "auth/popup-closed-by-user":"Jendela Google ditutup sebelum proses selesai.",
    "auth/unauthorized-domain":"Domain website belum ditambahkan ke Authorized domains Firebase.",
    "auth/operation-not-allowed":"Metode login belum diaktifkan di Firebase Authentication.",
    "auth/network-request-failed":"Koneksi internet bermasalah. Coba kembali."
  };
  return map[code] || `Terjadi kendala (${code || "unknown"}). Periksa pengaturan Firebase dan coba kembali.`;
}

if (!configReady) {
  configNotice.classList.remove("hidden");
  document.querySelectorAll("#loginForm button, #registerForm button, #googleButton, #forgotPassword").forEach(el => el.disabled = true);
  showMessage("Lengkapi konfigurasi Firebase terlebih dahulu pada assets/firebase-config.js.", "error");
} else {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    showMessage("Konfigurasi Firebase belum benar: " + error.message, "error");
  }
}

document.getElementById("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth) return;
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirm = document.getElementById("registerConfirm").value;
  if (password !== confirm) return showMessage("Password dan konfirmasi password tidak sama.", "error");
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(credential.user, { displayName: name });
    await sendEmailVerification(credential.user);
    await signOut(auth);
    setMode("login");
    showMessage("Akun berhasil dibuat. Silakan verifikasi email melalui tautan yang dikirim, lalu masuk kembali.", "success");
  } catch (error) { showMessage(friendlyError(error), "error"); }
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth) return;
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (!credential.user.emailVerified) {
      await signOut(auth);
      return showMessage("Email belum diverifikasi. Buka email verifikasi dari Firebase, lalu coba masuk kembali.", "error");
    }
  } catch (error) { showMessage(friendlyError(error), "error"); }
});

document.getElementById("googleButton").addEventListener("click", async () => {
  if (!auth) return;
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  } catch (error) { showMessage(friendlyError(error), "error"); }
});

document.getElementById("forgotPassword").addEventListener("click", async () => {
  if (!auth) return;
  const email = document.getElementById("loginEmail").value.trim();
  if (!email) return showMessage("Masukkan alamat email pada kolom Gmail terlebih dahulu.", "error");
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage("Tautan untuk mengatur ulang password telah dikirim jika email terdaftar.", "success");
  } catch (error) { showMessage(friendlyError(error), "error"); }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  if (auth) await signOut(auth);
});
if (auth) onAuthStateChanged(auth, user => {
  if (user) {
    authScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    document.getElementById("userName").textContent = user.displayName || "Operator";
    document.getElementById("userEmail").textContent = user.email || "";
    document.getElementById("userAvatar").textContent = (user.displayName || user.email || "O").charAt(0).toUpperCase();
    startDashboard();
  } else {
    dashboard.classList.add("hidden");
    authScreen.classList.remove("hidden");
    stopDashboard();
  }
});

// Dashboard preview data. Replace this generator with authenticated backend telemetry
// before using the dashboard for actual field monitoring.
let timer = null, records = [], paused = false, period = "second", chart = null;
const canvas = document.getElementById("waterChart");
const ctx = canvas.getContext("2d");
function nowLabel() { return new Date().toLocaleString("id-ID", { timeZone:"Asia/Jakarta" }); }
function sample() {
  const t = new Date();
  const distance = +(48 + Math.sin(Date.now()/19000)*1.1 + (Math.random()-.5)*.5).toFixed(2);
  const lat = -2.9900 + (Math.random()-.5)*0.0002;
  const lon = 104.7600 + (Math.random()-.5)*0.0002;
  return { timestamp:t.toISOString(), localTime:nowLabel(), distance_cm:distance, latitude:+lat.toFixed(6), longitude:+lon.toFixed(6), source:"SIMULATION" };
}
function addSample() {
  const r = sample(); records.push(r); if (records.length > 5000) records.shift();
  document.getElementById("distanceValue").innerHTML = `${r.distance_cm.toFixed(2)} <small>cm</small>`;
  document.getElementById("latestReading").textContent = `${r.distance_cm.toFixed(2)} cm`;
  document.getElementById("changeValue").innerHTML = `${(r.distance_cm-records[0].distance_cm).toFixed(2)} <small>cm</small>`;
  document.getElementById("satelliteValue").innerHTML = `${Math.floor(8+Math.random()*5)} <small>SV</small>`;
  document.getElementById("latitude").textContent = `${r.latitude.toFixed(6)}°`;
  document.getElementById("longitude").textContent = `${r.longitude.toFixed(6)}°`;
  document.getElementById("gnssTime").textContent = new Date().toLocaleTimeString("id-ID");
  document.getElementById("recordCount").textContent = `${records.length} rekaman`;
  document.getElementById("chartCount").textContent = `${records.length} titik data`;
  renderTable(); drawChart();
}
function renderTable() {
  const body = document.getElementById("historyBody");
  body.innerHTML = "";
  records.slice(-8).reverse().forEach(r => {
    const tr = document.createElement("tr");
    [new Date(r.timestamp).toLocaleTimeString("id-ID"), r.distance_cm.toFixed(2), r.latitude.toFixed(6), r.longitude.toFixed(6), r.source].forEach(v => {
      const td=document.createElement("td"); td.textContent=v; tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}
function aggregate() {
  if (period==="second") return records.slice(-60).map(r=>({label:new Date(r.timestamp).toLocaleTimeString("id-ID"), value:r.distance_cm}));
  const buckets = new Map();
  records.forEach(r => {
    const d=new Date(r.timestamp);
    const key=period==="hour" ? new Date(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours()).toISOString() : new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(r.distance_cm);
  });
  return [...buckets.entries()].slice(period==="hour"?-24:-7).map(([k,vals])=>({label:new Date(k).toLocaleString("id-ID",period==="hour"?{hour:"2-digit",day:"2-digit",month:"short"}:{day:"2-digit",month:"short"}), value:vals.reduce((a,b)=>a+b,0)/vals.length}));
}
function drawChart() {
  const rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  canvas.width=Math.max(300,rect.width*dpr); canvas.height=250*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const w=rect.width,h=250,pad={l:42,r:16,t:18,b:34};
  ctx.clearRect(0,0,w,h);
  const points=aggregate(); if(!points.length) return;
  const vals=points.map(p=>p.value), min=Math.min(...vals)-1, max=Math.max(...vals)+1;
  ctx.font="11px Inter,Arial"; ctx.strokeStyle="#e7edf1"; ctx.fillStyle="#8495a2"; ctx.lineWidth=1;
  for(let i=0;i<5;i++){const y=pad.t+(h-pad.t-pad.b)*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText((max-(max-min)*i/4).toFixed(1),4,y+4);}
  const x=i=>pad.l+(w-pad.l-pad.r)*(points.length===1?.5:i/(points.length-1));
  const y=v=>pad.t+(h-pad.t-pad.b)*(max-v)/(max-min);
  const grad=ctx.createLinearGradient(0,pad.t,0,h-pad.b);grad.addColorStop(0,"rgba(25,166,184,.24)");grad.addColorStop(1,"rgba(25,166,184,0)");
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(x(i),y(p.value)):ctx.moveTo(x(i),y(p.value)));ctx.lineTo(x(points.length-1),h-pad.b);ctx.lineTo(x(0),h-pad.b);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(x(i),y(p.value)):ctx.moveTo(x(i),y(p.value)));ctx.strokeStyle="#159eae";ctx.lineWidth=2.5;ctx.stroke();
  ctx.fillStyle="#82939f";ctx.textAlign="center";
  const step=Math.max(1,Math.ceil(points.length/5));points.forEach((p,i)=>{if(i%step===0||i===points.length-1)ctx.fillText(p.label,x(i),h-10);});
  document.getElementById("chartRange").textContent=period==="second"?"60 detik terakhir":period==="hour"?"Ringkasan per jam":"Ringkasan per hari";
}

/* =====================================================================
   REFERENSI PASUT BIG
   Data stasiun : assets/tide-stations.json
   Data tinggi  : file CSV yang disebut di "dataFile" pada JSON tersebut
   ===================================================================== */
let tideRows = [];
let tideLoaded = false;

// Jarak antar dua titik (km) - rumus Haversine
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = d => d * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Zona waktu data CSV pasut. 7 = WIB. Ubah jadi 0 kalau data dari BIG ternyata UTC.
const TIDE_UTC_OFFSET_HOURS = 7;

// Membaca CSV pasut. Mendukung dua format:
// 1) Lat,Lon,tanggal(M/D/YYYY),jam(H:MM:SS),z(m)  -> format CSV Muntok dari BIG
// 2) waktu,tinggi                                  -> format sederhana 2 kolom
function parseTideCsv(text) {
  const clean = text.replace(/^\uFEFF/, "").trim();
  const lines = clean.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes(";") ? ";" : ",";
  return lines.slice(1).map(line => {
    const p = line.split(delimiter).map(s => s.trim().replace(/^"|"$/g, ""));
    if (p.length >= 5) {
      const [mo, d, y] = p[2].split("/").map(Number);
      const [hh, mi, ss] = p[3].split(":").map(Number);
      const t = new Date(Date.UTC(y, mo - 1, d, hh, mi, ss || 0) - TIDE_UTC_OFFSET_HOURS * 3600000);
      return { t, h: parseFloat(p[4].replace(",", ".")) };
    }
    const h = parseFloat((p[1] || "").replace(",", "."));
    return { t: new Date(p[0]), h };
  }).filter(r => !isNaN(r.t.getTime()) && Number.isFinite(r.h));
}

function setTideText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function loadTideReference(myLat, myLon) {
  try {
    const res = await fetch("assets/tide-stations.json", { cache: "no-store" });
    if (!res.ok) throw new Error("tide-stations.json tidak ditemukan (" + res.status + ")");
    const { stations } = await res.json();
    if (!stations || !stations.length) throw new Error("Daftar stasiun kosong");

    // pilih stasiun terdekat
    const nearest = stations
      .map(s => ({ ...s, dist: haversine(myLat, myLon, s.lat, s.lon) }))
      .sort((a, b) => a.dist - b.dist)[0];

    setTideText("tideName", nearest.name);
    setTideText("tideDistance", nearest.dist.toFixed(1) + " km");
    setTideText("tideDatum", nearest.datum || "BELUM DIKETAHUI");
    setTideText("tideSourceTag", nearest.source || "BIG");

    const csvRes = await fetch(nearest.dataFile, { cache: "no-store" });
    if (!csvRes.ok) throw new Error("File CSV pasut tidak ditemukan (" + csvRes.status + ")");
    tideRows = parseTideCsv(await csvRes.text());
    if (!tideRows.length) throw new Error("CSV pasut kosong atau formatnya salah");

    setTideText("tideLatest", tideRows[tideRows.length - 1].h.toFixed(2) + " m");
    tideLoaded = true;
    drawTideChart(tideRows);
  } catch (err) {
    console.error("Gagal memuat data pasut", err);
    setTideText("tideName", "Data tidak tersedia");
    setTideText("tideLatest", "-- m");
  }
}

function drawTideChart(rows = tideRows) {
  const c = document.getElementById("tideChart");
  if (!c || !rows.length) return;
  c.style.width = "100%"; c.style.height = "250px";
  const rect = c.getBoundingClientRect();
  if (!rect.width) return; // dashboard masih tersembunyi
  const cx = c.getContext("2d"), dpr = window.devicePixelRatio || 1;
  c.width = Math.max(300, rect.width * dpr); c.height = 250 * dpr;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = 250, pad = { l: 42, r: 16, t: 18, b: 34 };
  cx.clearRect(0, 0, w, h);

  const vals = rows.map(r => r.h);
  const min = Math.min(...vals) - 0.1, max = Math.max(...vals) + 0.1;
  cx.font = "11px Inter,Arial"; cx.strokeStyle = "#e7edf1"; cx.fillStyle = "#8495a2"; cx.lineWidth = 1; cx.textAlign = "left";
  for (let i = 0; i < 5; i++) {
    const yy = pad.t + (h - pad.t - pad.b) * i / 4;
    cx.beginPath(); cx.moveTo(pad.l, yy); cx.lineTo(w - pad.r, yy); cx.stroke();
    cx.fillText((max - (max - min) * i / 4).toFixed(2), 4, yy + 4);
  }
  const x = i => pad.l + (w - pad.l - pad.r) * (rows.length === 1 ? .5 : i / (rows.length - 1));
  const y = v => pad.t + (h - pad.t - pad.b) * (max - v) / (max - min);

  const grad = cx.createLinearGradient(0, pad.t, 0, h - pad.b);
  grad.addColorStop(0, "rgba(30,90,200,.22)"); grad.addColorStop(1, "rgba(30,90,200,0)");
  cx.beginPath();
  rows.forEach((r, i) => i ? cx.lineTo(x(i), y(r.h)) : cx.moveTo(x(i), y(r.h)));
  cx.lineTo(x(rows.length - 1), h - pad.b); cx.lineTo(x(0), h - pad.b); cx.closePath();
  cx.fillStyle = grad; cx.fill();

  cx.beginPath();
  rows.forEach((r, i) => i ? cx.lineTo(x(i), y(r.h)) : cx.moveTo(x(i), y(r.h)));
  cx.strokeStyle = "#1e5ac8"; cx.lineWidth = 2.5; cx.stroke();

  cx.fillStyle = "#82939f"; cx.textAlign = "center";
  const step = Math.max(1, Math.ceil(rows.length / 5));
  rows.forEach((r, i) => {
    if (i % step === 0 || i === rows.length - 1) {
      const label = r.t.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
      cx.fillText(label, x(i), h - 10);
    }
  });
}
/* ===================== AKHIR BAGIAN PASUT BIG ===================== */

function startDashboard() {
  if(timer) return;
  document.getElementById("clock").textContent = new Date().toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta"})+" WIB";
  document.getElementById("dateLabel").textContent = new Date().toLocaleDateString("id-ID",{timeZone:"Asia/Jakarta",weekday:"long",day:"numeric",month:"long",year:"numeric"});
  addSample(); timer=setInterval(()=>{if(!paused){addSample();document.getElementById("clock").textContent=new Date().toLocaleTimeString("id-ID",{timeZone:"Asia/Jakarta"})+" WIB";}},1000);
  // Muat referensi pasut BIG sekali saja, memakai posisi GNSS terakhir (simulasi)
  if (!tideLoaded) {
    const last = records[records.length - 1];
    loadTideReference(last ? last.latitude : -2.99, last ? last.longitude : 104.76);
  } else {
    drawTideChart();
  }
}
function stopDashboard(){if(timer){clearInterval(timer);timer=null;}}
document.getElementById("pauseSimulation").addEventListener("click", e=>{paused=!paused;e.currentTarget.textContent=paused?"▶ Lanjutkan simulasi":"Ⅱ Jeda simulasi";});
document.getElementById("resetSimulation").addEventListener("click",()=>{records=[];addSample();});
document.querySelectorAll(".period").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".period").forEach(x=>x.classList.remove("active"));b.classList.add("active");period=b.dataset.period;drawChart();}));
window.addEventListener("resize",()=>{if(!dashboard.classList.contains("hidden")){drawChart();drawTideChart();}});
function download(name, content, type) {
  const blob=new Blob([content],{type}), url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
document.querySelectorAll("[data-export]").forEach(b=>b.addEventListener("click",()=>{
  if(!records.length)return alert("Belum ada data untuk diunduh.");
  const format=b.dataset.export;
  if(format==="csv"){
    const rows=[["timestamp","waktu_wib","distance_cm","latitude","longitude","source"],...records.map(r=>[r.timestamp,r.localTime,r.distance_cm,r.latitude,r.longitude,r.source])];
    download("tsense-data-simulasi.csv",rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n"),"text/csv;charset=utf-8");
  } else if(format==="txt") download("tsense-data-simulasi.txt",records.map(r=>`${r.localTime} | Jarak: ${r.distance_cm} cm | Lat: ${r.latitude} | Lon: ${r.longitude} | ${r.source}`).join("\n"),"text/plain;charset=utf-8");
  else download("tsense-data-simulasi.geojson",JSON.stringify({type:"FeatureCollection",features:records.map(r=>({type:"Feature",geometry:{type:"Point",coordinates:[r.longitude,r.latitude]},properties:{timestamp:r.timestamp,distance_cm:r.distance_cm,source:r.source}}))},null,2),"application/geo+json");
}));
