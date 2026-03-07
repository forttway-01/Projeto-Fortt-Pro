import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   CONFIG FIREBASE
========================= */

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
const db = getFirestore(app);

/* =========================
   HELPERS
========================= */

const $ = (id) => document.getElementById(id);

const STATUS_LIST = [
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

function progressoPorStatus(statusStr) {

  const idx = STATUS_LIST.indexOf(statusStr);

  if (idx < 0) return 0;

  return Math.round((idx / (STATUS_LIST.length - 1)) * 100);

}

function fmtDate(ts) {

  try {

    if (!ts) return "—";

    const d = ts.toDate ? ts.toDate() : new Date(ts);

    return d.toLocaleString("pt-BR");

  } catch {

    return "—";

  }

}

function safe(value) {

  if (value === undefined || value === null || value === "") return "—";

  return String(value);

}

/* =========================
   RENDERIZAR ORDEM
========================= */

async function renderOrder(docId, data) {

  $("result").classList.remove("hidden");

  $("osTitulo").textContent = `Ordem ${safe(data.osNumber || docId)}`;

  $("osSub").textContent = `Código: ${safe(data.publicToken)}`;

  $("badgeStatus").textContent = safe(data.status);

  $("clienteNome").textContent = safe(data.clienteNome);

  $("equipamento").textContent =
    `${safe(data.equipamentoTipo)} ${safe(data.equipamentoModelo)}`;

  $("tecnico").textContent = safe(data.tecnicoEmail);

  $("updatedAt").textContent = fmtDate(data.updatedAt);

  const progresso = Number(
    data.progresso !== undefined && data.progresso !== null
      ? data.progresso
      : progressoPorStatus(data.status)
  );

  $("pct").textContent = `${progresso}%`;

  /* animação da barra */

  $("bar").style.width = "0%";

  setTimeout(() => {

    $("bar").style.width = `${progresso}%`;

  }, 150);

  await carregarHistorico(docId);

}

/* =========================
   CARREGAR HISTÓRICO
========================= */

async function carregarHistorico(docId) {

  const box = $("historyList");

  box.innerHTML = "";

  try {

    const histRef = collection(db, "ordensServico", docId, "historico");

    const histQuery = query(histRef, orderBy("at", "desc"));

    const histSnap = await getDocs(histQuery);

    if (histSnap.empty) {

      box.innerHTML = `<div class="muted">Sem histórico ainda.</div>`;

      return;

    }

    histSnap.docs.forEach((docSnap, index) => {

      const h = docSnap.data();

      const div = document.createElement("div");

      div.className = "hItem";

      div.innerHTML = `
        <div class="hRow">
          <div class="hSt">${safe(h.status)}</div>
          <div class="hDt">${fmtDate(h.at)}</div>
        </div>
        <div class="hNote">${safe(h.note)}</div>
      `;

      /* animação em cascata */

      div.style.animationDelay = `${index * 0.15}s`;

      box.appendChild(div);

    });

  } catch (error) {

    console.error("Erro ao carregar histórico:", error);

    box.innerHTML =
      `<div class="muted">Não foi possível carregar o histórico.</div>`;

  }

}

/* =========================
   BUSCAR ORDEM
========================= */

async function buscar(token) {

  $("msg").className = "msg";

  $("msg").textContent = "Buscando...";

  $("result").classList.add("hidden");

  try {

    const q = query(
      collection(db, "ordensServico"),
      where("publicToken", "==", token)
    );

    const snap = await getDocs(q);

    if (snap.empty) {

      $("msg").classList.add("bad");

      $("msg").textContent = "Código não encontrado.";

      return;

    }

    const docSnap = snap.docs[0];

    const data = docSnap.data();

    $("msg").classList.add("ok");

    $("msg").textContent = "Ordem encontrada ✔";

    await renderOrder(docSnap.id, data);

  } catch (error) {

    console.error("Erro ao buscar ordem:", error);

    $("msg").classList.add("bad");

    $("msg").textContent = "Erro ao consultar a ordem.";

  }

}

/* =========================
   LER TOKEN DA URL
========================= */

function getTokenFromURL() {

  const params = new URLSearchParams(window.location.search);

  return params.get("token");

}

/* =========================
   BOTÃO BUSCAR
========================= */

document.getElementById("btnBuscar")
.addEventListener("click", () => {

  const token = $("tokenInput").value.trim();

  if (!token) {

    $("msg").className = "msg bad";

    $("msg").textContent = "Digite um código válido.";

    return;

  }

  buscar(token);

});

/* =========================
   ENTER NO INPUT
========================= */

document.getElementById("tokenInput")
.addEventListener("keydown", (e) => {

  if (e.key === "Enter") {

    const token = $("tokenInput").value.trim();

    if (!token) {

      $("msg").className = "msg bad";

      $("msg").textContent = "Digite um código válido.";

      return;

    }

    buscar(token);

  }

});

/* =========================
   AUTO BUSCA PELA URL
========================= */

window.addEventListener("DOMContentLoaded", () => {

  const token = getTokenFromURL();

  if (token) {

    $("tokenInput").value = token;

    buscar(token);

  }

  document.getElementById("year").textContent =
    new Date().getFullYear();

});