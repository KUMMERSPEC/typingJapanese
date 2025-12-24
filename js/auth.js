// 使用 index.html 中已经初始化的 Firebase 服务
let auth;

function initializeAuth() {
    if (window.firebaseServices) {
        auth = window.firebaseServices.auth;
    } else {
        setTimeout(initializeAuth, 100);
        return;
    }
    
    initAuthLogic();
}

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  RecaptchaVerifier
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

function initAuthLogic() {
    const googleProvider = new GoogleAuthProvider();
    const googleBtn = document.getElementById('googleBtn');
    const emailBtn = document.getElementById('emailBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const emailModal = document.getElementById('emailModal');
    const emailLoginForm = document.getElementById('emailLoginForm');
    const closeModalBtn = emailModal ? emailModal.querySelector('.close-btn') : null;

    function show(el) { if (el) el.style.display = 'inline-flex'; }
    function hide(el) { if (el) el.style.display = 'none'; }

    // 初始化 reCAPTCHA，并捕获潜在的加载错误
    try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible'
        });
        window.recaptchaVerifier.render().catch(err => {
            console.warn("[Auth] reCAPTCHA render failed. This might affect phone auth, but email/Google login should still work.", err);
        });
    } catch (err) {
        console.warn("[Auth] Failed to initialize RecaptchaVerifier. This is often due to network issues or ad-blockers.", err);
    }

    onAuthStateChanged(auth, user => {
        if (user) {
            hide(googleBtn);
            hide(emailBtn);
            show(logoutBtn);
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName) {
                userDisplayName.textContent = user.displayName || user.email;
                userDisplayName.style.display = 'inline';
            }
            if (typeof loadDataFromFirebase === 'function') {
                console.log('[Auth] User logged in, attempting to load data from Firebase.');
                loadDataFromFirebase();
            } else {
                console.error('[Auth] loadDataFromFirebase function not found!');
            }
        } else {
            show(googleBtn);
            show(emailBtn);
            hide(logoutBtn);
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName) {
                userDisplayName.style.display = 'none';
            }
        }
    });

    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            signInWithPopup(auth, googleProvider).catch(error => {
                console.error("Google sign-in error", error);
                alert(`Google登录失败: ${error.message}`);
            });
        });
    }

    if (emailBtn) {
        emailBtn.addEventListener('click', () => {
            if (emailModal) emailModal.classList.add('show');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (emailModal) emailModal.classList.remove('show');
        });
    }
    if (emailModal) {
        emailModal.addEventListener('click', (e) => {
            if (e.target === emailModal) {
                emailModal.classList.remove('show');
            }
        });
    }

    if (emailLoginForm) {
        emailLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailLoginForm.email.value;
            const password = emailLoginForm.password.value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                if (emailModal) emailModal.classList.remove('show');
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
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
                    console.error("Sign-in error", error);
                    alert(`登录失败: ${error.message}`);
                }
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch(error => {
                console.error("Sign-out error", error);
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});