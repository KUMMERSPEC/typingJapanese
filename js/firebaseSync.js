// js/firebaseSync.js - Using explicit initialization (dependency injection)

let db, auth, doc, getDoc, setDoc;

// An initialization function to be called from index.html
export function initFirebaseSync(firebaseServices) {
    if (!firebaseServices || !firebaseServices.db || !firebaseServices.auth) {
        console.error("[firebaseSync] Initialization failed: Invalid services object provided.");
        return;
    }
    console.log("[firebaseSync] Initializing with provided Firebase services.");
    db = firebaseServices.db;
    auth = firebaseServices.auth;
    doc = firebaseServices.doc;
    getDoc = firebaseServices.getDoc;
    setDoc = firebaseServices.setDoc;
}

async function loadDataFromFirebase() {
    if (!db || !auth) {
        console.error("[firebaseSync] Firebase services not initialized. Cannot load data.");
        return;
    }
    const user = auth.currentUser;
    if (!user) {
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
            console.log("[firebaseSync] No data found for this user in Firestore.");
        }
    } catch (error) {
        console.error("[firebaseSync] Error loading data from Firestore:", error);
    }
}

async function saveDataToFirebase(key, value) {
    if (!db || !auth) {
        console.error("[firebaseSync] Firebase services not initialized. Cannot save data.");
        return;
    }
    const user = auth.currentUser;
    if (!user) return;

    console.log(`[firebaseSync] Attempting to save data for user: ${user.uid} to Firestore`, { key });
    try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { [key]: value }, { merge: true });
        console.log(`[firebaseSync] Successfully saved key '${key}' to Firestore.`);
    } catch (error) {
        console.error(`[firebaseSync] Error saving key '${key}' to Firestore:`, error);
    }
}

function updateLocalStorage(cloudData) {
    if (!cloudData) return;
    let updated = false;
    for (const key in cloudData) {
        const remoteVal = cloudData[key];
        const remoteStr = typeof remoteVal === 'string' ? remoteVal : JSON.stringify(remoteVal);
        if (localStorage.getItem(key) !== remoteStr) {
            localStorage.setItem(key, remoteStr);
            updated = true;
        }
    }
    if (updated) {
        console.log("[firebaseSync] Local storage updated, dispatching event.");
        window.dispatchEvent(new CustomEvent('statisticsUpdated'));
    }
}

// Expose functions to global scope
window.loadDataFromFirebase = loadDataFromFirebase;
window.saveDataToFirebase = saveDataToFirebase;
// Provide a compatibility wrapper so other code can call window.firebaseSync.saveData(...)
window.firebaseSync = {
  saveData: saveDataToFirebase,
  loadData: loadDataFromFirebase
};
