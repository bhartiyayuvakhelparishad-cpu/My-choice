if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log("PWA SW Registered"))
    .catch((err) => console.log("SW Fail:", err));
}

let isActive = false;
let isCooldown = false;
let cooldownTimer = null;

// LocalStorage se values load karna
let blockedAreas = JSON.parse(localStorage.getItem('blockedAreas')) || ["Jamia", "Seelampur"];
let savedFare = localStorage.getItem('minFareVal') || "125";
let savedPerKmFare = localStorage.getItem('minPerKmFareVal') || "7.50";
let savedMaxPickup = localStorage.getItem('maxPickupDistVal') || "1.5";
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
const minPerKmFareInput = document.getElementById('minPerKmFare');
const maxPickupDistInput = document.getElementById('maxPickupDist');
const minDistInput = document.getElementById('minDist');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const saveMsg = document.getElementById('saveMsg');

// Saved values set karna
minFareInput.value = savedFare;
minPerKmFareInput.value = savedPerKmFare;
maxPickupDistInput.value = savedMaxPickup;
minDistInput.value = savedDist;

// Settings Save Button Logic
saveSettingsBtn.addEventListener('click', () => {
  const newFare = minFareInput.value.trim();
  const newPerKm = minPerKmFareInput.value.trim();
  const newPickup = maxPickupDistInput.value.trim();
  const newDist = minDistInput.value.trim();

  if (newFare !== "" && newPerKm !== "" && newPickup !== "" && newDist !== "") {
    localStorage.setItem('minFareVal', newFare);
    localStorage.setItem('minPerKmFareVal', newPerKm);
    localStorage.setItem('maxPickupDistVal', newPickup);
    localStorage.setItem('minDistVal', newDist);
    saveMsg.textContent = "✅ सेटिंग्स सफलतापूर्वक सेव हो गई हैं!";
    setTimeout(() => {
      saveMsg.textContent = "";
    }, 3000);
  } else {
    alert("कृपया सभी सेटिंग्स सही भरें!");
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

// Cooldown start karna
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

// Main Logic Check Function
function checkRide(appName, fare, tripDistance, pickupDistance, location) {
  if (!isActive) {
    return { accept: false, reason: "Filter band hai" };
  }

  if (isCooldown) {
    return { accept: false, reason: `⛔ Cooldown active! Pehle hi ek ride accept ho chuki hai.` };
  }

  const isAppAllowed = document.getElementById(`app${appName}`).checked;
  if (!isAppAllowed) {
    return { accept: false, reason: `${appName} rides disabled hain!` };
  }

  const minFare = parseFloat(localStorage.getItem('minFareVal')) || 0;
  const minPerKmFare = parseFloat(localStorage.getItem('minPerKmFareVal')) || 0;
  const maxPickupDist = parseFloat(localStorage.getItem('maxPickupDistVal')) || 999;
  const minDist = parseFloat(localStorage.getItem('minDistVal')) || 0;

  // 1. Minimum Total Fare Check
  if (fare < minFare) {
    return { accept: false, reason: `Ignored: Total fare kam hai (₹${fare} < ₹${minFare})` };
  }

  // 2. Per KM Fare Check (e.g., ₹7.50 / KM)
  const actualPerKm = fare / (tripDistance || 1);
  if (actualPerKm < minPerKmFare) {
    return { accept: false, reason: `Ignored: Per KM fare kam hai (₹${actualPerKm.toFixed(2)}/KM < ₹${minPerKmFare}/KM)` };
  }

  // 3. Pickup Distance Check (e.g., Max 1.5 KM)
  if (pickupDistance > maxPickupDist) {
    return { accept: false, reason: `Ignored: Pickup distance zyada hai (${pickupDistance} KM > ${maxPickupDist} KM)` };
  }

  // 4. Trip Distance Check
  if (tripDistance < minDist) {
    return { accept: false, reason: `Ignored: Trip distance kam hai (${tripDistance} KM < ${minDist} KM)` };
  }

  // 5. Blocked Area Check
  const isBlocked = blockedAreas.some(area => 
    location.toLowerCase().includes(area.toLowerCase())
  );

  if (isBlocked) {
    return { accept: false, reason: `Ignored: Area (${location}) blocked list me hai!` };
  }

  // AGAR SAARI CONDITIONS PASS HONGI TOH HI ACCEPT HOGA
  startCooldown();
  return { accept: true, reason: `🎉 ${appName} Ride Accepted! Rules match ho gaye hain.` };
}

testRideBtn.addEventListener('click', () => {
  const appName = document.getElementById('testApp').value;
  const fare = parseFloat(document.getElementById('testFare').value);
  const dist = parseFloat(document.getElementById('testDist').value);
  const pickup = parseFloat(document.getElementById('testPickup').value);
  const loc = document.getElementById('testLoc').value;

  const result = checkRide(appName, fare, dist, pickup, loc);

  if (result.accept) {
    testResult.style.color = "#10b981";
    testResult.textContent = "🟢 " + result.reason;
    alert(`🚨 RIDE ACCEPTED (${appName})!\n\nRules Match! 1 Min cooldown shuru ho gaya hai.`);
  } else {
    testResult.style.color = "#f59e0b";
    testResult.textContent = "🟡 " + result.reason + " (Ride ko ignore kar diya gaya hai, reject nahi kiya gaya).";
  }
});

renderAreas();
