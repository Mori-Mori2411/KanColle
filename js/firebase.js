/* ============================================================
   firebase.js — Firebaseとの接続・Googleログイン管理
   ここを変更することはほぼない。設定値を差し替えるだけ。
   ============================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as fbSignOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ============================================================
// ★ここにFirebaseの設定を貼り付けてください★
// Firebase Console > プロジェクト設定 > マイアプリ > firebaseConfig
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyC_RR7YYqhTH_KAMCTyTsfywGD8oZDxvUE",
  authDomain: "kancolle-ffc54.firebaseapp.com",
  projectId: "kancolle-ffc54",
  storageBucket: "kancolle-ffc54.firebasestorage.app",
  messagingSenderId: "856812672764",
  appId: "1:856812672764:web:8d22fb885de6b552d96979"
};
// ============================================================

// --- Firebase初期化 ---
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// 設定済みかチェック（YOUR_が残っていたら未設定）
const isConfigured = !firebaseConfig.apiKey.includes('YOUR_');

// --- Googleログイン ---
async function signIn() {
  if (!isConfigured) {
    if (window.showToast) window.showToast('Firebase設定が必要です');
    return;
  }
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

// --- ログアウト ---
async function signOut() {
  await fbSignOut(auth);
}

// --- auth・db・関数をまとめてエクスポート ---
// export した値は他のJSファイルから import して使える
export { auth, db, isConfigured, signIn, signOut, onAuthStateChanged };
