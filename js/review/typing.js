import statsData from '../common/statsData.js';

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
        
        // 创建输入框容器
        const inputsContainer = document.createElement('div');
        inputsContainer.style.display = 'flex';
        inputsContainer.style.flexWrap = 'wrap';
        inputsContainer.style.justifyContent = 'center';
        inputsContainer.style.gap = '10px';

        units.forEach((unit, unitIndex) => {
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
                if (!isComposing && unitIndex === units.length - 1) {
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
        const isCorrect = answer === current.hiragana;
        
        console.log('检查答案:', answer, '正确答案:', current.hiragana, '结果:', isCorrect);
        
        // 更新复习记录
        statsData.updateReviewProgress(current.id, isCorrect);

        if (!isCorrect) {
            // 只标记错误的输入框
            const inputs = document.querySelectorAll('.split-input');
            const correctUnits = current.hiragana.split(':');
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
        
        // 关键修改：使用日语平假名版本，而不是汉字
        this.playAudioWithUserInteraction(current.hiragana.replace(/:/g, ''));
        
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

    // 修改 playAudioWithUserInteraction 方法，确保使用正确的文本
    async playAudioWithUserInteraction(text) {
        try {
            // 添加详细的调试信息
            console.log('准备播放音频:', {
                text: text,
                isJapanese: /[\u3040-\u309F\u30A0-\u30FF]/.test(text), // 检测是否包含日语字符
                isChinese: /[\u4e00-\u9fa5]/.test(text), // 检测是否包含汉字
                length: text.length,
                currentSentence: this.sentences[this.currentIndex]
            });
            
            // 确保使用的是日语文本
            if (!text || text.match(/[\u4e00-\u9fa5]/)) {
                console.warn('检测到汉字，尝试使用平假名版本');
                // 如果传入的是汉字，尝试获取当前句子的平假名版本
                const current = this.sentences[this.currentIndex];
                if (current && current.hiragana) {
                    text = current.hiragana.replace(/:/g, '');
                }
            }
            
            // 停止任何正在播放的音频
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            
            // 创建一个可见的音频元素，这有助于在某些移动设备上触发播放
            const audioElement = document.createElement('audio');
            audioElement.controls = true; // 显示控件
            audioElement.style.position = 'fixed';
            audioElement.style.bottom = '10px';
            audioElement.style.left = '10px';
            audioElement.style.zIndex = '9999';
            audioElement.style.width = '80px';
            audioElement.style.height = '30px';
            
            // 添加到页面
            document.body.appendChild(audioElement);
            
            // 设置音频源
            audioElement.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=jap`;
            
            // 添加事件监听
            audioElement.addEventListener('canplaythrough', () => {
                console.log('音频已加载完成，准备播放');
            });
            
            audioElement.addEventListener('play', () => {
                console.log('音频开始播放');
            });
            
            audioElement.addEventListener('ended', () => {
                console.log('音频播放完成');
                // 播放完成后移除元素
                setTimeout(() => {
                    if (document.body.contains(audioElement)) {
                        document.body.removeChild(audioElement);
                    }
                }, 500);
            });
            
            audioElement.addEventListener('error', (e) => {
                console.error('音频播放出错:', e);
                // 尝试使用 Google TTS
                this.tryGoogleTTSWithVisibleControls(text);
                // 移除出错的元素
                if (document.body.contains(audioElement)) {
                    document.body.removeChild(audioElement);
                }
            });
            
            // 尝试播放
            try {
                // 先加载
                audioElement.load();
                // 然后播放
                const playPromise = audioElement.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('有道 API 音频播放成功（用户交互触发）');
                        // 播放成功后3秒移除控件
                        setTimeout(() => {
                            if (document.body.contains(audioElement)) {
                                document.body.removeChild(audioElement);
                            }
                        }, 3000);
                    }).catch(error => {
                        console.warn('有道 API 播放失败，尝试 Google TTS:', error);
                        this.tryGoogleTTSWithVisibleControls(text);
                        // 移除出错的元素
                        if (document.body.contains(audioElement)) {
                            document.body.removeChild(audioElement);
                        }
                    });
                }
            } catch (error) {
                console.error('播放尝试失败:', error);
                this.tryGoogleTTSWithVisibleControls(text);
                // 移除出错的元素
                if (document.body.contains(audioElement)) {
                    document.body.removeChild(audioElement);
                }
            }
        } catch (error) {
            console.error('音频播放失败:', error);
        }
    }

    // 使用可见控件的 Google TTS
    async tryGoogleTTSWithVisibleControls(text) {
        try {
            console.log('尝试使用 Google TTS 播放:', text);
            
            // 创建一个可见的音频元素
            const audioElement = document.createElement('audio');
            audioElement.controls = true;
            audioElement.style.position = 'fixed';
            audioElement.style.bottom = '10px';
            audioElement.style.left = '10px';
            audioElement.style.zIndex = '9999';
            audioElement.style.width = '80px';
            audioElement.style.height = '30px';
            
            // 添加到页面
            document.body.appendChild(audioElement);
            
            // 设置音频源
            audioElement.src = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ja&client=tw-ob`;
            
            // 添加事件监听
            audioElement.addEventListener('canplaythrough', () => {
                console.log('Google TTS 音频已加载完成，准备播放');
            });
            
            audioElement.addEventListener('play', () => {
                console.log('Google TTS 音频开始播放');
            });
            
            audioElement.addEventListener('ended', () => {
                console.log('Google TTS 音频播放完成');
                // 播放完成后移除元素
                setTimeout(() => {
                    if (document.body.contains(audioElement)) {
                        document.body.removeChild(audioElement);
                    }
                }, 500);
            });
            
            audioElement.addEventListener('error', (e) => {
                console.error('Google TTS 音频播放出错:', e);
                // 尝试使用 Web Speech API
                this.tryWebSpeechWithFeedback(text);
                // 移除出错的元素
                if (document.body.contains(audioElement)) {
                    document.body.removeChild(audioElement);
                }
            });
            
            // 尝试播放
            try {
                // 先加载
                audioElement.load();
                // 然后播放
                const playPromise = audioElement.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('Google TTS 音频播放成功');
                        // 播放成功后3秒移除控件
                        setTimeout(() => {
                            if (document.body.contains(audioElement)) {
                                document.body.removeChild(audioElement);
                            }
                        }, 3000);
                    }).catch(error => {
                        console.warn('Google TTS 播放失败，尝试 Web Speech API:', error);
                        this.tryWebSpeechWithFeedback(text);
                        // 移除出错的元素
                        if (document.body.contains(audioElement)) {
                            document.body.removeChild(audioElement);
                        }
                    });
                }
            } catch (error) {
                console.error('Google TTS 播放尝试失败:', error);
                this.tryWebSpeechWithFeedback(text);
                // 移除出错的元素
                if (document.body.contains(audioElement)) {
                    document.body.removeChild(audioElement);
                }
            }
        } catch (error) {
            console.error('Google TTS 播放失败:', error);
            this.tryWebSpeechWithFeedback(text);
        }
    }

    // 使用 Web Speech API 并提供视觉反馈
    tryWebSpeechWithFeedback(text) {
        try {
            console.log('尝试使用 Web Speech API 播放:', text);
            
            // 创建一个视觉反馈元素
            const feedbackElement = document.createElement('div');
            feedbackElement.textContent = '正在使用浏览器语音合成...';
            feedbackElement.style.position = 'fixed';
            feedbackElement.style.bottom = '10px';
            feedbackElement.style.left = '10px';
            feedbackElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
            feedbackElement.style.color = 'white';
            feedbackElement.style.padding = '5px 10px';
            feedbackElement.style.borderRadius = '5px';
            feedbackElement.style.zIndex = '9999';
            
            // 添加到页面
            document.body.appendChild(feedbackElement);
            
            if ('speechSynthesis' in window) {
                // 停止任何正在播放的语音
                window.speechSynthesis.cancel();
                
                // 创建新的语音实例
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'ja-JP';
                utterance.rate = 0.9;
                
                // 添加事件监听
                utterance.onstart = () => {
                    console.log('Web Speech API 开始播放');
                    feedbackElement.textContent = '正在播放...';
                };
                
                utterance.onend = () => {
                    console.log('Web Speech API 播放完成');
                    // 播放完成后移除元素
                    setTimeout(() => {
                        if (document.body.contains(feedbackElement)) {
                            document.body.removeChild(feedbackElement);
                        }
                    }, 500);
                };
                
                utterance.onerror = (e) => {
                    console.error('Web Speech API 播放出错:', e);
                    feedbackElement.textContent = '语音合成失败';
                    // 3秒后移除元素
                    setTimeout(() => {
                        if (document.body.contains(feedbackElement)) {
                            document.body.removeChild(feedbackElement);
                        }
                    }, 3000);
                };
                
                // 播放语音
                window.speechSynthesis.speak(utterance);
                console.log('Web Speech API 播放请求已发送');
            } else {
                console.warn('浏览器不支持 Web Speech API');
                feedbackElement.textContent = '您的浏览器不支持语音合成';
                // 3秒后移除元素
                setTimeout(() => {
                    if (document.body.contains(feedbackElement)) {
                        document.body.removeChild(feedbackElement);
                    }
                }, 3000);
            }
        } catch (error) {
            console.error('Web Speech API 播放失败:', error);
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

    async speak(text) {
        // 这个方法现在只作为备用，不再直接调用
        console.log('备用音频播放方法被调用:', text);
        this.playAudioWithUserInteraction(text);
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