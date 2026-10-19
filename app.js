if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log("PWA SW Registered"))
    .catch((err) => console.log("SW Fail:", err));
}

let isActive = false;
let isCooldown = false;
let cooldownTimer = null;

// LocalStorage से पुराने डेटा लोड करना
let blockedAreas = JSON.parse(localStorage.getItem('blockedAreas')) || ["Jamia", "Seelampur"];
let minFareVal = localStorage.getItem('minFareVal') || "125";
let minDistVal = localStorage.getItem('minDistVal') || "5";

const toggleBtn = document.getElementById('toggleBtn');
const statusBox = document.getElementById('statusBox');
const addAreaBtn = document.getElementById('addAreaBtn');
const blockAreaInput = document.getElementById('blockAreaInput');
const areaList = document.getElementById('areaList');
const testRideBtn = document.getElementById('testRideBtn');
const testResult = document.getElementById('testResult');
const cooldownMsg = document.getElementById('cooldownMsg');

document.getElementById('minFare').value = minFareVal;
document.getElementById('minDist').value = minDistVal;

// वैल्यू चेंज होते ही सेव करना
document.getElementById('minFare').addEventListener('input', (e) => {
  localStorage.setItem('minFareVal', e.target.value);
});
document.getElementById('minDist').addEventListener('input', (e) => {
  localStorage.setItem('minDistVal', e.target.value);
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

// 1 मिनट का टाइमर चालू करना
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

// मुख्य राइड चेकिंग लॉजिक
function checkRide(appName, fare, distance, location) {
  if (!isActive) {
    return { accept: false, reason: "फिल्टर बंद है" };
  }

  if (isCooldown) {
    return { accept: false, reason: "1 मिनट का टाइमर चल रहा है! नई राइड रोकी गई।" };
  }

  // चेक करें कि संबंधित ऐप टॉगल ऑन है या नहीं
  const isAppAllowed = document.getElementById(`app${appName}`).checked;
  if (!isAppAllowed) {
    return { accept: false, reason: `${appName} राइड्स डिसेबल (बंद) की गई हैं!` };
  }

  const minFare = parseFloat(document.getElementById('minFare').value) || 0;
  const minDist = parseFloat(document.getElementById('minDist').value) || 0;

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

  // राइड एसेप्ट होने पर 1 मिनट का टाइमर चालू करें
  startCooldown();
  return { accept: true, reason: `बढ़िया ${appName} राइड! एसेप्ट की जा रही है ✅ (1 Min Cooldown Started)` };
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
    alert(`🚨 RIDE ACCEPTED (${appName})!\nकृपया अन्य ऐप्स (Ola/Uber) को बंद करें!`);
  } else {
    testResult.style.color = "#ef4444";
    testResult.textContent = "🔴 " + result.reason;
  }
});

renderAreas();
