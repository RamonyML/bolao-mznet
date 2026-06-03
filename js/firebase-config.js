import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjkSFnOSpA2L8qH16Hnk6n-4hmliLIbbw",
  authDomain: "bolao-mz.firebaseapp.com",
  projectId: "bolao-mz",
  storageBucket: "bolao-mz.firebasestorage.app",
  messagingSenderId: "278105914300",
  appId: "1:278105914300:web:2fe43663eda2287ad509b9",
  measurementId: "G-ZBSW1487VQ",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

try {
  getAnalytics(app);
} catch {
  /* Analytics só em HTTPS / produção */
}
