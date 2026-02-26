import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDocs,
  where,
  limit,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ======= EmailJS CONFIG (troque aqui) =======
// ======= EmailJS CONFIG =======
const EMAILJS_PUBLIC_KEY = "pKHqEcnhHeXgu3pHC";
const EMAILJS_SERVICE_ID = "service_1en81so";
const EMAILJS_TEMPLATE_ID = "template_kc2jufc";

emailjs.init(EMAILJS_PUBLIC_KEY);
// Inicializa EmailJS (objeto global vindo do CDN)
emailjs.init(EMAILJS_PUBLIC_KEY);

// ======= Firebase CONFIG (sua config) =======
const firebaseConfig = {
  apiKey: "AIzaSyB2FOENoyG2O8T4GhOQKwq64jkAh8CGZKU",
  authDomain: "forttway-b3d26.firebaseapp.com",
  databaseURL: "https://forttway-b3d26-default-rtdb.firebaseio.com",
  projectId: "forttway-b3d26",
  storageBucket: "forttway-b3d26.firebasestorage.app",
  messagingSenderId: "171188200509",
  appId: "1:171188200509:web:606130d1321d451fb87654"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== UI =====
const techEmail = document.getElementById("techEmail");
const logoutBtn = document.getElementById("logoutBtn");

const clienteEmail = document.getElementById("clienteEmail");
const buscarClienteBtn = document.getElementById("buscarClienteBtn");
const clienteEncontrado = document.getElementById("clienteEncontrado");

const ownerUid = document.getElementById("ownerUid");
const equipamentoTipo = document.getElementById("equipamentoTipo");
const equipamentoModelo = document.getElementById("equipamentoModelo");
const problema = document.getElementById("problema");
const status = document.getElementById("status");
const createBtn = document.getElementById("createBtn");

const osDocId = document.getElementById("osDocId");
const statusUpdate = document.getElementById("statusUpdate");
const statusNote = document.getElementById("statusNote");
const updateBtn = document.getElementById("updateBtn");

const allOs = document.getElementById("allOs");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const counter = document.getElementById("counter");
const lastUpdate = document.getElementById("lastUpdate");

const selectedBox = document.getElementById("selectedBox");
const selectedTitle = document.getElementById("selectedTitle");
const selectedSub = document.getElementById("selectedSub");
const selectedStatus = document.getElementById("selectedStatus");

// Cache
let osCache = [];
let selectedId = null;

function genOsNumber() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function registrarHistorico(osId, { status, note }) {
  await addDoc(collection(db, "ordensServico", osId, "historico"), {
    status: status || "—",
    note: (note || "").trim(),
    at: serverTimestamp()
  });
}

async function buscarClientePorEmail(email) {
  const emailLimpo = (email || "").trim().toLowerCase();
  if (!emailLimpo) throw new Error("Digite o email do cliente.");

  const q = query(
    collection(db, "users"),
    where("email", "==", emailLimpo),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const docSnap = snap.docs[0];
  return { uid: docSnap.id, ...docSnap.data() };
}

buscarClienteBtn.addEventListener("click", async () => {
  try {
    const result = await buscarClientePorEmail(clienteEmail.value);

    clienteEncontrado.style.display = "block";

    if (!result) {
      clienteEncontrado.textContent = "Cliente não encontrado. Verifique o email.";
      ownerUid.value = "";
      return;
    }

    ownerUid.value = result.uid;
    clienteEncontrado.textContent = `Encontrado: ${result.nome || "Cliente"} (${result.email}) • UID preenchido ✅`;
  } catch (err) {
    alert(err?.message || err);
  }
});

// ===== Lista com filtro =====
function matchesFilter(os) {
  const text = (searchInput.value || "").trim().toLowerCase();
  const st = (statusFilter.value || "").trim();

  if (st && (os.status || "") !== st) return false;
  if (!text) return true;

  const hay = [
    os.id,
    os.osNumber,
    os.ownerUid,
    os.equipamentoTipo,
    os.equipamentoModelo,
    os.problema,
    os.status
  ].filter(Boolean).join(" ").toLowerCase();

  return hay.includes(text);
}

function formatDate(ts) {
  try {
    return ts?.toDate ? ts.toDate().toLocaleString() : "—";
  } catch {
    return "—";
  }
}

function renderList() {
  const filtered = osCache.filter(matchesFilter);
  counter.textContent = `${filtered.length} OS`;
  allOs.innerHTML = "";

  if (filtered.length === 0) {
    allOs.innerHTML = `<div class="item"><div class="sub">Nada encontrado com os filtros atuais.</div></div>`;
    return;
  }

  filtered.forEach((os) => {
    const div = document.createElement("div");
    div.className = "item" + (os.id === selectedId ? " active" : "");

    div.innerHTML = `
      <div class="top">
        <div class="id">#${os.osNumber || os.id}</div>
        <div class="st">${os.status || "—"}</div>
      </div>
      <div class="sub">${os.equipamentoTipo || "Equipamento"} • ${os.equipamentoModelo || ""}</div>
      <div class="meta">Atualizado: ${formatDate(os.updatedAt)} • ownerUid: ${os.ownerUid || "—"}</div>
    `;

    div.addEventListener("click", () => {
      selectOS(os);
      renderList();
    });

    allOs.appendChild(div);
  });
}

function selectOS(os) {
  selectedId = os.id;

  osDocId.value = os.id;
  ownerUid.value = os.ownerUid || "";
  equipamentoTipo.value = os.equipamentoTipo || "";
  equipamentoModelo.value = os.equipamentoModelo || "";
  problema.value = os.problema || "";
  statusUpdate.value = os.status || "Recebido";

  selectedBox.style.display = "flex";
  selectedTitle.textContent = `OS #${os.osNumber || os.id}`;
  selectedSub.textContent = `${os.equipamentoTipo || "Equipamento"} • ${os.equipamentoModelo || ""}`;
  selectedStatus.textContent = os.status || "—";
}

searchInput.addEventListener("input", renderList);
statusFilter.addEventListener("change", renderList);

// ===== Auth + role + realtime list =====
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  techEmail.textContent = user.email;

  const uSnap = await getDoc(doc(db, "users", user.uid));
  const role = uSnap.exists() ? uSnap.data().role : "cliente";

  if (role !== "tecnico") {
    alert("Acesso negado: esta página é apenas para técnico.");
    window.location.href = "dashboard.html";
    return;
  }

  const qOs = query(collection(db, "ordensServico"), orderBy("updatedAt", "desc"));

  onSnapshot(
    qOs,
    (snap) => {
      osCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      lastUpdate.textContent = `Atualizado agora • ${new Date().toLocaleTimeString()}`;

      if (selectedId) {
        const current = osCache.find((x) => x.id === selectedId);
        if (current) selectOS(current);
      }

      renderList();
    },
    (err) => {
      console.error("Erro ao listar OS:", err);
      alert("Erro ao listar OS. Veja o Console (F12).");
    }
  );
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// ===== Criar OS + histórico inicial =====
createBtn.addEventListener("click", async () => {
  if (!ownerUid.value.trim()) {
    alert("Busque o cliente por email ou preencha o UID.");
    return;
  }

  try {
    const newDoc = await addDoc(collection(db, "ordensServico"), {
      osNumber: genOsNumber(),
      ownerUid: ownerUid.value.trim(),
      equipamentoTipo: equipamentoTipo.value.trim() || "Notebook",
      equipamentoModelo: equipamentoModelo.value.trim() || "—",
      problema: problema.value.trim() || "—",
      status: status.value,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await registrarHistorico(newDoc.id, { status: status.value, note: "OS criada" });

    alert("OS criada! docId: " + newDoc.id);
    osDocId.value = newDoc.id;
  } catch (err) {
    alert("Erro ao criar OS: " + (err?.message || err));
  }
});

// ===== Atualizar status + histórico + EMAIL =====
updateBtn.addEventListener("click", async () => {
  const id = osDocId.value.trim();
  if (!id) {
    alert("Selecione uma OS na lista.");
    return;
  }

  const noteText = (statusNote.value || "").trim();

  try {
    // 1) Atualiza OS
    await updateDoc(doc(db, "ordensServico", id), {
      status: statusUpdate.value,
      updatedAt: serverTimestamp()
    });

    // 2) Histórico
    await registrarHistorico(id, {
      status: statusUpdate.value,
      note: noteText
    });

    // 3) Pega dados da OS e do cliente
    const osSnap = await getDoc(doc(db, "ordensServico", id));
    const osData = osSnap.data();

    if (!osData?.ownerUid) throw new Error("OS sem ownerUid.");

    const userSnap = await getDoc(doc(db, "users", osData.ownerUid));
    const userData = userSnap.data();

    if (!userData?.email) throw new Error("Cliente sem email no Firestore (users/{uid}).");

    // 4) Envia email via EmailJS
    const templateParams = {
      to_email: userData.email,
      client_name: userData.nome || "Cliente",
      os_number: osData.osNumber || id,
      equipamento: `${osData.equipamentoTipo || "Equipamento"} ${osData.equipamentoModelo || ""}`.trim(),
      status: statusUpdate.value,
      note: noteText
    };

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);

    statusNote.value = "";
    alert("Status atualizado e email enviado ✅");

  } catch (err) {
    console.error(err);
    alert("Erro: " + (err?.message || err));
  }
});