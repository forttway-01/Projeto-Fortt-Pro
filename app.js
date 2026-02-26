import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
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
const actionBtn = document.getElementById("actionBtn");
const toggleLink = document.getElementById("toggleLink");
const toggleMessage = document.getElementById("toggleMessage");
const formTitle = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");
const nameField = document.getElementById("nameField");

let isLogin = true;
nameField.style.display = "none";

toggleLink.addEventListener("click", (e) => {
  e.preventDefault();
  isLogin = !isLogin;

  if (isLogin) {
    formTitle.textContent = "Bem-vindo";
    formSubtitle.textContent = "Acesse sua conta";
    actionBtn.textContent = "Entrar";
    toggleMessage.textContent = "Não tem conta?";
    toggleLink.textContent = "Criar conta";
    nameField.style.display = "none";
  } else {
    formTitle.textContent = "Criar Conta";
    formSubtitle.textContent = "Preencha os dados abaixo";
    actionBtn.textContent = "Cadastrar";
    toggleMessage.textContent = "Já tem conta?";
    toggleLink.textContent = "Fazer login";
    nameField.style.display = "block";
  }
});

actionBtn.addEventListener("click", async () => {
  const nome = document.getElementById("nome")?.value?.trim() || "";
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;

  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, senha);
      window.location.href = "dashboard.html";
      return;
    }

    // cadastro
    const cred = await createUserWithEmailAndPassword(auth, email, senha);

    // cria perfil (default: cliente)
    await setDoc(doc(db, "users", cred.user.uid), {
      nome: nome || "Cliente",
      email,
      role: "cliente",
      createdAt: serverTimestamp()
    });

    alert("Conta criada! Agora é só entrar.");
    isLogin = true;
    formTitle.textContent = "Bem-vindo";
    formSubtitle.textContent = "Acesse sua conta";
    actionBtn.textContent = "Entrar";
    toggleMessage.textContent = "Não tem conta?";
    toggleLink.textContent = "Criar conta";
    nameField.style.display = "none";
  } catch (err) {
    alert("Erro: " + (err?.message || err));
  }
});