import statsData from '../common/statsData.js';

// ===== 标点符号正则 & 工具函数 (全局) =====
const PUNCT_RE = /^[、。！？….,，;；:：!！?？]+$/;
function stripPunct(str='') {
    return str.split(':').filter(u=>u && !PUNCT_RE.test(u)).join(':');
}

class ReviewManager {
    constructor() {
        this.currentIndex = 0;
        this.sentences = [];
        this.questionStartTime = null;
        this.logs = [];
        this.init();
        this.initKeyboardMaintain();
    }

    async init() {
        try {
            // 从 sessionStorage 获取复习句子
            const savedSentences = sessionStorage.getItem('reviewSentences');
            if (!savedSentences) {
                window.location.href = '../';
                return;
            }

            this.sentences = JSON.parse(savedSentences);
            
            // 更新总数显示
            document.querySelector('.progress .total').textContent = this.sentences.length;
            
            // 显示第一个句子
            this.showQuestion();

        } catch (error) {
            console.error('Error initializing review:', error);
            alert('初始化复习出错，请返回首页重试');
        }
    }

    showQuestion() {
        const current = this.sentences[this.currentIndex];
        if (!current) return;

        // 更新进度
        const currentElement = document.querySelector('.progress .current');
        if (currentElement) {
            currentElement.textContent = this.currentIndex + 1;
        }

        // 更新掌握度
        const proficiencyElement = document.querySelector('.proficiency');
        if (proficiencyElement) {
            proficiencyElement.textContent = this.getProficiencyText(current.proficiency);
            proficiencyElement.className = `proficiency ${current.proficiency}`;
        }

        // 更新上次复习时间和下次复习时间
        const lastReviewElement = document.querySelector('.last-review');
        if (lastReviewElement) {
            const nextReviewDate = new Date(current.nextReviewDate);
            const today = new Date();
            const daysUntilNextReview = Math.ceil((nextReviewDate - today) / (1000 * 60 * 60 * 24));
            
            lastReviewElement.textContent = `上次：${this.formatLastReview(current.lastReview)} | 下次：${
                daysUntilNextReview <= 0 ? '现在' : `${daysUntilNextReview}天后`
            }`;
        }

        // 显示中文意思
        const meaningElement = document.querySelector('.meaning');
        if (meaningElement) {
            meaningElement.textContent = current.meaning;

        // 根据中文含义的长度动态调整字体大小，以适应长句
        const meaningLength = current.meaning.length;
        if (meaningLength > 25) {
            meaningElement.style.fontSize = '1.5rem';
        } else if (meaningLength > 15) {
            meaningElement.style.fontSize = '2rem';
        } else {
            meaningElement.style.fontSize = ''; // 恢复默认大小
        }
        }

        // 创建输入框
        this.createInputBoxes(current.hiragana);

        // 隐藏答案显示
        const answerDisplay = document.querySelector('.answer-display');
        if (answerDisplay) {
            answerDisplay.classList.remove('show');
        }

        // 记录开始时间
        this.questionStartTime = Date.now();
    }

    createInputBoxes(hiragana) {
        

        
        const inputArea = document.querySelector('.input-area');
        if (!inputArea) return;

        // 清空现有输入框
        inputArea.innerHTML = '';

        // 如果没有假名，显示错误信息
        if (!hiragana) {
            console.error('No hiragana found for current sentence:', this.sentences[this.currentIndex]);
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = '加载题目出错';
            inputArea.appendChild(errorMsg);
            return;
        }

        // 按冒号分割假名
        // 预处理：确保标点符号被视为独立 token（已在保存阶段插入冒号）。
        const units = hiragana.split(':');
        const answerUnits = units.filter(u => !PUNCT_RE.test(u));
        
        // 创建输入框容器
        const inputsContainer = document.createElement('div');
        inputsContainer.style.display = 'flex';
        inputsContainer.style.flexWrap = 'wrap';
        inputsContainer.style.justifyContent = 'center';
        inputsContainer.style.gap = '10px';

        let inputCounter = 0;
        const lastInputIndex = answerUnits.length - 1;
        units.forEach((unit, unitIndex) => {
            
            if (PUNCT_RE.test(unit)) {
                // 直接渲染标点符号
                const punctSpan = document.createElement('span');
                punctSpan.className = 'split-punctuation';
                punctSpan.textContent = unit;
                punctSpan.style.padding = '0 4px';
                punctSpan.style.fontSize = '1.2rem';
                inputsContainer.appendChild(punctSpan);
                return; // 跳过创建输入框
            }

            if (unit === '') return; // 跳过由 :: 产生的空片段
            const visibleIndex = inputCounter; inputCounter++;
            const inputWrapper = document.createElement('div');
            inputWrapper.className = 'split-input-wrapper';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'split-input';
            input.dataset.index = unitIndex;
            input.style.width = `${Math.max(unit.length * 20 + 40, 80)}px`;

            // 添加输入法事件监听
            let isComposing = false;
            input.addEventListener('compositionstart', () => {
                isComposing = true;
            });
            input.addEventListener('compositionend', () => {
                isComposing = false;
            });

            // 处理输入事件 - 只在最后一个输入框检查答案
            input.addEventListener('input', () => {
                if (!isComposing && visibleIndex === lastInputIndex) {
                    // 如果是最后一个输入框，检查所有答案
                    const allInputs = Array.from(inputsContainer.querySelectorAll('.split-input'));
                    const allFilled = allInputs.every(input => input.value.trim() !== '');
                    if (allFilled) {
                        const answer = allInputs.map(input => input.value.trim()).join(':');
                        this.checkAnswer(answer);
                    }
                }
            });

            // 处理键盘事件
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || (e.code === 'Space' && !isComposing)) {
                    handleInputComplete();
                }
            });

            // 添加移动设备的回车键处理
            input.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') {
                    handleInputComplete();
                }
            });

            // 处理输入完成的函数
            const handleInputComplete = () => {
                // 防止事件重复触发
                if (this.isHandlingInput) return;
                this.isHandlingInput = true;
                
                setTimeout(() => {
                    this.isHandlingInput = false;
                }, 300);
                
                if (unitIndex < units.length - 1) {
                    const nextInput = inputsContainer.querySelector(`input[data-index="${unitIndex + 1}"]`);
                    if (nextInput) {
                        input.value = input.value.trim();
                        nextInput.focus();
                    }
                } else {
                    // 检查所有输入是否已完成
                    const allInputs = Array.from(inputsContainer.querySelectorAll('.split-input'));
                    const allFilled = allInputs.every(input => input.value.trim() !== '');
                    if (allFilled) {
                        const answer = allInputs.map(input => input.value.trim()).join(':');
                        this.checkAnswer(answer);
                    }
                }
            };

            inputWrapper.appendChild(input);
            inputsContainer.appendChild(inputWrapper);
        });

        inputArea.appendChild(inputsContainer);

        // 自动聚焦第一个输入框
        const firstInput = inputsContainer.querySelector('input');
        if (firstInput) {
            setTimeout(() => {
                firstInput.focus();
            }, 100);
        }
    }

    checkAnswer(answer) {
        const current = this.sentences[this.currentIndex];
        const isCorrect = stripPunct(answer) === stripPunct(current.hiragana);
        
        console.log('检查答案:', answer, '正确答案:', current.hiragana, '结果:', isCorrect);
        
        // 更新复习记录
        statsData.updateReviewProgress(current.id, isCorrect);

        if (!isCorrect) {
            // 只标记错误的输入框
            const inputs = document.querySelectorAll('.split-input');
            const correctUnits = stripPunct(current.hiragana).split(':');
            const answerUnits = answer.split(':');
            
            inputs.forEach((input, index) => {
                if (index < correctUnits.length && index < answerUnits.length) {
                    if (answerUnits[index] !== correctUnits[index]) {
                        // 只标记错误的输入框
                        input.classList.add('error');
                    }
                }
            });
            
            console.log('答案错误，只标记错误的输入框');
            
            // 1秒后移除错误样式
            setTimeout(() => {
                inputs.forEach(input => {
                    input.classList.remove('error');
                });
            }, 1000);
            
            return;
        }

        console.log('答案正确，显示答案');
        
        // 显示答案区域
        const answerDisplay = document.querySelector('.answer-display');
        if (answerDisplay) {
            // 填充答案内容
            const kanjiText = answerDisplay.querySelector('.kanji-text');
            const kanaText = answerDisplay.querySelector('.kana-text');
            const romajiText = answerDisplay.querySelector('.romaji-text');
            const meaningText = answerDisplay.querySelector('.meaning-text');
            
            if (kanjiText) kanjiText.textContent = current.japanese;
            if (kanaText) kanaText.textContent = current.hiragana.replace(/:/g, '');
            if (romajiText) romajiText.textContent = current.romaji;
            if (meaningText) meaningText.textContent = current.meaning;
            
            // 显示答案区域
            answerDisplay.classList.add('show');
            answerDisplay.style.display = 'block';
        }
        
        // 确保使用平假名版本播放
        const textToSpeak = current.hiragana.replace(/:/g, '');
        this.playAudioWithUserInteraction(textToSpeak);
        
        // 触发答案检查事件
        document.dispatchEvent(new Event('answer-checked'));
        
        // 自动跳转到下一题
        setTimeout(() => {
            if (this.currentIndex < this.sentences.length - 1) {
                this.currentIndex++;
                this.showQuestion();
                console.log('已跳转到下一题');
            } else {
                this.showComplete();
                console.log('已完成所有题目');
            }
        }, 2000); // 2秒后自动跳转，给用户足够时间看答案
    }

    // 修改 speak 方法，使用与 flashcard 一致的实现
    async speak(text) {
        try {
            if (!text) {
                console.error('尝试朗读空文本');
                return;
            }
            
            const currentSentence = this.sentences[this.currentIndex];
            if (!currentSentence) {
                console.error('当前句子不存在');
                return;
            }
            
            // 尝试从多个可能的属性获取日语内容
            const textToSpeak = text || 
                               currentSentence.japanese || 
                               currentSentence.sentence || 
                               (currentSentence.id && currentSentence.id.split('_').pop());
            
            if (!textToSpeak) {
                console.error('没有可朗读的文本');
                return;
            }

            console.log('Speaking text:', textToSpeak);

            // 预加载音频
            const audio = new Audio();
            audio.preload = 'auto';  // 设置预加载
            audio.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(textToSpeak)}&le=jap&type=3`;

            // 等待音频加载完成
            await new Promise((resolve, reject) => {
                audio.oncanplaythrough = resolve;
                audio.onerror = reject;
                audio.load();  // 开始加载
            });

            try {
                await audio.play();
                console.log('音频播放成功');
            } catch (error) {
                console.error('播放失败，尝试后备方案:', error);
                this.fallbackSpeak(textToSpeak);
            }

        } catch (error) {
            console.error('播放语音失败:', error);
            this.fallbackSpeak(text);
        }
    }

    // 修改 fallbackSpeak 方法，使用与 flashcard 一致的实现
    fallbackSpeak(text) {
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
            utterance.lang = 'ja-JP';

            // 获取日语语音
            const voices = window.speechSynthesis.getVoices();
            const japaneseVoice = voices.find(voice => 
                voice.lang.includes('ja') || voice.lang.includes('JP')
            );
            
            if (japaneseVoice) {
                utterance.voice = japaneseVoice;
            }

            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('后备语音播放失败:', error);
        }
    }

    // 修改 playAudioWithUserInteraction 方法，使用新的 speak 方法
    async playAudioWithUserInteraction(text) {
        try {
            // 添加详细的调试信息
            console.log('准备播放音频:', {
                text: text,
                isJapanese: /[\u3040-\u309F\u30A0-\u30FF]/.test(text),
                isChinese: /[\u4e00-\u9fa5]/.test(text),
                isMobile: this.isMobile(),
                platform: navigator.platform,
                userAgent: navigator.userAgent
            });

            await this.speak(text);

        } catch (error) {
            console.error('音频播放失败:', error);
            this.fallbackSpeak(text);
        }
    }

    showAnswer(question, isCorrect) {
        const answerDisplay = document.querySelector('.answer-display');
        if (!answerDisplay) return;

        const kanji = answerDisplay.querySelector('.kanji-text');
        const kana = answerDisplay.querySelector('.kana-text');
        const romaji = answerDisplay.querySelector('.romaji-text');
        const meaning = answerDisplay.querySelector('.meaning-text');

        if (kanji) kanji.textContent = question.japanese;
        if (kana) kana.textContent = question.hiragana;
        if (romaji) romaji.textContent = question.romaji;
        if (meaning) meaning.textContent = question.meaning;

        // 显示答案
        answerDisplay.classList.add('show');

        // 朗读
        this.speak(question.japanese);

        // 3秒后显示下一题
        setTimeout(() => {
            if (this.currentIndex < this.sentences.length - 1) {
                this.currentIndex++;
                this.showQuestion();
            } else {
                this.showComplete();
            }
        }, 3000);
    }

    addToHistory(question) {
        const historyList = document.querySelector('.history-list');
        if (!historyList) return;

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-japanese">${question.japanese}</div>
            <div class="history-meaning">${question.meaning}</div>
        `;

        historyList.insertBefore(historyItem, historyList.firstChild);
    }

    toggleHistory() {
        const historyPanel = document.querySelector('.history-panel');
        const practiceArea = document.querySelector('.practice-area');
        
        if (historyPanel && practiceArea) {
            this.historyVisible = !this.historyVisible;
            historyPanel.style.display = this.historyVisible ? 'block' : 'none';
            practiceArea.style.marginLeft = this.historyVisible ? '300px' : '0';
        }
    }

    showHintAndSpeak() {
        const current = this.sentences[this.currentIndex];
        if (!current) return;

        // 显示提示
        const inputs = document.querySelectorAll('.split-input');
        const units = current.hiragana.split(':');
        inputs.forEach((input, index) => {
            input.value = units[index] || '';
        });

        // 朗读一次
        this.speak(current.japanese);

        // 降低掌握度
        this.decreaseProficiency(current.id);

        // 短暂显示后清除提示内容
        setTimeout(() => {
            inputs.forEach(input => {
                input.value = '';
            });
            // 聚焦第一个输入框
            const firstInput = document.querySelector('.split-input');
            if (firstInput) {
                firstInput.focus();
            }
        }, 2000); // 2秒后清除提示

        this.hintUsed = true;
    }

    playSound() {
        const current = this.sentences[this.currentIndex];
        if (current) {
            this.speak(current.japanese);
        }
    }

    showComplete() {
        try {
            // 清除答题区和历史记录区
            const practiceContainer = document.querySelector('.practice-container');
            const historyPanel = document.querySelector('.history-panel');
            if (practiceContainer) practiceContainer.style.display = 'none';
            if (historyPanel) historyPanel.style.display = 'none';
            
            // 获取正确的基础路径
            const basePath = window.location.hostname === 'kummerspec.github.io' 
                ? '/typingJapanese/' 
                : '../';  // 返回到主目录
                
            practiceContainer.innerHTML = `
                <div class="completion-screen">
                    <h1>おめでとう！</h1>
                    <p>复习完成！</p>
                    <div class="stats-summary">
                        <div class="stat-item">
                            <span class="stat-label">正确率</span>
                            <span class="stat-value">${Math.round(correctCount / totalAttempts * 100)}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">复习句子</span>
                            <span class="stat-value">${sentences.length}</span>
                        </div>
                    </div>
                    <div class="button-group">
                        <button onclick="window.location.href='${basePath}'">返回首页</button>
                        <button onclick="location.reload()">再次复习</button>
                    </div>
                </div>
            `;
            
            // 清除 sessionStorage 中的复习数据，防止再次点击复习时使用旧数据
            sessionStorage.removeItem('reviewSentences');
            
            // 显示完成效果
            new CompletionEffect().show();

        } catch (error) {
            console.error('Error in showComplete:', error);
            alert('完成界面显示出错，但您已完成复习！');
        }
    }

    // 创建彩花效果
    createConfetti(container) {
        const colors = ['#ff66ff', '#6b6bff', '#66ff66', '#ffeb3b', '#ff4444'];
        const confettiCount = 50;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animation = `confettiFall ${1 + Math.random() * 2}s linear forwards`;
            confetti.style.animationDelay = Math.random() * 3 + 's';
            container.appendChild(confetti);
        }
    }

    // 创建星星效果
    createStars(container) {
        const starCount = 20;
        const positions = [
            { top: '20%', left: '20%' },
            { top: '20%', right: '20%' },
            { top: '40%', left: '10%' },
            { top: '40%', right: '10%' },
            { top: '60%', left: '15%' },
            { top: '60%', right: '15%' }
        ];

        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            // 随机位置
            star.style.left = Math.random() * 100 + 'vw';
            star.style.top = Math.random() * 100 + 'vh';
            
            // 随机大小
            const size = 10 + Math.random() * 20;
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            
            // 添加动画
            star.style.animation = `starTwinkle ${1 + Math.random() * 2}s ease-in-out infinite`;
            star.style.animationDelay = Math.random() * 2 + 's';
            
            container.appendChild(star);
        }
    }

    formatLastReview(dateString) {
        const lastReview = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - lastReview) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        return `${diffDays}天前`;
    }

    getProficiencyText(proficiency) {
        const texts = {
            low: '生疏',
            medium: '熟悉',
            high: '掌握'
        };
        return texts[proficiency] || '未知';
    }

    // 添加降低掌握度的方法
    decreaseProficiency(sentenceId) {
        try {
            const stats = JSON.parse(localStorage.getItem('typing_statistics'));
            if (!stats || !stats.reviewHistory || !stats.reviewHistory[sentenceId]) return;

            const record = stats.reviewHistory[sentenceId];
            
            // 降低掌握度
            switch (record.proficiency) {
                case 'high':
                    record.proficiency = 'medium';
                    break;
                case 'medium':
                    record.proficiency = 'low';
                    break;
                // 如果已经是 'low'，保持不变
            }

            // 更新统计数据
            stats.reviewHistory[sentenceId] = record;
            localStorage.setItem('typing_statistics', JSON.stringify(stats));

            // 更新当前句子的掌握度显示
            const proficiencyElement = document.querySelector('.proficiency');
            if (proficiencyElement) {
                proficiencyElement.textContent = this.getProficiencyText(record.proficiency);
                proficiencyElement.className = `proficiency ${record.proficiency}`;
            }

        } catch (error) {
            console.error('Error decreasing proficiency:', error);
        }
    }

    initKeyboardMaintain() {
        // 获取隐藏的输入框
        const keyboardInput = document.querySelector('.keyboard-maintain');
        if (!keyboardInput) return;

        // 修复无障碍性问题 - 移除 aria-hidden 属性，改用 inert 属性
        keyboardInput.removeAttribute('aria-hidden');
        keyboardInput.setAttribute('inert', '');
        keyboardInput.style.opacity = '0.01';
        keyboardInput.style.position = 'fixed';
        keyboardInput.style.pointerEvents = 'none';

        // 在每次答案检查后保持键盘焦点
        const maintainKeyboard = () => {
            if (this.currentIndex < this.sentences.length) {
                setTimeout(() => {
                    keyboardInput.focus();
                }, 100);
            }
        };

        // 监听答案检查事件
        document.addEventListener('answer-checked', maintainKeyboard);

        // 初始聚焦
        keyboardInput.focus();
        
        // 记录日志
        console.log('键盘维持初始化完成');
    }

    // 添加移动设备检测
    isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    }

    // 添加日志方法
    log(message, data) {
        const logEntry = {
            time: new Date().toISOString(),
            message,
            data
        };
        this.logs.push(logEntry);
        console.log(`[LOG] ${message}`, data);
        
        // 更新日志显示
        this.updateLogDisplay();
    }

    // 显示日志
    updateLogDisplay() {
        // 检查是否存在日志显示区域
        let logDisplay = document.getElementById('debug-log');
        if (!logDisplay) {
            // 创建日志显示区域
            logDisplay = document.createElement('div');
            logDisplay.id = 'debug-log';
            logDisplay.style.position = 'fixed';
            logDisplay.style.bottom = '10px';
            logDisplay.style.right = '10px';
            logDisplay.style.width = '300px';
            logDisplay.style.maxHeight = '200px';
            logDisplay.style.overflow = 'auto';
            logDisplay.style.background = 'rgba(0,0,0,0.7)';
            logDisplay.style.color = 'white';
            logDisplay.style.padding = '10px';
            logDisplay.style.fontSize = '12px';
            logDisplay.style.zIndex = '9999';
            document.body.appendChild(logDisplay);
        }
        
        // 更新日志内容
        logDisplay.innerHTML = this.logs.slice(-10).map(entry => 
            `<div>${entry.time.split('T')[1].split('.')[0]} - ${entry.message}</div>`
        ).join('');
    }
}

// 创建全局实例
window.reviewManager = new ReviewManager();

// 在 showComplete() 函数 try{} 内数据写入之后、界面跳转之前
