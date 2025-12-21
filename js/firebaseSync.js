// This module handles Firebase authentication and data synchronization.

document.addEventListener('DOMContentLoaded', () => {
    const { auth, db, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, doc, setDoc, getDoc, onSnapshot } = window.firebaseServices;

    const authButton = document.getElementById('authButton');
    const userDisplayName = document.getElementById('userDisplayName');

    let currentUser = null;
    let unsubscribeFromFirestore = null; // To store the listener unsub function

    // --- Authentication Logic ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            authButton.textContent = 'Logout';
            userDisplayName.textContent = `Welcome, ${user.displayName || 'User'}`;
            userDisplayName.style.display = 'inline';

            // Start listening for realtime data updates
            listenForData(user.uid);

        } else {
            // User is signed out
            currentUser = null;
            authButton.textContent = 'Login with Google';
            userDisplayName.style.display = 'none';

            // Stop listening to data updates
            if (unsubscribeFromFirestore) {
                unsubscribeFromFirestore();
            }
            // Here you might want to clear local data or reload the page
            // For now, we'll just stop listening.
        }
    });

    authButton.addEventListener('click', () => {
        if (currentUser) {
            // If user is logged in, log them out
            signOut(auth);
        } else {
            // If user is not logged in, show Google login popup
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider).catch(error => {
                console.error("Authentication failed:", error);
            });
        }
    });

    // --- Data Synchronization Logic ---

    // Function to listen for realtime data from Firestore
    function listenForData(userId) {
        const userDocRef = doc(db, 'users', userId);

        unsubscribeFromFirestore = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                console.log("Received data from cloud:", cloudData);

                // Update localStorage with cloud data
                if (cloudData.custom_collections) {
                    localStorage.setItem('custom_collections', cloudData.custom_collections);
                }
                if (cloudData.typing_statistics) {
                    localStorage.setItem('typing_statistics', cloudData.typing_statistics);
                }

                // Dispatch events to notify other modules to update their views
                window.dispatchEvent(new CustomEvent('collectionsUpdated'));
                window.dispatchEvent(new CustomEvent('statisticsUpdated'));

            } else {
                console.log("No data in cloud for this user yet. Will upload local data.");
                // If no data exists, upload local data to the cloud
                uploadAllData(userId);
            }
        });
    }

    // Function to save all local data to Firestore
    async function uploadAllData(userId) {
        if (!userId) return;
        console.log("Uploading all local data to Firestore...");
        try {
            const userDocRef = doc(db, 'users', userId);
            const localCollections = localStorage.getItem('custom_collections') || '{}';
            const localStats = localStorage.getItem('typing_statistics') || '{}';

            await setDoc(userDocRef, {
                custom_collections: localCollections,
                typing_statistics: localStats,
                lastUpdated: new Date().toISOString()
            }, { merge: true }); // Merge to avoid overwriting with empty data

            console.log("Local data uploaded successfully.");
        } catch (error) {
            console.error("Error uploading data:", error);
        }
    }

    // Function to save a specific piece of data (e.g., collections)
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
