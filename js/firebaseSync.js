// js/firebaseSync.js - with added debugging and robust initialization

import {
    ref,
    get,
    set,
    child,
    getDatabase
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let db;
let auth;

// A promise that resolves when Firebase services are ready
const firebaseReady = new Promise((resolve) => {
    function checkFirebaseServices() {
        if (window.firebaseServices) {
            console.log("[firebaseSync] Firebase services are ready.");
            db = window.firebaseServices.db;
            auth = window.firebaseServices.auth;
            resolve();
        } else {
            console.log("[firebaseSync] Waiting for Firebase services...");
            setTimeout(checkFirebaseServices, 100);
        }
    }
    checkFirebaseServices();
});

// --- Function to load data from Firebase ---
async function loadDataFromFirebase() {
    await firebaseReady; // Wait for initialization
    const user = auth.currentUser;
    if (!user) {
        console.log("[firebaseSync] User not logged in. Cannot load data.");
        return;
    }

    console.log(`[firebaseSync] Attempting to load data for user: ${user.uid}`);
    try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `users/${user.uid}/data`));
        if (snapshot.exists()) {
            const cloudData = snapshot.val();
            console.log("[firebaseSync] Data successfully loaded from Firebase:", cloudData);
            updateLocalStorage(cloudData);
        } else {
            console.log("[firebaseSync] No data found for this user in Firebase. Local data will be used.");
        }
    } catch (error) {
        console.error("[firebaseSync] Error loading data from Firebase:", error);
    }
}

// --- Function to save data to Firebase ---
async function saveDataToFirebase(key, value) {
    await firebaseReady; // Wait for initialization
    const user = auth.currentUser;
    if (!user) {
        return; // Silently fail if not logged in
    }
    console.log(`[firebaseSync] Attempting to save data for user: ${user.uid}`, { key, size: value?.length });
    try {
        await set(ref(db, `users/${user.uid}/data/${key}`), value);
        console.log(`[firebaseSync] Successfully saved key '${key}' to Firebase.`);
    } catch (error) {
        console.error(`[firebaseSync] Error saving key '${key}' to Firebase:`, error);
        throw error;
    }
}

// --- Function to update local storage with cloud data ---
function updateLocalStorage(cloudData) {
    if (!cloudData) {
        console.warn("[firebaseSync] Received null or undefined cloudData. Aborting update.");
        return;
    }

    console.log("[firebaseSync] Updating local storage with cloud data.", cloudData);
    let updated = false;
    for (const key in cloudData) {
        if (Object.hasOwnProperty.call(cloudData, key)) {
            try {
                const localData = localStorage.getItem(key);
                const remoteData = JSON.stringify(cloudData[key]);
                if (localData !== remoteData) {
                    localStorage.setItem(key, remoteData);
                    console.log(`[firebaseSync] Updated local storage for key: ${key}`);
                    updated = true;
                }
            } catch (e) {
                console.error(`[firebaseSync] Failed to update local storage for key: ${key}`, e);
            }
        }
    }

    if (updated) {
        console.log("[firebaseSync] Local storage has been updated. Dispatching 'statisticsUpdated' event.");
        window.dispatchEvent(new CustomEvent('statisticsUpdated'));
    } else {
        console.log("[firebaseSync] No local storage changes were necessary.");
    }
}

// Expose functions to global scope so other scripts can use them
window.loadDataFromFirebase = loadDataFromFirebase;
window.saveDataToFirebase = saveDataToFirebase;
