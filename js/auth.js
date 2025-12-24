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

    // Google 登录 (Popup 方式，防重复点击)
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            if (googleBtn.disabled) return; // 防抖
            googleBtn.disabled = true;
            signInWithRedirect(auth, googleProvider)
                .catch(err => {
                    console.error('Google sign-in error', err);
                    alert(`Google 登录失败: ${err.message}`);
                })
                .finally(() => {
                    googleBtn.disabled = false;
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

    // 新的登录和注册按钮事件处理
    const emailLoginBtn = document.getElementById('emailLoginBtn');
    const emailRegisterBtn = document.getElementById('emailRegisterBtn');

    if (emailLoginBtn) {
        emailLoginBtn.addEventListener('click', async () => {
            const email = emailLoginForm.email.value;
            const password = emailLoginForm.password.value;
            if (!email || !password) {
                alert('请输入邮箱和密码。');
                return;
            }
            try {
                await signInWithEmailAndPassword(auth, email, password);
                if (emailModal) emailModal.classList.remove('show');
            } catch (error) {
                console.error("Sign-in error", error);
                if (error.code === 'auth/user-not-found') {
                    alert('该邮箱未注册，请先注册。');
                } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    alert('密码错误。');
                } else {
                    alert(`登录失败: ${error.message}`);
                }
            }
        });
    }

    if (emailRegisterBtn) {
        emailRegisterBtn.addEventListener('click', async () => {
            const email = emailLoginForm.email.value;
            const password = emailLoginForm.password.value;
            if (!email || !password) {
                alert('请输入邮箱和密码。');
                return;
            }
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                if (emailModal) emailModal.classList.remove('show');
                alert('注册成功！已自动登录。');
            } catch (error) {
                console.error("Account creation error", error);
                if (error.code === 'auth/email-already-in-use') {
                    alert('该邮箱已被注册，请直接登录。');
                } else if (error.code === 'auth/weak-password') {
                    alert('密码太弱，请使用至少6位字符。');
                } else {
                    alert(`注册失败: ${error.message}`);
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