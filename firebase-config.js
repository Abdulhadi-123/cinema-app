import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC...", // مفتاحك الخاص بـ Firebase
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.db = db;
window.doc = doc;
window.setDoc = setDoc;
window.getDoc = getDoc;

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("خطأ تسجيل الدخول:", error);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("خطأ تسجيل الخروج:", error);
    }
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.currentUser = user;
    if (loginBtn) loginBtn.classList.add('d-none');
    if (userInfo) userInfo.classList.remove('d-none');
    if (userAvatar) userAvatar.src = user.photoURL || '';
    if (userName) userName.textContent = user.displayName || 'مستخدم';
    if (window.syncUserDataFromCloud) window.syncUserDataFromCloud();
  } else {
    window.currentUser = null;
    if (loginBtn) loginBtn.classList.remove('d-none');
    if (userInfo) userInfo.classList.add('d-none');
    if (window.loadLocalFavorites) window.loadLocalFavorites();
  }
});