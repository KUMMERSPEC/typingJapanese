// 使用 index.html 中已经初始化的 Firebase 服务
// 等待 Firebase 服务加载完成
let auth;

function initializeAuth() {
    if (window.firebaseServices) {
        auth = window.firebaseServices.auth;
    } else {
        // 如果服务还没加载，等待一下
        setTimeout(initializeAuth, 100);
        return;
    }
    
    // 开始初始化认证逻辑
    initAuthLogic();
}



// --- 认证逻辑初始化函数 ---
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

function initAuthLogic() {
    const googleProvider = new GoogleAuthProvider();
    const googleBtn = document.getElementById('googleBtn');
    const emailBtn = document.getElementById('emailBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const emailModal = document.getElementById('emailModal');
    const emailLoginForm = document.getElementById('emailLoginForm');
    const closeModalBtn = emailModal ? emailModal.querySelector('.close-btn') : null;

    // --- UI Management ---
    function show(el) { if (el) el.style.display = 'inline-flex'; }
    function hide(el) { if (el) el.style.display = 'none'; }

    // 监听认证状态变化，更新 UI
    onAuthStateChanged(auth, user => {
        if (user) {
            // 用户已登录
            hide(googleBtn);
            hide(emailBtn);
            show(logoutBtn);
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName) {
                userDisplayName.textContent = user.displayName || user.email;
                userDisplayName.style.display = 'inline';
            }
        } else {
            // 用户已登出
            show(googleBtn);
            show(emailBtn);
            hide(logoutBtn);
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName) {
                userDisplayName.style.display = 'none';
            }
        }
    });

    // --- 事件监听器 ---

    // Google 登录
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            signInWithPopup(auth, googleProvider).catch(error => {
                console.error("Google sign-in error", error);
                alert(`Google登录失败: ${error.message}`);
            });
        });
    }

    // 显示邮箱登录模态框
    if (emailBtn) {
        emailBtn.addEventListener('click', () => {
            if (emailModal) emailModal.classList.add('show');
        });
    }

    // 隐藏邮箱登录模态框
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (emailModal) emailModal.classList.remove('show');
        });
    }
    // 点击遮罩层隐藏
    if (emailModal) {
        emailModal.addEventListener('click', (e) => {
            if (e.target === emailModal) {
                emailModal.classList.remove('show');
            }
        });
    }

    // 处理邮箱登录/注册表单提交
    if (emailLoginForm) {
        emailLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailLoginForm.email.value;
            const password = emailLoginForm.password.value;

            try {
                // 尝试登录
                await signInWithEmailAndPassword(auth, email, password);
                if (emailModal) emailModal.classList.remove('show');
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    // 如果用户不存在，询问是否创建新账户
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
                    // 其他错误（密码错误等）
                    console.error("Sign-in error", error);
                    alert(`登录失败: ${error.message}`);
                }
            }
        });
    }

    // 处理登出
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch(error => {
                console.error("Sign-out error", error);
            });
        });
    }
}

// 等待 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});

