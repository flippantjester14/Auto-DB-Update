import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyD3IiHpjPTXymWh-3xZXsix_XwAmacFNJw",
    authDomain: "auto-db--updater.firebaseapp.com",
    projectId: "auto-db--updater",
    storageBucket: "auto-db--updater.firebasestorage.app",
    messagingSenderId: "704760564841",
    appId: "1:704760564841:web:b38b3bca9bacacaecd66f8",
    measurementId: "G-YC2PBK5EQS"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
