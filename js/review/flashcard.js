console.log('flashcard.js loaded');  // 添加这行来测试文件是否被加载

import statsData from '../common/statsData.js';
import { CompletionEffect } from '../common/completion.js';

class FlashcardManager {
    constructor() {
        console.log('初始化 FlashcardManager');
        this.currentIndex = 0;
        this.sentences = [];
        this.mode = null;
        this.practiceStarted = false;
        
        // 触摸相关变量
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.minSwipeDistance = 50;

        this.isLoading = true;  // 添加加载状态标记
        this.init();
        console.log('调用 initModeSelection');
        this.initModeSelection();
    }

    async init() {
        console.log('开始初始化');
        try {
            this.showLoading();  // 显示加载状态
            
            // 从 sessionStorage 获取复习句子
            const savedSentences = sessionStorage.getItem('reviewSentences');
            console.log('从 sessionStorage 获取的句子:', savedSentences);
            
            if (!savedSentences) {
                console.log('没有找到待复习句子');
                this.hideLoading();
                this.showEmptyState();
                return;
            }

            this.sentences = JSON.parse(savedSentences);
            console.log('解析后的句子数组:', this.sentences);
            
            if (this.sentences.length === 0) {
                console.log('句子数组为空');
                this.hideLoading();
                this.showEmptyState();
                return;
            }

            // 初始化界面
            this.initializeUI();
            this.bindModeSelection();  // 确保绑定模式选择
            this.setupEventListeners();
            
        } catch (error) {
            console.error('初始化错误:', error);
            this.showError('加载失败，请刷新重试');
        } finally {
            this.hideLoading();
        }
    }

    // 显示加载状态
    showLoading() {
        const container = document.querySelector('.practice-container');
        if (!container) return;

        container.innerHTML = `
            <div class="loading-screen">
                <div class="loading-spinner"></div>
                <p>正在加载复习内容...</p>
            </div>
        `;
    }

    // 隐藏加载状态
    hideLoading() {
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.remove();
        }
    }

    // 显示空状态
    showEmptyState() {
        const container = document.querySelector('.practice-container');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h2>暂无需要复习的内容</h2>
                <p>当前没有需要复习的句子，请继续学习新内容</p>
                <button onclick="window.location.href='../'">返回首页</button>
            </div>
        `;
    }

    // 显示错误状态
    showError(message) {
        const container = document.querySelector('.practice-container');
        if (!container) return;

        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h2>出错了</h2>
                <p>${message}</p>
                <button onclick="location.reload()">重试</button>
            </div>
        `;
    }

    // 添加模式选择初始化
    initModeSelection() {
        // 检查按钮是否存在
        const cnJpBtn = document.querySelector('.mode-btn.mode-cn-jp');
        const jpCnBtn = document.querySelector('.mode-btn.mode-jp-cn');
        
        console.log('找到的按钮:', {
            'cn-jp按钮': cnJpBtn,
            'jp-cn按钮': jpCnBtn
        });

        if (cnJpBtn) {
            cnJpBtn.addEventListener('click', () => {
                console.log('点击了中文到日文按钮');
                this.startPractice('cn-jp');
            });
        }

        if (jpCnBtn) {
            jpCnBtn.addEventListener('click', () => {
                console.log('点击了日文到中文按钮');
                this.startPractice('jp-cn');
            });
        }
    }

    // 开始练习
    startPractice(mode) {
        console.log('开始练习，模式：', mode);
        this.mode = mode;
        this.practiceStarted = true;

        // 隐藏模式选择界面
        const modeSelectScreen = document.querySelector('.mode-select-screen');
        if (modeSelectScreen) {
            modeSelectScreen.style.display = 'none';
        }

        // 显示练习界面并初始化 HTML 结构
        const practiceContainer = document.querySelector('.practice-container');
        if (practiceContainer) {
            practiceContainer.style.display = 'block';
            // 先创建必要的 DOM 结构
            practiceContainer.innerHTML = `
                <div class="practice-header">
                    <div class="progress">
                        <span class="current">1</span>/<span class="total">${this.sentences.length}</span>
                    </div>
                    <div class="status-info">
                        <div class="proficiency low">生疏</div>
                        <div class="last-review">上次：今天</div>
                    </div>
                    <a href="../" class="back-btn"><i class="fas fa-times"></i></a>
                </div>

                <div class="flashcard-area">
                    <div class="flashcard">
                        <div class="card-inner">
                            <div class="card-front"></div>
                            <div class="card-back"></div>
                        </div>
                    </div>
                    <div class="card-controls">
                        <button class="flip-btn"><i class="fas fa-sync-alt"></i> 翻转</button>
                        <button class="speak-btn">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    </div>
                    <div class="review-buttons">
                        <button class="review-btn wrong">
                            <i class="fas fa-times"></i>
                            不认识
                        </button>
                        <button class="review-btn correct">
                            <i class="fas fa-check"></i>
                            认识
                        </button>
                    </div>
                </div>
            `;
        }

        // 初始化练习
        this.initializePractice();
    }

    async initializePractice() {
        try {
            console.log('初始化练习数据');
            // 确保 DOM 元素已经创建
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // 显示第一个卡片
            this.showCurrentCard();
            // 绑定事件
            this.bindEvents();
            
        } catch (error) {
            console.error('初始化练习失败:', error);
            this.showError('初始化失败，请刷新重试');
        }
    }

    // 显示当前卡片
    showCurrentCard() {
        console.log('显示当前卡片，模式:', this.mode);
        
        if (!this.sentences || !this.sentences[this.currentIndex]) {
            console.error('没有可显示的句子');
            return;
        }

        const currentSentence = this.sentences[this.currentIndex];
        const cardFront = document.querySelector('.card-front');
        const cardBack = document.querySelector('.card-back');
        const flashcard = document.querySelector('.flashcard');

        if (!cardFront || !cardBack || !flashcard) {
            console.error('找不到卡片元素');
            return;
        }

        // 1. 先添加过渡类，使卡片暂时不可见
        flashcard.classList.add('transitioning');
        
        // 2. 等待短暂延迟后更新内容并显示
        setTimeout(() => {
            // 确保卡片回到正面状态
            flashcard.classList.remove('flipped');
            
            // 根据模式设置内容
            if (this.mode === 'cn-jp') {
                cardFront.textContent = currentSentence.meaning;    // 中文
                cardBack.textContent = currentSentence.japanese;   // 日文
            } else {
                cardFront.textContent = currentSentence.japanese;  // 日文
                cardBack.textContent = currentSentence.meaning;    // 中文
            }

            // 3. 移除过渡类，使卡片可见
            flashcard.classList.remove('transitioning');
            
            // 更新进度和状态
            this.updateProgress();
            this.updateStatus(currentSentence);
        }, 150); // 150ms 的延迟，可以根据需要调整
    }

    // 播放日语语音
    playJapanese(text) {
        try {
            const audio = new Audio();
            audio.src = `http://dict.youdao.com/dictvoice?le=jap&type=3&audio=${encodeURIComponent(text)}`;
            audio.play().catch(error => {
                console.error('播放语音失败:', error);
            });
        } catch (error) {
            console.error('创建语音失败:', error);
        }
    }

    // 修改原有的语音播放方法
    speakJapanese(text) {
        this.playJapanese(text);
    }

    bindEvents() {
        // 翻转按钮
        const flipBtn = document.querySelector('.flip-btn');
        if (flipBtn) {
            flipBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止事件冒泡
                this.flipCard();
            });
        }

        // 复习按钮
        const wrongBtn = document.querySelector('.review-btn.wrong');
        const correctBtn = document.querySelector('.review-btn.correct');
        
        if (wrongBtn) {
            wrongBtn.addEventListener('click', () => this.handleReview(false));
        }
        if (correctBtn) {
            correctBtn.addEventListener('click', () => this.handleReview(true));
        }

        // 点击卡片翻转
        const flashcard = document.querySelector('.flashcard');
        if (flashcard) {
            flashcard.addEventListener('click', () => this.flipCard());
        }

        // 添加键盘事件支持
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case ' ':  // 空格键翻转
                    e.preventDefault();
                    this.flipCard();
                    break;
                case 'ArrowLeft':  // 左箭头：不认识
                    wrongBtn?.click();
                    break;
                case 'ArrowRight': // 右箭头：认识
                    correctBtn?.click();
                    break;
            }
        });

        // 添加朗读按钮事件
        const speakBtn = document.querySelector('.speak-btn');
        if (speakBtn) {
            speakBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const current = this.sentences[this.currentIndex];
                this.speakJapanese(current.japanese);
            });
        }

        // 添加触摸事件
        if (flashcard) {
            flashcard.addEventListener('touchstart', (e) => {
                this.touchStartX = e.touches[0].clientX;
            });

            flashcard.addEventListener('touchmove', (e) => {
                e.preventDefault(); // 防止页面滚动
                const currentX = e.touches[0].clientX;
                const diff = currentX - this.touchStartX;
                
                // 添加拖动效果
                flashcard.style.transform = `translateX(${diff}px)`;
                flashcard.style.transition = 'none';
            });

            flashcard.addEventListener('touchend', (e) => {
                this.touchEndX = e.changedTouches[0].clientX;
                const diff = this.touchEndX - this.touchStartX;

                // 重置卡片位置
                flashcard.style.transform = '';
                flashcard.style.transition = 'transform 0.3s';

                // 判断滑动方向
                if (Math.abs(diff) >= this.minSwipeDistance) {
                    if (diff > 0) {
                        // 右滑：认识
                        this.handleReview(true);
                    } else {
                        // 左滑：不认识
                        this.handleReview(false);
                    }
                }
            });
        }
    }

    showCard() {
        const current = this.sentences[this.currentIndex];
        if (!current) return;

        const front = document.querySelector('.card-front');
        const back = document.querySelector('.card-back');
        
        // 根据选定的模式显示内容
        if (this.mode === 'meaning') {
            front.textContent = current.meaning;
            back.textContent = current.japanese;
        } else {
            front.textContent = current.japanese;
            back.textContent = current.meaning;
            // 如果正面是日语，立即朗读
            this.speakJapanese(current.japanese);
        }

        // 重置卡片状态
        document.querySelector('.flashcard').classList.remove('flipped');
        
        // 更新进度和状态
        this.updateProgress();
        this.updateStatus(current);
    }

    flipCard() {
        console.log('翻转卡片');
        const card = document.querySelector('.flashcard');
        if (!card) return;
        
        card.classList.toggle('flipped');

        // 如果是中文->日文模式，且翻到背面，播放日语
        if (this.mode === 'cn-jp' && card.classList.contains('flipped')) {
            const current = this.sentences[this.currentIndex];
            this.speakJapanese(current.japanese);
        }
    }

    handleReview(isCorrect) {
        console.log('处理复习结果，正确:', isCorrect);
        const current = this.sentences[this.currentIndex];
        
        // 更新复习记录
        statsData.updateReviewProgress(current.id, isCorrect);

        // 移动到下一个句子
        if (this.currentIndex < this.sentences.length - 1) {
            this.currentIndex++;
            // 重置卡片状态
            const flashcard = document.querySelector('.flashcard');
            if (flashcard) {
                flashcard.classList.remove('flipped');
            }
            // 显示新卡片
            this.showCurrentCard();
        } else {
            this.showComplete();
        }
    }

    updateProgress() {
        const currentElement = document.querySelector('.progress .current');
        const totalElement = document.querySelector('.progress .total');
        
        if (currentElement) currentElement.textContent = this.currentIndex + 1;
        if (totalElement) totalElement.textContent = this.sentences.length;
    }

    updateStatus(sentence) {
        const proficiencyElement = document.querySelector('.proficiency');
        const lastReviewElement = document.querySelector('.last-review');
        
        if (proficiencyElement) {
            proficiencyElement.className = `proficiency ${sentence.proficiency}`;
            proficiencyElement.textContent = this.getProficiencyText(sentence.proficiency);
        }
        
        if (lastReviewElement) {
            lastReviewElement.textContent = `上次：${this.formatLastReview(sentence.lastReview)}`;
        }
    }

    // 添加格式化时间的方法
    formatLastReview(dateString) {
        const lastReview = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - lastReview) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        return `${diffDays}天前`;
    }

    // 添加获取掌握度文本的方法
    getProficiencyText(proficiency) {
        const texts = {
            low: '生疏',
            medium: '熟悉',
            high: '掌握'
        };
        return texts[proficiency] || '未知';
    }

    // 添加完成界面显示方法
    showComplete() {
        const container = document.querySelector('.practice-container');
        if (!container) return;

        // 显示完成效果
        new CompletionEffect().show();

        container.innerHTML = `
            <div class="completion-screen">
                <h1>おめでとう！</h1>
                <p>复习完成！</p>
                <div class="button-group">
                    <button onclick="window.location.href='../?update=true'">返回首页</button>
                    <button onclick="location.reload()">再次复习</button>
                </div>
            </div>
        `;
    }

    // 添加初始化UI的方法
    initializeUI() {
        const practiceContainer = document.querySelector('.practice-container');
        if (!practiceContainer) return;

        // 显示练习容器
        practiceContainer.style.display = 'none';

        // 显示模式选择界面
        const modeSelectScreen = document.querySelector('.mode-select-screen');
        if (modeSelectScreen) {
            modeSelectScreen.style.display = 'block';
        }
    }

    // 添加事件监听器设置方法
    setupEventListeners() {
        // 绑定返回按钮事件
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = '../';
            });
        }

        // 绑定键盘事件
        document.addEventListener('keydown', (e) => {
            if (!this.practiceStarted) return;
            
            switch(e.key) {
                case ' ':  // 空格键翻转
                    e.preventDefault();
                    this.flipCard();
                    break;
                case 'ArrowLeft':  // 左箭头：不认识
                    document.querySelector('.review-btn.wrong')?.click();
                    break;
                case 'ArrowRight': // 右箭头：认识
                    document.querySelector('.review-btn.correct')?.click();
                    break;
            }
        });
    }

    // ... 其他辅助方法 ...
}

// 确保在 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成，开始初始化 FlashcardManager');
    new FlashcardManager();
}); 