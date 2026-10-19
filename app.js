// PWA Service Worker Register करना
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log("PWA Service Worker Registered Successfully"))
    .catch((err) => console.log("SW Registration Failed:", err));
}

// स्टेट variables
let isActive = false;
let blockedAreas = ["Noida Sector 62", "Jamia"];

// DOM Elements
const toggleBtn = document.getElementById('toggleBtn');
const statusBox = document.getElementById('statusBox');
const addAreaBtn = document.getElementById('addAreaBtn');
const blockAreaInput = document.getElementById('blockAreaInput');
const areaList = document.getElementById('areaList');
const testRideBtn = document.getElementById('testRideBtn');
const testResult = document.getElementById('testResult');

// ब्लॉक एरिया लिस्ट अपडेट करना
function renderAreas() {
  areaList.innerHTML = '';
  blockedAreas.forEach((area, index) => {
    const span = document.createElement('span');
    span.className = 'area-tag';
    span.innerHTML = `${area} <b onclick="removeArea(${index})" style="color:#ef4444; cursor:pointer; margin-left:4px;">×</b>`;
    areaList.appendChild(span);
  });
}

function removeArea(index) {
  blockedAreas.splice(index, 1);
  renderAreas();
}

addAreaBtn.addEventListener('click', () => {
  const val = blockAreaInput.value.trim();
  if (val && !blockedAreas.includes(val)) {
    blockedAreas.push(val);
    blockAreaInput.value = '';
    renderAreas();
  }
});

// बटन चालू/बंद टॉगल
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

// राइड चेक करने का मुख्य लॉजिक
function checkRide(fare, distance, location) {
  if (!isActive) {
    return { accept: false, reason: "फिल्टर बंद है" };
  }

  const minFare = parseFloat(document.getElementById('minFare').value) || 0;
  const minDist = parseFloat(document.getElementById('minDist').value) || 0;

  // 1. किराया चेक
  if (fare < minFare) {
    return { accept: false, reason: `किराया कम है (₹${fare} < ₹${minFare})` };
  }

  // 2. दूरी चेक
  if (distance < minDist) {
    return { accept: false, reason: `दूरी कम है (${distance} KM < ${minDist} KM)` };
  }

  // 3. ब्लॉक एरिया चेक
  const isBlocked = blockedAreas.some(area => 
    location.toLowerCase().includes(area.toLowerCase())
  );

  if (isBlocked) {
    return { accept: false, reason: `यह एरिया (${location}) ब्लॉक लिस्ट में है!` };
  }

  return { accept: true, reason: "बढ़िया राइड! ऑटो-एसेप्ट करें ✅" };
}

// टेस्ट राइड बटन का इवेंट
testRideBtn.addEventListener('click', () => {
  const fare = parseFloat(document.getElementById('testFare').value);
  const dist = parseFloat(document.getElementById('testDist').value);
  const loc = document.getElementById('testLoc').value;

  const result = checkRide(fare, dist, loc);

  if (result.accept) {
    testResult.style.color = "#10b981";
    testResult.textContent = "🟢 " + result.reason;
  } else {
    testResult.style.color = "#ef4444";
    testResult.textContent = "🔴 " + result.reason;
  }
});

// शुरुआती लोड
renderAreas();
