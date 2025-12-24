// js/firebaseSync.js - Rewritten to use Firestore API

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let db;
let auth;

// A promise that resolves when Firebase services are ready
const firebaseReady = new Promise((resolve) => {
    function checkFirebaseServices() {
        if (window.firebaseServices && window.firebaseServices.db && window.firebaseServices.auth) {
            console.log("[firebaseSync] Firebase services are ready.");
            db = window.firebaseServices.db; // This is a Firestore instance
            auth = window.firebaseServices.auth;
            resolve();
        } else {
            console.log("[firebaseSync] Waiting for Firebase services...");
            setTimeout(checkFirebaseServices, 100);
        }
    }
    checkFirebaseServices();
});

// --- Function to load data from Firestore ---
async function loadDataFromFirebase() {
    await firebaseReady; // Wait for initialization
    const user = auth.currentUser;
    if (!user) {
        console.log("[firebaseSync] User not logged in. Cannot load data.");
        return;
    }

    console.log(`[firebaseSync] Attempting to load data for user: ${user.uid} from Firestore.`);
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const cloudData = docSnap.data();
            console.log("[firebaseSync] Data successfully loaded from Firestore:", cloudData);
            updateLocalStorage(cloudData);
        } else {
            console.log("[firebaseSync] No data found for this user in Firestore. Local data will be used.");
        }
    } catch (error) {
        console.error("[firebaseSync] Error loading data from Firestore:", error);
    }
}

// --- Function to save data to Firestore ---
async function saveDataToFirebase(key, value) {
    await firebaseReady; // Wait for initialization
    const user = auth.currentUser;
    if (!user) {
        return; // Silently fail if not logged in
    }
    console.log(`[firebaseSync] Attempting to save data for user: ${user.uid} to Firestore`, { key });
    try {
        const userDocRef = doc(db, 'users', user.uid);
        // Use setDoc with { merge: true } to update or create fields without overwriting the whole document
        await setDoc(userDocRef, { [key]: value }, { merge: true });
        console.log(`[firebaseSync] Successfully saved key '${key}' to Firestore.`);
    } catch (error) {
        console.error(`[firebaseSync] Error saving key '${key}' to Firestore:`, error);
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
                // Data from Firestore is already in the correct format, but local storage needs strings.
                const remoteValue = cloudData[key];
                const remoteDataString = typeof remoteValue === 'string' ? remoteValue : JSON.stringify(remoteValue);
                const localDataString = localStorage.getItem(key);

                if (localDataString !== remoteDataString) {
                    localStorage.setItem(key, remoteDataString);
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
