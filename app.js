if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log("PWA SW Registered"))
    .catch((err) => console.log("SW Fail:", err));
}

let isActive = false;
let isCooldown = false;
let cooldownTimer = null;

// LocalStorage se saved values load karna
let blockedAreas = JSON.parse(localStorage.getItem('blockedAreas')) || ["Jamia", "Seelampur"];
let savedFare = localStorage.getItem('minFareVal') || "125";
let savedDist = localStorage.getItem('minDistVal') || "5";

const toggleBtn = document.getElementById('toggleBtn');
const statusBox = document.getElementById('statusBox');
const addAreaBtn = document.getElementById('addAreaBtn');
const blockAreaInput = document.getElementById('blockAreaInput');
const areaList = document.getElementById('areaList');
const testRideBtn = document.getElementById('testRideBtn');
const testResult = document.getElementById('testResult');
const cooldownMsg = document.getElementById('cooldownMsg');

const minFareInput = document.getElementById('minFare');
const minDistInput = document.getElementById('minDist');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const saveMsg = document.getElementById('saveMsg');

// Saved values set karna
minFareInput.value = savedFare;
minDistInput.value = savedDist;

// Settings Save Button Logic
saveSettingsBtn.addEventListener('click', () => {
  const newFare = minFareInput.value.trim();
  const newDist = minDistInput.value.trim();

  if (newFare !== "" && newDist !== "") {
    localStorage.setItem('minFareVal', newFare);
    localStorage.setItem('minDistVal', newDist);
    saveMsg.textContent = "✅ सेटिंग्स सफलतापूर्वक सेव हो गई हैं!";
    setTimeout(() => {
      saveMsg.textContent = "";
    }, 3000);
  } else {
    alert("कृपया किराया और दूरी दोनों सही भरें!");
  }
});

function renderAreas() {
  areaList.innerHTML = '';
  blockedAreas.forEach((area, index) => {
    const span = document.createElement('span');
    span.className = 'area-tag';
    span.innerHTML = `${area} <b onclick="removeArea(${index})" style="color:#ef4444; cursor:pointer; margin-left:4px;">×</b>`;
    areaList.appendChild(span);
  });
  localStorage.setItem('blockedAreas', JSON.stringify(blockedAreas));
}

window.removeArea = function(index) {
  blockedAreas.splice(index, 1);
  renderAreas();
};

addAreaBtn.addEventListener('click', () => {
  const val = blockAreaInput.value.trim();
  if (val && !blockedAreas.includes(val)) {
    blockedAreas.push(val);
    blockAreaInput.value = '';
    renderAreas();
  }
});

toggleBtn.addEventListener('click', () => {
  isActive = !isActive;
  if (isActive) {
    statusBox.textContent = "फिल्टर चालू है (Active)";
    statusBox.className = "status-box active";
    toggleBtn.textContent = "फिल्टर बंद करें";
    toggleBtn.style.backgroundColor = "#dc2626";
  } else {
    statusBox.textContent = "फिल्टर बंद है (Inactive)";
    statusBox.className = "status-box inactive";
    toggleBtn.textContent = "फिल्टर चालू करें";
    toggleBtn.style.backgroundColor = "#2563eb";
  }
});

// Pahli ride accept hone par 1 minute ka cooldown start karne wala function
function startCooldown() {
  isCooldown = true;
  let seconds = 60;
  cooldownMsg.textContent = `⏳ 1 Min Cooldown Active (${seconds}s remaining)! Baaki apps band karein.`;

  cooldownTimer = setInterval(() => {
    seconds--;
    if (seconds > 0) {
      cooldownMsg.textContent = `⏳ 1 Min Cooldown Active (${seconds}s remaining)! Baaki apps band karein.`;
    } else {
      clearInterval(cooldownTimer);
      isCooldown = false;
      cooldownMsg.textContent = "✅ Ready! Nayi ride ke liye filter taiyaar hai.";
    }
  }, 1000);
}

// Ride check karne ka main logic
function checkRide(appName, fare, distance, location) {
  if (!isActive) {
    return { accept: false, reason: "Filter band hai" };
  }

  // 1 Min Cooldown Check: Agar pahli ride accept ho chuki hai, toh 60s tak koi doosri ride accept nahi hogi
  if (isCooldown) {
    return { accept: false, reason: `⛔ 1 Min Cooldown active! Ek ride pehle hi accept ho chuki hai (${appName} ride blocked).` };
  }

  const isAppAllowed = document.getElementById(`app${appName}`).checked;
  if (!isAppAllowed) {
    return { accept: false, reason: `${appName} rides disabled hain!` };
  }

  const minFare = parseFloat(localStorage.getItem('minFareVal')) || 0;
  const minDist = parseFloat(localStorage.getItem('minDistVal')) || 0;

  if (fare < minFare) {
    return { accept: false, reason: `Fare kam hai (₹${fare} < ₹${minFare})` };
  }

  if (distance < minDist) {
    return { accept: false, reason: `Distance kam hai (${distance} KM < ${minDist} KM)` };
  }

  const isBlocked = blockedAreas.some(area => 
    location.toLowerCase().includes(area.toLowerCase())
  );

  if (isBlocked) {
    return { accept: false, reason: `Area (${location}) blocked list me hai!` };
  }

  // PAHLI RIDE ACCEPT HOTE HI COOLDOWN TIMER SHURU HOGA
  startCooldown();
  return { accept: true, reason: `🎉 ${appName} Ride Accepted! 1 minute ka timer shuru ho gaya hai. Baaki apps (Ola/Uber) manual close karein.` };
}

testRideBtn.addEventListener('click', () => {
  const appName = document.getElementById('testApp').value;
  const fare = parseFloat(document.getElementById('testFare').value);
  const dist = parseFloat(document.getElementById('testDist').value);
  const loc = document.getElementById('testLoc').value;

  const result = checkRide(appName, fare, dist, loc);

  if (result.accept) {
    testResult.style.color = "#10b981";
    testResult.textContent = "🟢 " + result.reason;
    alert(`🚨 RIDE ACCEPTED (${appName})!\n\n1 minute ka cooldown chalu hai. Kripya baki apps ko manual close/offline karein!`);
  } else {
    testResult.style.color = "#ef4444";
    testResult.textContent = "🔴 " + result.reason;
  }
});

renderAreas();
