import statsData from '../common/statsData.js';

class ReviewManager {
    constructor() {
        this.currentIndex = 0;
        this.sentences = [];
        this.questionStartTime = null;
        this.init();
    }

    async init() {
        try {
            // 从 sessionStorage 获取复习句子
            const savedSentences = sessionStorage.getItem('reviewSentences');
            if (!savedSentences) {
                alert('没有找到需要复习的句子，返回首页');
                window.location.href = '../';
                return;
            }

            this.sentences = JSON.parse(savedSentences);
            console.log('Loaded review sentences:', this.sentences);

            // 更新总数显示
            const totalElement = document.querySelector('.progress .total');
            if (totalElement) {
                totalElement.textContent = this.sentences.length;
            }

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
        const units = hiragana.split(':');
        
        units.forEach((unit, unitIndex) => {
            const unitContainer = document.createElement('div');
            unitContainer.className = 'input-unit';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'split-input';
            input.dataset.index = unitIndex;
            input.style.width = `${Math.max(unit.length * 20 + 40, 80)}px`;

            // 添加键盘事件监听
            input.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.code === 'Space') {
                    e.preventDefault();  // 阻止空格键的默认行为
                    // 直接跳转到下一个输入框
                    if (unitIndex < units.length - 1) {
                        const nextInput = inputArea.querySelector(`[data-index="${unitIndex + 1}"]`);
                        if (nextInput) {
                            nextInput.focus();
                        }
                    }
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const answer = Array.from(document.querySelectorAll('.split-input'))
                        .map(input => input.value).join(':');
                    this.checkAnswer(answer);
                }
            });

            // 阻止空格键的输入
            input.addEventListener('keypress', (e) => {
                if (e.key === ' ' || e.code === 'Space') {
                    e.preventDefault();
                }
            });

            // 清除可能输入的空格
            input.addEventListener('input', (e) => {
                input.value = input.value.replace(/\s/g, '');
            });

            unitContainer.appendChild(input);
            inputArea.appendChild(unitContainer);
        });

        // 聚焦第一个输入框
        const firstInput = inputArea.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 0);
        }
    }

    checkAnswer(answer) {
        const current = this.sentences[this.currentIndex];
        const isCorrect = answer === current.hiragana;
        
        // 计算响应时间
        const responseTime = Date.now() - this.questionStartTime;
        
        // 更新复习记录，包含响应时间和提示使用情况
        statsData.updateReviewProgress(
            current.id, 
            isCorrect
        );

        if (!isCorrect) {
            // 显示错误提示，只标记错误的输入框
            const inputs = document.querySelectorAll('.split-input');
            const correctUnits = current.hiragana.split(':');
            const answerUnits = answer.split(':');

            inputs.forEach((input, index) => {
                if (answerUnits[index] !== correctUnits[index]) {
                    input.classList.add('error');
                }
            });
            
            // 1秒后移除错误样式
            setTimeout(() => {
                inputs.forEach(input => {
                    input.classList.remove('error');
                });
            }, 1000);
            
            return;
        }

        // 答案正确时朗读句子
        this.speak(current.japanese);

        // 显示答案
        this.showAnswer(current, isCorrect);
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

    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        window.speechSynthesis.speak(utterance);
    }

    showComplete() {
        try {
            // 清除答题区和历史记录区
            const practiceContainer = document.querySelector('.practice-container');
            const historyPanel = document.querySelector('.history-panel');
            if (practiceContainer) practiceContainer.style.display = 'none';
            if (historyPanel) historyPanel.style.display = 'none';
            
            // 创建完成界面
            const completeScreen = document.createElement('div');
            completeScreen.className = 'completion-screen';
            completeScreen.innerHTML = `
                <h1>おめでとう！</h1>
                <p>复习完成！</p>
                <p>本次复习: ${this.sentences.length} 个句子</p>
                <p>连续学习: ${statsData.getLearningDays()} 天</p>
                <div class="button-group">
                    <button onclick="window.location.href='../?update=true'">返回首页</button>
                    <button onclick="location.reload()">再次复习</button>
                </div>
            `;

            document.body.appendChild(completeScreen);

            // 创建彩花和星星效果
            this.createConfetti(completeScreen);
            this.createStars(completeScreen);

            // 播放掌声和祝贺音效
            const applause = new Audio('../assets/audio/applause.mp3');
            applause.play().catch(error => {
                console.warn('Failed to play applause:', error);
            });

            // 朗读祝贺语
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance('おめでとうございます');
                utterance.lang = 'ja-JP';
                window.speechSynthesis.speak(utterance);
            }, 1000);

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
}

// 创建全局实例
window.reviewManager = new ReviewManager(); 