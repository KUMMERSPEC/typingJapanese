// js/firebase-init.js - Centralized Firebase Initialization

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteField, collection, writeBatch, getDocs, query, where, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCaqffy_xL2RqNjIrtIBT0Wbe-mpUADKH8",
  authDomain: "typinglanguage.firebaseapp.com",
  projectId: "typinglanguage",
  storageBucket: "typinglanguage.appspot.com",
  messagingSenderId: "804802637246",
  appId: "1:804802637246:web:0d6e540604c9d8fb179def",
  measurementId: "G-W4X986PRJS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export all services and functions in a single object
const firebaseServices = {
  auth, 
  db, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  doc, 
  getDoc, 
  setDoc, 
  deleteField, 
  collection, 
  writeBatch, 
  getDocs, 
  query, 
  where, 
  deleteDoc,
  onSnapshot
};

// Make it globally available for convenience in other modules
window.firebaseServices = firebaseServices;

export default firebaseServices;
