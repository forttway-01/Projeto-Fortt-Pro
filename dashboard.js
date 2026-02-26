import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

// UI
const historyList = document.getElementById("historyList");
const userEmailEl = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const osListEl = document.getElementById("osList");

const osTitle = document.getElementById("osTitle");
const osMeta = document.getElementById("osMeta");
const statusText = document.getElementById("statusText");
const equipamentoEl = document.getElementById("equipamento");
const modeloEl = document.getElementById("modelo");
const problemaEl = document.getElementById("problema");
const progressBar = document.getElementById("progressBar");
const steps = document.querySelectorAll(".step");

// Fluxo de status
const STATUS = [
  "Recebido",
  "Em análise",
  "Aguardando aprovação",
  "Aguardando peça",
  "Em manutenção",
  "Em teste",
  "Finalizado",
  "Pronto para retirada",
  "Entregue"
];

function setProgressByStatus(statusStr) {
  const idx = Math.max(0, STATUS.indexOf(statusStr));
  const percent = (idx / (STATUS.length - 1)) * 100;
  progressBar.style.width = `${percent}%`;

  steps.forEach((el, i) => {
    if (i <= idx) el.classList.add("active");
    else el.classList.remove("active");
  });
}

function renderOSDetails(osDoc) {
  if (!osDoc) {
    osTitle.textContent = "Selecione uma OS";
    osMeta.textContent = "—";
    statusText.textContent = "—";
    equipamentoEl.textContent = "—";
    modeloEl.textContent = "—";
    problemaEl.textContent = "—";
    progressBar.style.width = "0%";
    steps.forEach((s) => s.classList.remove("active"));
    if (historyList) historyList.innerHTML = "";
    return;
  }

  osTitle.textContent = `Ordem de Serviço #${osDoc.osNumber || osDoc.id}`;
  osMeta.textContent = osDoc.updatedAt?.toDate
    ? `Atualizado em: ${osDoc.updatedAt.toDate().toLocaleString()}`
    : "—";

  statusText.textContent = osDoc.status || "—";
  equipamentoEl.textContent = osDoc.equipamentoTipo || "—";
  modeloEl.textContent = osDoc.equipamentoModelo || "—";
  problemaEl.textContent = osDoc.problema || "—";

  setProgressByStatus(osDoc.status || STATUS[0]);
}

// Listeners
let unsubscribeList = null;
let unsubscribeSelected = null;
let unsubscribeHistory = null;

// ✅ Função correta: assina o histórico de UMA OS
function subscribeHistory(osId) {
  if (!historyList) return;

  // Para o histórico anterior
  if (unsubscribeHistory) unsubscribeHistory();

  const hq = query(
    collection(db, "ordensServico", osId, "historico"),
    orderBy("at", "desc"),
    limit(30)
  );

  unsubscribeHistory = onSnapshot(
    hq,
    (snap) => {
      historyList.innerHTML = "";

      if (snap.empty) {
        historyList.innerHTML = `
          <div class="history-item">
            <div class="note">Sem histórico ainda.</div>
          </div>`;
        return;
      }

      snap.forEach((d) => {
        const h = d.data();

        const dataFormatada = h.at?.toDate
          ? h.at.toDate().toLocaleString()
          : "—";

        const div = document.createElement("div");
        div.className = "history-item";
        div.innerHTML = `
          <div class="row">
            <div class="st">${h.status || "—"}</div>
            <div class="dt">${dataFormatada}</div>
          </div>
          ${h.note ? `<div class="note">${h.note}</div>` : ""}
        `;

        historyList.appendChild(div);
      });
    },
    (err) => {
      console.error("Erro ao ler histórico:", err);
    }
  );
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  userEmailEl.textContent = user.email;

  // (Opcional) checar role
  const uSnap = await getDoc(doc(db, "users", user.uid));
  const role = uSnap.exists() ? uSnap.data().role : "cliente";
  // Você pode bloquear técnico aqui se quiser

  // Lista OS do cliente (tempo real)
  const q = query(
    collection(db, "ordensServico"),
    where("ownerUid", "==", user.uid)
  );

  if (unsubscribeList) unsubscribeList();

  unsubscribeList = onSnapshot(
    q,
    (snap) => {
      osListEl.innerHTML = "";

      if (snap.empty) {
        osListEl.innerHTML = `<div class="os-item"><div class="eq">Nenhuma OS ainda. Fale com a assistência.</div></div>`;
        renderOSDetails(null);
        return;
      }

      // Render lista
      snap.forEach((docSnap) => {
        const d = docSnap.data();

        const div = document.createElement("div");
        div.className = "os-item";
        div.innerHTML = `
          <div class="top">
            <div class="id">#${d.osNumber || docSnap.id}</div>
            <div class="st">${d.status || "—"}</div>
          </div>
          <div class="eq">${d.equipamentoTipo || "Equipamento"} • ${d.equipamentoModelo || ""}</div>
        `;

        div.addEventListener("click", () => {
          // ✅ Para listener anterior da OS
          if (unsubscribeSelected) unsubscribeSelected();

          // ✅ Assina a OS selecionada
          unsubscribeSelected = onSnapshot(
            doc(db, "ordensServico", docSnap.id),
            (osSnap) => {
              if (osSnap.exists()) {
                renderOSDetails({ ...osSnap.data(), id: osSnap.id });
              }
            },
            (err) => console.error("Erro ao ler OS:", err)
          );

          // ✅ Assina histórico da OS selecionada
          subscribeHistory(docSnap.id);
        });

        osListEl.appendChild(div);
      });

      // ✅ Auto-seleciona a primeira OS
      const first = snap.docs[0];
      if (first) {
        if (unsubscribeSelected) unsubscribeSelected();

        unsubscribeSelected = onSnapshot(
          doc(db, "ordensServico", first.id),
          (osSnap) => {
            if (osSnap.exists()) {
              renderOSDetails({ ...osSnap.data(), id: osSnap.id });
            }
          },
          (err) => console.error("Erro ao ler primeira OS:", err)
        );

        // ✅ Auto carrega histórico também
        subscribeHistory(first.id);
      }
    },
    (err) => {
      console.error("Erro ao listar OS:", err);
      alert("Erro ao listar OS. Veja o console (F12).");
    }
  );
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});