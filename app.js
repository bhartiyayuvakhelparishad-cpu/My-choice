if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log("PWA SW Registered"))
    .catch((err) => console.log("SW Fail:", err));
}

// Default Admin Password agar pehle se set na ho
function getAdminPassword() {
  return localStorage.getItem('customAdminPass') || "7860";
}

function openAdminPanel() {
  document.getElementById('adminModal').style.display = "block";
}

function closeAdminPanel() {
  document.getElementById('adminModal').style.display = "none";
  document.getElementById('adminLoginBox').style.display = "block";
  document.getElementById('adminDashboard').style.display = "none";
  document.getElementById('adminPassInput').value = "";
  document.getElementById('newAdminPass').value = "";
}

function verifyAdmin() {
  const pass = document.getElementById('adminPassInput').value.trim();
  const currentAdminPass = getAdminPassword();

  if (pass === currentAdminPass) {
    document.getElementById('adminLoginBox').style.display = "none";
    document.getElementById('adminDashboard').style.display = "block";
    renderUserList();
  } else {
    alert("❌ Galat Admin Password!");
  }
}

// Admin Password Change Function
function changeAdminPassword() {
  const newPass = document.getElementById('newAdminPass').value.trim();
  if (newPass.length < 4) {
    alert("Password kam se kam 4 characters ka hona chahiye!");
    return;
  }
  localStorage.setItem('customAdminPass', newPass);
  document.getElementById('newAdminPass').value = "";
  alert("✅ Admin Password safalpurvak badal diya gaya hai!");
}

function getUsersFromStorage() {
  return JSON.parse(localStorage.getItem('registeredUsersList')) || [];
}

function saveUsersToStorage(users) {
  localStorage.setItem('registeredUsersList', JSON.stringify(users));
}

function addNewUser() {
  const name = document.getElementById('newUserName').value.trim();
  const phone = document.getElementById('newUserPhone').value.trim();
  const customCode = document.getElementById('newUserCode').value.trim().toUpperCase();

  if (!name || phone.length !== 10 || isNaN(phone) || customCode.length !== 8) {
    alert("Kripya Mobile 10-digit aur Secret Code exact 8-character ka bharein!");
    return;
  }

  const last4 = phone.slice(-4);
  const fullKey = last4 + customCode;

  let users = getUsersFromStorage();
  
  const existingIndex = users.findIndex(u => u.phone === phone);
  if (existingIndex !== -1) {
    users[existingIndex] = { name, phone, customCode, fullKey, active: true };
  } else {
    users.push({ name, phone, customCode, fullKey, active: true });
  }

  saveUsersToStorage(users);
  
  document.getElementById('newUserName').value = "";
  document.getElementById('newUserPhone').value = "";
  document.getElementById('newUserCode').value = "";
  
  renderUserList();
  alert(`User ${name} added! Generated Key: ${fullKey}`);
}

function toggleUserActive(index) {
  let users = getUsersFromStorage();
  users[index].active = !users[index].active;
  saveUsersToStorage(users);
  renderUserList();
}

function deleteUser(index) {
  if (confirm("Kya aap is user ko delete karna chahte hain?")) {
    let users = getUsersFromStorage();
    users.splice(index, 1);
    saveUsersToStorage(users);
    renderUserList();
  }
}

function renderUserList() {
  const users = getUsersFromStorage();
  const tbody = document.getElementById('userTableBody');
  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#cbd5e1;">Koi user registered nahi hai.</td></tr>`;
    return;
  }

  users.forEach((user, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.name}</td>
      <td>${user.phone}</td>
      <td>${user.customCode}</td>
      <td style="color:#38bdf8; font-weight:bold;">${user.fullKey}</td>
      <td>
        <input type="checkbox" ${user.active ? 'checked' : ''} onchange="toggleUserActive(${index})">
      </td>
      <td>
        <button onclick="deleteUser(${index})" style="background:#ef4444; color:#fff; border:none; border-radius:4px; padding:2px 6px; cursor:pointer;">X</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

const lockScreen = document.getElementById('lockScreen');
const mainAppContent = document.getElementById('mainAppContent');
const userPhoneInput = document.getElementById('userPhoneInput');
const activationKeyInput = document.getElementById('activationKeyInput');
const activateBtn = document.getElementById('activateBtn');
const lockMsg = document.getElementById('lockMsg');

function checkActivation() {
  const isActivated = localStorage.getItem('appActivated');
  const activePhone = localStorage.getItem('registeredPhone');
  const users = getUsersFromStorage();

  const currentUser = users.find(u => u.phone === activePhone);

  if (isActivated === "true" && currentUser && currentUser.active) {
    lockScreen.style.display = "none";
    mainAppContent.style.display = "block";
    initApp();
  } else {
    lockScreen.style.display = "block";
    mainAppContent.style.display = "none";
  }
}

activateBtn.addEventListener('click', () => {
  const phone = userPhoneInput.value.trim();
  const userKey = activationKeyInput.value.trim().toUpperCase();

  if (phone.length !== 10 || isNaN(phone)) {
    lockMsg.style.color = "#ef4444";
    lockMsg.textContent = "❌ Kripya sahi 10-digit mobile number daalein!";
    return;
  }

  const users = getUsersFromStorage();
  const matchedUser = users.find(u => u.phone === phone && u.fullKey === userKey);

  if (matchedUser) {
    if (!matchedUser.active) {
      lockMsg.style.color = "#ef4444";
      lockMsg.textContent = "⛔ Aapka account Admin dwara Disabled hai!";
      return;
    }

    localStorage.setItem('appActivated', "true");
    localStorage.setItem('registeredPhone', phone);
    lockMsg.style.color = "#10b981";
    lockMsg.textContent = "✅ App Activate Ho Gaya!";
    setTimeout(() => {
      checkActivation();
    }, 1500);
  } else {
    lockMsg.style.color = "#ef4444";
    lockMsg.textContent = "❌ Galat Mobile Number ya Activation Key!";
  }
});

let isActive = false;
let isCooldown = false;
let cooldownTimer = null;

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

function initApp() {
  minFareInput.value = savedFare;
  minPerKmFareInput.value = savedPerKmFare;
  maxPickupDistInput.value = savedMaxPickup;
  minDistInput.value = savedDist;
  renderAreas();
}

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

  if (fare < minFare) {
    return { accept: false, reason: `Ignored: Total fare kam hai (₹${fare} < ₹${minFare})` };
  }

  const actualPerKm = fare / (tripDistance || 1);
  if (actualPerKm < minPerKmFare) {
    return { accept: false, reason: `Ignored: Per KM fare kam hai (₹${actualPerKm.toFixed(2)}/KM < ₹${minPerKmFare}/KM)` };
  }

  if (pickupDistance > maxPickupDist) {
    return { accept: false, reason: `Ignored: Pickup distance zyada hai (${pickupDistance} KM > ${maxPickupDist} KM)` };
  }

  if (tripDistance < minDist) {
    return { accept: false, reason: `Ignored: Trip distance kam hai (${tripDistance} KM < ${minDist} KM)` };
  }

  const isBlocked = blockedAreas.some(area => 
    location.toLowerCase().includes(area.toLowerCase())
  );

  if (isBlocked) {
    return { accept: false, reason: `Ignored: Area (${location}) blocked list me hai!` };
  }

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
    testResult.textContent = "🟡 " + result.reason + " (Ride ignore kar di gayi hai).";
  }
});

checkActivation();
