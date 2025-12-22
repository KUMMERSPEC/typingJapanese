import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// --- DOM Element References ---
document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('googleBtn');
    const emailBtn = document.getElementById('emailBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const emailModal = document.getElementById('emailModal');
    const emailLoginForm = document.getElementById('emailLoginForm');
    const closeModalBtn = emailModal ? emailModal.querySelector('.close-btn') : null;

    // --- UI Management ---
    function show(el) { if (el) el.style.display = 'inline-flex'; }
    function hide(el) { if (el) el.style.display = 'none'; }

    // Listen for auth state changes to update UI
    onAuthStateChanged(auth, user => {
        if (user) {
            // User is signed in
            hide(googleBtn);
            hide(emailBtn);
            show(logoutBtn);
        } else {
            // User is signed out
            show(googleBtn);
            show(emailBtn);
            hide(logoutBtn);
        }
    });

    // --- Event Listeners ---

    // Google Sign-In
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            signInWithPopup(auth, googleProvider).catch(error => {
                console.error("Google sign-in error", error);
                alert(`Google登录失败: ${error.message}`);
            });
        });
    }

    // Show Email Sign-In Modal
    if (emailBtn) {
        emailBtn.addEventListener('click', () => {
            if (emailModal) emailModal.classList.add('show');
        });
    }

    // Hide Email Sign-In Modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (emailModal) emailModal.classList.remove('show');
        });
    }
    // Also hide on overlay click
    if (emailModal) {
        emailModal.addEventListener('click', (e) => {
            if (e.target === emailModal) {
                emailModal.classList.remove('show');
            }
        });
    }

    // Handle Email Login/Registration Form Submission
    if (emailLoginForm) {
        emailLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailLoginForm.email.value;
            const password = emailLoginForm.password.value;

            try {
                // Attempt to sign in
                await signInWithEmailAndPassword(auth, email, password);
                if (emailModal) emailModal.classList.remove('show');
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    // If user doesn't exist, ask to create a new account
                    if (confirm('该邮箱未注册，是否要创建新账户？')) {
                        try {
                            await createUserWithEmailAndPassword(auth, email, password);
                            if (emailModal) emailModal.classList.remove('show');
                        } catch (createError) {
                            console.error("Account creation error", createError);
                            alert(`账户创建失败: ${createError.message}`);
                        }
                    }
                } else {
                    // Other errors (wrong password, etc.)
                    console.error("Sign-in error", error);
                    alert(`登录失败: ${error.message}`);
                }
            }
        });
    }

    // Handle Sign-Out
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch(error => {
                console.error("Sign-out error", error);
            });
        });
    }
});

