import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* =========================
   FIREBASE
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
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   EMAILJS
   TROQUE ESTES 3 VALORES
   ========================= */
const EMAILJS_PUBLIC_KEY = "pKHqEcnhHeXgu3pHC";
const EMAILJS_SERVICE_ID = "service_1en81so";
const EMAILJS_TEMPLATE_ID = "template_kc2jufc";

if (window.emailjs) {
  window.emailjs.init({
    publicKey: EMAILJS_PUBLIC_KEY
  });
}

/* =========================
   ELEMENTOS
   ========================= */
const techEmail = document.getElementById("techEmail");
const logoutBtn = document.getElementById("logoutBtn");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const counter = document.getElementById("counter");
const lastUpdate = document.getElementById("lastUpdate");
const allOs = document.getElementById("allOs");

const selectedBox = document.getElementById("selectedBox");
const selectedTitle = document.getElementById("selectedTitle");
const selectedSub = document.getElementById("selectedSub");
const selectedStatus = document.getElementById("selectedStatus");

const clienteNome = document.getElementById("clienteNome");
const clienteEmail = document.getElementById("clienteEmail");
const clienteTelefone = document.getElementById("clienteTelefone");
const equipamentoTipo = document.getElementById("equipamentoTipo");
const equipamentoModelo = document.getElementById("equipamentoModelo");
const problema = document.getElementById("problema");
const status = document.getElementById("status");
const createBtn = document.getElementById("createBtn");

const linkGerado = document.getElementById("linkGerado");
const copyLinkBtn = document.getElementById("copyLinkBtn");

const osDocId = document.getElementById("osDocId");
const statusUpdate = document.getElementById("statusUpdate");
const statusNote = document.getElementById("statusNote");
const updateBtn = document.getElementById("updateBtn");

/* =========================
   ESTADO
   ========================= */
let tecnicoLogado = null;
let todasAsOS = [];

/* =========================
   STATUS E PROGRESSO
   ========================= */
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

/* =========================
   HELPERS
   ========================= */
function gerarTokenOS() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "OS-";
  for (let i = 0; i < 10; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function gerarNumeroOS() {
  return "FP-" + Date.now().toString().slice(-6);
}

function formatarData(ts) {
  try {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

function limparFormularioCriacao() {
  clienteNome.value = "";
  clienteEmail.value = "";
  clienteTelefone.value = "";
  equipamentoTipo.value = "";
  equipamentoModelo.value = "";
  problema.value = "";
  status.value = "Recebido";
}

function preencherSelecionada(d) {
  selectedBox.style.display = "flex";
  selectedTitle.textContent = `#${d.osNumber || d.id}`;
  selectedSub.textContent = `${d.clienteNome || "Sem nome"} • ${d.equipamentoTipo || "Equipamento"} ${d.equipamentoModelo || ""}`;
  selectedStatus.textContent = d.status || "—";

  osDocId.value = d.id || "";
  statusUpdate.value = d.status || "Recebido";

  clienteNome.value = d.clienteNome || "";
  clienteEmail.value = d.clienteEmail || "";
  clienteTelefone.value = d.clienteTelefone || "";
  equipamentoTipo.value = d.equipamentoTipo || "";
  equipamentoModelo.value = d.equipamentoModelo || "";
  problema.value = d.problema || "";

  if (d.publicToken) {
    linkGerado.value = `${window.location.origin}/rastreio.html?token=${d.publicToken}`;
  } else {
    linkGerado.value = "";
  }
}

function aplicarFiltros() {
  const termo = (searchInput.value || "").toLowerCase().trim();
  const filtroStatus = statusFilter.value;

  const filtradas = todasAsOS.filter((d) => {
    const texto = `
      ${d.osNumber || ""}
      ${d.clienteNome || ""}
      ${d.clienteEmail || ""}
      ${d.clienteTelefone || ""}
      ${d.equipamentoTipo || ""}
      ${d.equipamentoModelo || ""}
      ${d.problema || ""}
      ${d.publicToken || ""}
    `.toLowerCase();

    const bateTexto = !termo || texto.includes(termo);
    const bateStatus = !filtroStatus || d.status === filtroStatus;

    return bateTexto && bateStatus;
  });

  renderLista(filtradas);
}

function renderLista(lista) {
  allOs.innerHTML = "";
  counter.textContent = `${lista.length} OS`;

  if (!lista.length) {
    allOs.innerHTML = `
      <div class="item">
        <div class="sub">Nenhuma OS encontrada.</div>
      </div>
    `;
    return;
  }

  lista.forEach((d) => {
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <div class="top">
        <div class="id">#${d.osNumber || d.id}</div>
        <div class="st">${d.status || "—"}</div>
      </div>
      <div class="sub">${d.clienteNome || "Sem nome"} • ${d.equipamentoTipo || "Equipamento"} ${d.equipamentoModelo || ""}</div>
      <div class="meta">${d.publicToken || "Sem token"} • ${formatarData(d.updatedAt)}</div>
    `;

    div.addEventListener("click", () => {
      document.querySelectorAll(".item").forEach((el) => el.classList.remove("active"));
      div.classList.add("active");
      preencherSelecionada(d);
    });

    allOs.appendChild(div);
  });

  lastUpdate.textContent = `Atualizado em ${new Date().toLocaleTimeString("pt-BR")}`;
}

/* =========================
   ENVIAR EMAIL
   ========================= */
async function enviarEmailAtualizacao(osData, novoStatus, observacao, link) {
  if (!osData.clienteEmail) return;

  if (
    !EMAILJS_PUBLIC_KEY ||
    EMAILJS_PUBLIC_KEY === "COLE_SUA_PUBLIC_KEY_AQUI" ||
    !EMAILJS_SERVICE_ID ||
    EMAILJS_SERVICE_ID === "COLE_SEU_SERVICE_ID_AQUI" ||
    !EMAILJS_TEMPLATE_ID ||
    EMAILJS_TEMPLATE_ID === "COLE_SEU_TEMPLATE_ID_AQUI"
  ) {
    console.warn("EmailJS não configurado ainda.");
    return;
  }

  const numeroOS = osData.osNumber || osData.id || "Sem número";
  const observacaoFinal = observacao?.trim()
    ? observacao.trim()
    : "Sua ordem de serviço recebeu uma nova atualização.";

  const equipamentoFinal =
    `${osData.equipamentoTipo || ""} ${osData.equipamentoModelo || ""}`.trim() || "Equipamento não informado";

  const params = {
    to_email: osData.clienteEmail,
    cliente_nome: osData.clienteNome || "Cliente",
    os_numero: numeroOS,
    status: novoStatus,
    observacao: observacaoFinal,
    equipamento: equipamentoFinal,
    link_rastreio: link,
    tecnico_email: tecnicoLogado?.email || ""
  };

  console.log("Enviando email com os dados:", params);

  await window.emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    params
  );
}

/* =========================
   CRIAR OS
   ========================= */
async function criarOS() {
  const nome = clienteNome.value.trim();
  const email = clienteEmail.value.trim();
  const telefone = clienteTelefone.value.trim();
  const tipo = equipamentoTipo.value.trim();
  const modelo = equipamentoModelo.value.trim();
  const defeito = problema.value.trim();
  const statusInicial = status.value;
  const token = gerarTokenOS();
  const numero = gerarNumeroOS();
  const progressoInicial = progressoPorStatus(statusInicial);

  if (!nome) {
    alert("Preencha o nome do cliente.");
    clienteNome.focus();
    return;
  }

  if (!email) {
    alert("Preencha o email do cliente.");
    clienteEmail.focus();
    return;
  }

  if (!tipo) {
    alert("Preencha o tipo do equipamento.");
    equipamentoTipo.focus();
    return;
  }

  if (!modelo) {
    alert("Preencha o modelo.");
    equipamentoModelo.focus();
    return;
  }

  if (!defeito) {
    alert("Preencha o problema.");
    problema.focus();
    return;
  }

  createBtn.disabled = true;
  createBtn.textContent = "Criando...";

  try {
    const osRef = await addDoc(collection(db, "ordensServico"), {
      osNumber: numero,
      clienteNome: nome,
      clienteEmail: email,
      clienteTelefone: telefone,
      equipamentoTipo: tipo,
      equipamentoModelo: modelo,
      problema: defeito,
      status: statusInicial,
      progresso: progressoInicial,
      tecnicoEmail: tecnicoLogado?.email || "",
      publicToken: token,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await addDoc(collection(db, "ordensServico", osRef.id, "historico"), {
      status: statusInicial,
      note: "Equipamento recebido e OS criada no sistema.",
      at: serverTimestamp()
    });

    const link = `${window.location.origin}/rastreio.html?token=${token}`;
    linkGerado.value = link;

    osDocId.value = osRef.id;
    statusUpdate.value = statusInicial;

    alert("OS criada com sucesso! Agora copie o link e envie para o cliente.");
    limparFormularioCriacao();
  } catch (error) {
    console.error(error);
    alert("Erro ao criar a OS. Veja o console.");
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = "Criar OS";
  }
}

/* =========================
   ATUALIZAR STATUS
   ========================= */
async function atualizarStatus() {
  const id = osDocId.value.trim();
  const novoStatus = statusUpdate.value;
  const observacao = statusNote.value.trim();
  const novoProgresso = progressoPorStatus(novoStatus);

  if (!id) {
    alert("Selecione uma OS na lista ou crie uma nova primeiro.");
    return;
  }

  updateBtn.disabled = true;
  updateBtn.textContent = "Atualizando...";

  try {
    const ref = doc(db, "ordensServico", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      alert("OS não encontrada.");
      return;
    }

    const osData = {
      id: snap.id,
      ...snap.data()
    };

    await updateDoc(ref, {
      status: novoStatus,
      progresso: novoProgresso,
      updatedAt: serverTimestamp()
    });

    await addDoc(collection(db, "ordensServico", id, "historico"), {
      status: novoStatus,
      note: observacao || "Status atualizado pelo técnico.",
      at: serverTimestamp()
    });

    const link = `${window.location.origin}/rastreio.html?token=${osData.publicToken}`;

    try {
      await enviarEmailAtualizacao(osData, novoStatus, observacao, link);
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      alert("Status atualizado, mas o email não foi enviado. Verifique a configuração do EmailJS.");
    }

    statusNote.value = "";
    alert("Status atualizado com sucesso!");
  } catch (error) {
    console.error(error);
    alert("Erro ao atualizar status. Veja o console.");
  } finally {
    updateBtn.disabled = false;
    updateBtn.textContent = "Atualizar Status + Enviar Email";
  }
}

/* =========================
   COPIAR LINK
   ========================= */
async function copiarLink() {
  const valor = linkGerado.value.trim();

  if (!valor) {
    alert("Ainda não existe link gerado.");
    return;
  }

  try {
    await navigator.clipboard.writeText(valor);
    alert("Link copiado!");
  } catch (error) {
    console.error(error);
    linkGerado.select();
    document.execCommand("copy");
    alert("Link copiado!");
  }
}

/* =========================
   LISTA EM TEMPO REAL
   ========================= */
function iniciarListaTempoReal() {
  const q = query(collection(db, "ordensServico"), orderBy("updatedAt", "desc"));

  onSnapshot(
    q,
    (snap) => {
      todasAsOS = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      aplicarFiltros();
    },
    (error) => {
      console.error(error);
      alert("Erro ao carregar as OS em tempo real.");
    }
  );
}

/* =========================
   AUTH
   ========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  tecnicoLogado = user;
  techEmail.textContent = user.email || "Técnico";
  iniciarListaTempoReal();
});

/* =========================
   EVENTOS
   ========================= */
createBtn.addEventListener("click", criarOS);
updateBtn.addEventListener("click", atualizarStatus);
copyLinkBtn.addEventListener("click", copiarLink);

searchInput.addEventListener("input", aplicarFiltros);
statusFilter.addEventListener("change", aplicarFiltros);

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});