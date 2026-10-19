if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log("PWA SW Registered"))
    .catch((err) => console.log("SW Fail:", err));
}

let isActive = false;
let isCooldown = false;
let cooldownTimer = null;

// LocalStorage से सेव की हुई वैल्यूज लोड करना
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

// इनपुट में सेव की गई वैल्यू दिखाना
minFareInput.value = savedFare;
minDistInput.value = savedDist;

// सेव बटन पर क्लिक करने पर ही सेटिंग्स परमानेंट स्टोर होंगी
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

function startCooldown() {
  isCooldown = true;
  let seconds = 60;
  cooldownMsg.textContent = `⏳ 1 मिनट का ब्रेक चालू (${seconds}s remaining)...`;

  cooldownTimer = setInterval(() => {
    seconds--;
    if (seconds > 0) {
      cooldownMsg.textContent = `⏳ 1 मिनट का ब्रेक चालू (${seconds}s remaining)...`;
    } else {
      clearInterval(cooldownTimer);
      isCooldown = false;
      cooldownMsg.textContent = "✅ रेडी! नई राइड के लिए फ़िल्टर तैयार है।";
    }
  }, 1000);
}

function checkRide(appName, fare, distance, location) {
  if (!isActive) {
    return { accept: false, reason: "फिल्टर बंद है" };
  }

  if (isCooldown) {
    return { accept: false, reason: "⏳ 1 मिनट का कूलडाउन टाइमर चल रहा है!" };
  }

  const isAppAllowed = document.getElementById(`app${appName}`).checked;
  if (!isAppAllowed) {
    return { accept: false, reason: `${appName} राइड्स डिसेबल (बंद) की गई हैं!` };
  }

  // सिर्फ सेव की गई वैल्यूज ही चेक होंगी
  const minFare = parseFloat(localStorage.getItem('minFareVal')) || 0;
  const minDist = parseFloat(localStorage.getItem('minDistVal')) || 0;

  if (fare < minFare) {
    return { accept: false, reason: `किराया कम है (₹${fare} < ₹${minFare})` };
  }

  if (distance < minDist) {
    return { accept: false, reason: `दूरी कम है (${distance} KM < ${minDist} KM)` };
  }

  const isBlocked = blockedAreas.some(area => 
    location.toLowerCase().includes(area.toLowerCase())
  );

  if (isBlocked) {
    return { accept: false, reason: `यह एरिया (${location}) ब्लॉक लिस्ट में है!` };
  }

  startCooldown();
  return { accept: true, reason: `बढ़िया ${appName} राइड! एसेप्ट की जा रही है ✅` };
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
    alert(`🚨 RIDE ACCEPTED (${appName})!\n1 मिनट का कूलडाउन शुरू हो गया है।`);
  } else {
    testResult.style.color = "#ef4444";
    testResult.textContent = "🔴 " + result.reason;
  }
});

renderAreas();
