// This module handles Firebase authentication and data synchronization.

document.addEventListener('DOMContentLoaded', () => {
    const { auth, db, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, doc, setDoc, getDoc, onSnapshot } = window.firebaseServices;



    let currentUser = null;
    let unsubscribeFromFirestore = null; // To store the listener unsub function

    // --- Authentication Logic ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            // UI updates are handled by auth.js

            // ** NEW: Start the robust sync process **
            await syncData(user.uid);

        } else {
            // User is signed out
            currentUser = null;
            // UI updates are handled by auth.js

            // Stop listening to data updates
            if (unsubscribeFromFirestore) {
                unsubscribeFromFirestore();
                unsubscribeFromFirestore = null;
            }
            // Optional: Clear local storage on logout to prevent data conflicts
            // localStorage.removeItem('typing_statistics');
            // localStorage.removeItem('custom_collections');
        }
    });

    // The auth logic is now handled in auth.js

    // --- NEW Data Synchronization Logic (Refactored) ---

    async function syncData(userId) {
        console.log("Starting data synchronization process...");
        const userDocRef = doc(db, 'users', userId);

        try {
            // 1. One-time fetch from Firestore to get the most current data
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                // If cloud has data, it's the source of truth.
                console.log("Cloud data found. Overwriting local storage.");
                const cloudData = docSnap.data();
                updateLocalStorage(cloudData);
            } else {
                // If cloud has NO data, check if local storage has anything to upload.
                console.log("No cloud data found. Checking for local data to upload.");
                const localStats = localStorage.getItem('typing_statistics');
                const localCollections = localStorage.getItem('custom_collections');

                if (localStats || localCollections) {
                    await uploadAllData(userId, localCollections, localStats);
                }
            }

            // 2. Now, set up the realtime listener for subsequent changes from other devices.
            // Make sure to not have multiple listeners running.
            if (unsubscribeFromFirestore) {
                unsubscribeFromFirestore();
            }
            unsubscribeFromFirestore = onSnapshot(userDocRef, (snapshot) => {
                console.log("Realtime update received from cloud.");
                if (snapshot.exists()) {
                    const cloudData = snapshot.data();
                    updateLocalStorage(cloudData);
                } else {
                    console.log("Realtime update: User document was deleted.");
                }
            });

        } catch (error) {
            console.error("Error during initial data sync:", error);
        }
    }

    function updateLocalStorage(cloudData) {
        if (cloudData.custom_collections) {
            localStorage.setItem('custom_collections', cloudData.custom_collections);
        }
        if (cloudData.typing_statistics) {
            localStorage.setItem('typing_statistics', cloudData.typing_statistics);
        }

        // Dispatch events to notify other modules to update their views
        window.dispatchEvent(new CustomEvent('collectionsUpdated'));
        window.dispatchEvent(new CustomEvent('statisticsUpdated'));
        console.log("Local storage updated and UI events dispatched.");
    }

    async function uploadAllData(userId, localCollections, localStats) {
        if (!userId) return;
        console.log("Uploading all local data to Firestore for the first time...");
        try {
            const userDocRef = doc(db, 'users', userId);
            await setDoc(userDocRef, {
                custom_collections: localCollections || '{}',
                typing_statistics: localStats || '{}',
                lastUpdated: new Date().toISOString()
            });
            console.log("Local data uploaded successfully.");
        } catch (error) {
            console.error("Error uploading initial data:", error);
        }
    }

    async function saveDataToFirebase(key, value) {
        if (!currentUser) return; // Only save if a user is logged in

        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            await setDoc(userDocRef, {
                [key]: value,
                lastUpdated: new Date().toISOString()
            }, { merge: true }); // Use merge to only update the specified key
            console.log(`Successfully saved '${key}' to Firebase.`);
        } catch (error) {
            console.error(`Error saving '${key}' to Firebase:`, error);
        }
    }

    // Expose the saveDataToFirebase function to be used by other modules
    window.firebaseSync = {
        saveData: saveDataToFirebase
    };
});