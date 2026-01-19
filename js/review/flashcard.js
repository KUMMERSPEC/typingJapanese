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
        console.log('当前句子完整数据:', JSON.stringify(currentSentence));
        
        const cardFront = document.querySelector('.card-front');
        const cardBack = document.querySelector('.card-back');
        const flashcard = document.querySelector('.flashcard');

        if (!cardFront || !cardBack || !flashcard) {
            console.error('找不到卡片元素');
            return;
        }

        // 先隐藏卡片，防止内容闪烁
        flashcard.style.visibility = 'hidden';
        
        // 确保卡片回到正面状态
        flashcard.classList.remove('flipped');
        
        // 清空两面的内容
        cardFront.innerHTML = '';
        cardBack.innerHTML = '';
        
        // 设置正面内容
        if (this.mode === 'cn-jp') {
            // 中文到日文模式
            cardFront.innerHTML = currentSentence.meaning || '加载中...';
        } else {
            // 日文到中文模式
            cardFront.innerHTML = currentSentence.japanese || currentSentence.sentence || '加载中...';
        }
        
        // 强制重绘
        void flashcard.offsetHeight;
        
        // 显示卡片
        flashcard.style.visibility = 'visible';
        
        // 更新进度、状态和页面标题
        this.updateProgress();
        this.updateStatus(currentSentence);
        document.title = currentSentence.meaning || 'Flashcard Review';
        
        // 如果是日语在正面，播放音频
        if (this.mode !== 'cn-jp') {
            setTimeout(() => {
                this.speak(currentSentence.japanese || currentSentence.sentence);
            }, 300);
        }
        
        // 延迟设置背面内容，确保用户看不到
        setTimeout(() => {
            if (this.mode === 'cn-jp') {
                // 中文到日文模式
                cardBack.innerHTML = currentSentence.japanese || currentSentence.sentence || '加载中...';
            } else {
                // 日文到中文模式
                cardBack.innerHTML = currentSentence.meaning || '加载中...';
            }
            console.log('背面内容设置完成:', {
                frontContent: cardFront.innerHTML,
                backContent: cardBack.innerHTML,
                mode: this.mode
            });
        }, 500);
    }

    // 播放日语语音
    async speak(text) {
        const current = this.sentences[this.currentIndex] || {};
        const lang = current.lang || 'ja';
        const textToSpeak = text || current.japanese || current.sentence;

        if (!textToSpeak) {
            console.error('No text to speak for the current card.');
            return;
        }

        // If the language is English, go directly to the browser's speech synthesis.
        if (lang === 'en') {
            this.fallbackSpeak(textToSpeak, 'en');
            return;
        }

        // For Japanese, first try the Youdao API.
        try {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(textToSpeak)}&le=jap&type=3`;

            await new Promise((resolve, reject) => {
                audio.oncanplaythrough = resolve;
                audio.onerror = (e) => reject(e); // Pass error event to the catch block
                audio.load();
            });

            await audio.play();
        } catch (error) {
            console.error('Primary audio API failed, using fallback speech synthesis.', error);
            this.fallbackSpeak(textToSpeak, 'ja');
        }
    }

    // 添加后备播放方法
    fallbackSpeak(text, lang = 'ja') {
        try {
            if (!('speechSynthesis' in window)) {
                console.warn('浏览器不支持语音合成');
                return;
            }

            // 取消所有正在进行的语音
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 1;
            const tgtLang = lang;
            utterance.lang = tgtLang==='en' ? 'en-US' : 'ja-JP';

            // 选择匹配语言的 voice
            const voices = window.speechSynthesis.getVoices();
            const selVoice = voices.find(v=> tgtLang==='en' ? v.lang.startsWith('en') : v.lang.startsWith('ja'));
            if(selVoice) utterance.voice = selVoice;
            
            

            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('后备语音播放失败:', error);
        }
    }

    // 添加模拟用户交互的方法
    simulateUserInteraction() {
        // 创建一个临时的、不可见的按钮
        const tempButton = document.createElement('button');
        tempButton.style.position = 'fixed';
        tempButton.style.opacity = '0';
        tempButton.style.pointerEvents = 'none';
        document.body.appendChild(tempButton);

        // 模拟点击
        tempButton.click();

        // 移除临时按钮
        document.body.removeChild(tempButton);
    }

    // 添加移动设备检测方法
    isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    }

    bindEvents() {
        console.log('绑定事件');
        
        // 绑定翻转按钮事件
        const flipBtn = document.querySelector('.flip-btn');
        if (flipBtn) {
            flipBtn.addEventListener('click', () => this.flipCard());
        }

        // 绑定播放按钮事件
        const speakBtn = document.querySelector('.speak-btn');
        if (speakBtn) {
            speakBtn.addEventListener('click', () => {
                const currentSentence = this.sentences[this.currentIndex];
                if (this.mode === 'cn-jp') {
                    // 在中文到日文模式下，播放背面的日文
                    this.speak(currentSentence.japanese);
                } else {
                    // 在日文到中文模式下，播放正面的日文
                    this.speak(currentSentence.japanese);
                }
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
        
        if (this.mode === 'meaning') {
            front.textContent = current.meaning;
            back.textContent = current.japanese;
        } else {
            front.textContent = current.japanese;
            back.textContent = current.meaning;
            // 如果正面是日语，尝试自动朗读（不标记为用户触发）
            this.speak(current.japanese, false);
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
        
        // 获取当前句子
        const currentSentence = this.sentences[this.currentIndex];
        if (!currentSentence) {
            console.error('当前句子不存在');
            return;
        }
        
        // 详细记录当前句子数据，帮助调试
        console.log('当前句子详细数据:', {
            id: currentSentence.id,
            japanese: currentSentence.japanese,
            meaning: currentSentence.meaning,
            sentence: currentSentence.sentence,  // 有些数据模型可能使用 sentence 而不是 japanese
            hiragana: currentSentence.hiragana,
            fullObject: JSON.stringify(currentSentence)
        });
        
        const cardFront = document.querySelector('.card-front');
        const cardBack = document.querySelector('.card-back');
        
        if (!cardFront || !cardBack) {
            console.error('找不到卡片元素');
            return;
        }
        
        // 在翻转前确保内容已经设置 - 修复 Edge 浏览器问题
        if (!card.classList.contains('flipped')) {
            // 如果要翻到背面，确保背面内容已设置
            if (this.mode === 'cn-jp') {
                // 中文到日文模式 - 尝试从多个可能的属性获取日语内容
                let japaneseText = currentSentence.japanese || 
                                   currentSentence.sentence ||  // 有些数据模型使用 sentence 字段
                                   (typeof currentSentence === 'string' ? currentSentence : null);
                                   
                if (!japaneseText && currentSentence.id) {
                    // 尝试从 ID 中提取课程和句子信息
                    console.log('尝试从 ID 提取信息:', currentSentence.id);
                    // 例如 ID 可能是 "byouki_lesson1_風邪をひく"
                    const parts = currentSentence.id.split('_');
                    if (parts.length > 2) {
                        japaneseText = parts[parts.length - 1];
                        console.log('从 ID 提取的日语内容:', japaneseText);
                    }
                }
                
                if (!cardBack.innerHTML || cardBack.innerHTML === '加载中...' || cardBack.innerHTML === '内容不可用') {
                    cardBack.innerHTML = japaneseText || '内容不可用';
                    console.log('翻转前设置日文内容:', japaneseText);
                }
            } else {
                // 日文到中文模式
                if (!cardBack.innerHTML || cardBack.innerHTML === '加载中...' || cardBack.innerHTML === '内容不可用') {
                    cardBack.innerHTML = currentSentence.meaning || '内容不可用';
                    console.log('翻转前设置中文内容:', currentSentence.meaning);
                }
            }
        }
        
        // 执行翻转
        card.classList.toggle('flipped');
        console.log('翻转后状态:', card.classList.contains('flipped') ? '背面' : '正面');

        // 在翻转后播放音频
        if (card.classList.contains('flipped')) {
            // 给翻转动画一些时间完成
            setTimeout(() => {
                if (this.mode === 'cn-jp') {
                    // 尝试从多个可能的属性获取日语内容
                    const textToSpeak = currentSentence.japanese || 
                                       currentSentence.sentence || 
                                       (currentSentence.id && currentSentence.id.split('_').pop());
                                       
                    if (textToSpeak) {
                        this.speak(textToSpeak);
                    }
                }
            }, 300); // 等待翻转动画完成
        }
    }

    handleReview(isCorrect) {
        console.log('处理复习结果，正确:', isCorrect);
        const current = this.sentences[this.currentIndex];
        
        // 更新复习记录
        try {
            // 更新复习进度并获取更新后的记录
            const updatedRecord = statsData.updateReviewProgress(current.id, isCorrect);
            
            // 更新当前句子的掌握度
            if (updatedRecord) {
                current.proficiency = updatedRecord.proficiency;
                
                // 更新 sessionStorage 中的数据
                const sentences = JSON.parse(sessionStorage.getItem('reviewSentences'));
                if (sentences) {
                    const index = sentences.findIndex(s => s.id === current.id);
                    if (index !== -1) {
                        sentences[index].proficiency = updatedRecord.proficiency;
                        sessionStorage.setItem('reviewSentences', JSON.stringify(sentences));
                    }
                }
            }
        } catch (error) {
            console.error('更新复习记录失败:', error);
        }

        // 移动到下一个句子
        if (this.currentIndex < this.sentences.length - 1) {
            this.currentIndex++;
            console.log('移动到下一个句子，索引:', this.currentIndex);
            
            // 显示新卡片
            setTimeout(() => {
                this.showCurrentCard();
            }, 50);
        } else {
            console.log('已到达最后一个句子');
            // 清除 sessionStorage 中的复习数据，防止再次点击复习时使用旧数据
            sessionStorage.removeItem('reviewSentences');
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

        // 获取正确的基础路径
        const basePath = window.location.hostname === 'kummerspec.github.io' 
            ? '/typingJapanese/' 
            : '../';  // 返回到主目录

        container.innerHTML = `
            <div class="completion-screen">
                <h1>おめでとう！</h1>
                <p>复习完成！</p>
                <div class="button-group">
                    <button onclick="window.location.href='${basePath}'">返回首页</button>
                    <button onclick="location.reload()">再次复习</button>
                </div>
            </div>
        `;
                // === 同步到云端 ===
                console.log('%c[FLASHCARD COMPLETE] push stats', 'background:yellow;color:black');
                try {
                    statsData.saveStatistics(statsData.getStatistics());
                } catch (e) {
                    console.warn('[flashcard] statsData.saveStatistics failed', e);
                }
                if (typeof window.saveDataToFirebase === 'function') {
                    console.log('[flashcard] direct push to cloud');
                    window.saveDataToFirebase('typing_statistics',
                        localStorage.getItem('typing_statistics'));
                } else {
                    console.warn('[flashcard] saveDataToFirebase not found');
                }
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

    // 修改复习完成的处理
    handleReviewComplete() {
        try {
            // 保存最终统计
            this.saveReviewStats();
            
            // 使用正确的路径
            const basePath = window.location.hostname === 'kummerspec.github.io' 
                ? '/typingJapanese/' 
                : '../';  // 返回到主目录
            
            // 添加时间戳参数，确保页面刷新
            window.location.href = `${basePath}`;
            
        } catch (error) {
            console.error('处理复习完成时出错:', error);
            // 使用相对路径作为后备方案
            window.location.href = '../';
        }
    }

    // ... 其他辅助方法 ...
}

// 确保在 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成，开始初始化 FlashcardManager');
    new FlashcardManager();
}); 