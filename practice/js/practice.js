import DataLoader from './dataLoader.js';
import statsData from '../../js/common/statsData.js';

class PracticeManager {
    constructor() {
        this.currentQuestionIndex = 0;
        this.questions = [];
        this.score = 0;
        
        // 初始化语音合成
        this.speechSynthesis = window.speechSynthesis;
        // 获取日语语音
        this.japaneseVoice = null;
        this.initVoice();
        
        // 初始化侧边栏状态
        this.isSidebarOpen = false;
        
        // 获取当前课程信息
        const urlParams = new URLSearchParams(window.location.search);
        this.currentCourse = urlParams.get('course');
        this.currentLesson = urlParams.get('lesson');
        
        this.totalSentences = 0;
        this.completedSentences = 0;
        
        this.init();
        
        // 绑定完成事件
        this.bindCompletionEvents();
    }

    async init() {
        try {
            console.log('Starting initialization...');
            
            // 从 URL 获取课程参数
            const urlParams = new URLSearchParams(window.location.search);
            const course = urlParams.get('course');
            const lesson = urlParams.get('lesson');

            console.log('URL parameters:', { course, lesson });

            if (!course || !lesson) {
                throw new Error('Course or lesson parameter is missing');
            }

            // 保存课程和课程名到实例中
            this.course = course;
            this.lesson = lesson;

            // 加载课程数据
            console.log('Loading course data...');
            try {
                const lessonData = await DataLoader.getCourseWithLessonData(course, lesson);
                console.log('Loaded lesson data:', lessonData);
                
                // 确保题目数组正确加载
                if (!lessonData || !lessonData.questions || !Array.isArray(lessonData.questions)) {
                    throw new Error('Invalid lesson data structure');
                }

                // 获取已掌握的句子
                const masteredSentences = JSON.parse(localStorage.getItem('masteredSentences') || '{}');
                
                // 过滤掉已掌握的句子
                this.questions = lessonData.questions.filter(question => {
                    const questionKey = `${course}:${lesson}:${question.character}`;
                    return !masteredSentences[questionKey];
                });
                
                // 确保题目数组不为空
                if (this.questions.length === 0) {
                    // 如果所有题目都已掌握，显示提示并返回课程列表
                    alert('恭喜！本课程的所有内容你都已掌握！');
                    window.location.href = '../courses.html';
                    return;
                }

                // 重置当前题目索引
                this.currentQuestionIndex = 0;

                // 更新页面标题和进度
                const titleElement = document.querySelector('.lesson-info span');
                if (titleElement) {
                    const lessonNumber = parseInt(this.lesson.replace('lesson', ''));
                    titleElement.textContent = `第${lessonNumber}课 (1/${this.questions.length})`;
                }
                
                // 显示第一个题目
                this.showQuestion();

                this.totalSentences = this.questions.length;
                this.completedSentences = 0;

                // 绑定事件监听器
                this.bindEvents();

            } catch (loadError) {
                console.error('Error loading lesson data:', loadError);
                throw new Error(`Failed to load lesson data: ${loadError.message}`);
            }

        } catch (error) {
            console.error('Error in init:', error);
            alert('加载课程失败，请返回重试');
            window.location.href = '../courses.html';
        }
    }

    // 初始化日语语音
    async initVoice() {
        try {
            if (!('speechSynthesis' in window)) {
                console.warn('浏览器不支持语音合成');
                return;
            }

            this.speechSynthesis = window.speechSynthesis;
            
            // 等待语音列表加载
            if (this.speechSynthesis.getVoices().length === 0) {
                await new Promise(resolve => {
                    this.speechSynthesis.onvoiceschanged = () => resolve();
                    // 添加超时处理
                    setTimeout(resolve, 1000);
                });
            }

            // 获取日语语音，优先选择 Google 日语语音
            const voices = this.speechSynthesis.getVoices();
            console.log('Available voices:', voices.map(v => ({name: v.name, lang: v.lang})));
            
            // 优先选择 Google 日语语音
            this.japaneseVoice = voices.find(voice => 
                voice.name.includes('Google') && voice.lang.includes('ja')
            );

            // 如果没有 Google 日语语音，选择其他日语语音
            if (!this.japaneseVoice) {
                this.japaneseVoice = voices.find(voice => 
                    voice.lang.includes('ja') || voice.lang.includes('JP')
                );
            }

            // 如果还是没有找到，使用默认语音
            if (!this.japaneseVoice) {
                console.warn('未找到日语语音，将使用默认语音');
                this.japaneseVoice = voices[0];
            }

            console.log('Selected voice:', this.japaneseVoice);

        } catch (error) {
            console.error('初始化语音失败:', error);
        }
    }

    // 朗读文本
    async speak(text) {
        try {
            // 获取当前问题
            const currentQuestion = this.questions[this.currentQuestionIndex];
            
            // 优先使用平假名版本
            let textToSpeak = currentQuestion.hiragana || currentQuestion.character;
            
            // 如果是分词类型的问题，移除分隔符
            if (currentQuestion.type === 'split') {
                textToSpeak = textToSpeak.replace(/:/g, '');
            }

            console.log('Speaking text:', textToSpeak);

            // 预加载下一个音频
            this.preloadNextAudio();

            // 使用有道词典 API
            const audio = new Audio();
            audio.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(textToSpeak)}&le=jap&type=3`;
            
            // 设置音频预加载
            audio.preload = 'auto';
            
            // 添加错误处理
            audio.onerror = (error) => {
                console.error('Audio playback error:', error);
                // 如果有道 API 失败，尝试使用 Web Speech API 作为备选
                this.fallbackSpeak(textToSpeak);
            };

            // 播放音频
            try {
                await audio.play();
            } catch (error) {
                console.error('Failed to play audio:', error);
                this.fallbackSpeak(textToSpeak);
            }

        } catch (error) {
            console.error('播放语音失败:', error);
            this.fallbackSpeak(text);
        }
    }

    // 添加预加载下一个音频的方法
    preloadNextAudio() {
        try {
            // 检查是否有下一题
            if (this.currentQuestionIndex + 1 < this.questions.length) {
                const nextQuestion = this.questions[this.currentQuestionIndex + 1];
                if (nextQuestion) {
                    // 获取下一题的文本
                    let nextText = nextQuestion.hiragana || nextQuestion.character;
                    if (nextQuestion.type === 'split') {
                        nextText = nextText.replace(/:/g, '');
                    }
                    
                    // 创建并预加载下一个音频
                    const nextAudio = new Audio();
                    nextAudio.preload = 'auto';
                    nextAudio.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(nextText)}&le=jap&type=3`;
                }
            }
        } catch (error) {
            console.error('预加载下一个音频失败:', error);
        }
    }

    // 使用 Web Speech API 作为后备方案
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

    // 检测是否为移动设备
    get isMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    }

    showQuestion() {
        console.log('=== showQuestion START ===');
        
        const question = this.questions[this.currentQuestionIndex];
        if (!question) {
            console.error('No question found at index:', this.currentQuestionIndex);
            return;
        }

        const characterElement = document.querySelector('.character');
        const inputArea = document.querySelector('.input-area');
        const answerDisplay = document.querySelector('.answer-display');
        const functionButtons = document.querySelector('.function-buttons');
        
        if (!characterElement || !inputArea) {
            console.error('Required elements not found');
            return;
        }

        if (answerDisplay) {
            answerDisplay.classList.remove('show');
        }

        characterElement.textContent = question.meaning;
        inputArea.innerHTML = '';
        inputArea.style.display = 'flex';
        characterElement.style.display = 'block';

        // 设置功能按钮的 data-question 属性
        const questionKey = `${this.course}:${this.lesson}:${question.character}`;
        const markMasteredBtn = document.querySelector('.function-buttons .mark-mastered-btn');
        if (markMasteredBtn) {
            markMasteredBtn.setAttribute('data-question', questionKey);
            
            // 检查是否已掌握
            const masteredSentences = JSON.parse(localStorage.getItem('masteredSentences') || '{}');
            if (masteredSentences[questionKey]) {
                markMasteredBtn.classList.add('mastered');
                markMasteredBtn.innerHTML = `<span class="btn-icon">✓</span><span class="btn-text">已掌握</span><span class="btn-shortcut">Alt+M</span>`;
            } else {
                markMasteredBtn.classList.remove('mastered');
                markMasteredBtn.innerHTML = `<span class="btn-icon">✓</span><span class="btn-text">标记掌握</span><span class="btn-shortcut">Alt+M</span>`;
            }
        }

        // 检测是否为移动设备
        const userAgent = navigator.userAgent;
        console.log('User Agent:', userAgent);
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent) || 
                        ('ontouchstart' in window) ||
                        (navigator.maxTouchPoints > 0);
        
        console.log('Is Mobile Device:', isMobile);

        // 创建主容器
        const mainContainer = document.createElement('div');
        mainContainer.className = 'main-input-container';
        mainContainer.style.display = 'flex';
        mainContainer.style.flexDirection = 'column';
        mainContainer.style.alignItems = 'center';
        mainContainer.style.gap = '15px';
        mainContainer.style.width = '100%';

        if (question.type === 'split') {
            const words = question.hiragana.split(':');
            
            // 创建输入框容器
            const inputsContainer = document.createElement('div');
            inputsContainer.style.display = 'flex';
            inputsContainer.style.flexWrap = 'wrap';
            inputsContainer.style.justifyContent = 'center';
            inputsContainer.style.gap = '10px';
            
            words.forEach((word, index) => {
                const inputWrapper = document.createElement('div');
                inputWrapper.className = 'split-input-wrapper';
                
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'split-input';
                input.dataset.index = index;
                
                this.adjustInputWidth(input);

                // 添加输入法事件监听
                let isComposing = false;
                input.addEventListener('compositionstart', () => {
                    isComposing = true;
                });
                input.addEventListener('compositionend', () => {
                    isComposing = false;
                });

                // 桌面端处理
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        this.showCorrectAnswer(question);
                    } else if (!isMobile && e.code === 'Space') {
                        // 检查是否正在使用输入法
                        if (isComposing) {
                            return; // 如果正在使用输入法，不阻止默认行为
                        }
                        // 立即阻止空格输入并跳转
                        e.preventDefault();
                        e.stopPropagation();
                        if (index < words.length - 1) {
                            const nextInput = inputsContainer.querySelector(`input[data-index="${index + 1}"]`);
                            if (nextInput) {
                                nextInput.focus({preventScroll: true});
                                nextInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (index < words.length - 1) {
                            const nextInput = inputsContainer.querySelector(`input[data-index="${index + 1}"]`);
                            if (nextInput) {
                                input.value = input.value.trim();
                                nextInput.focus({preventScroll: true});
                                nextInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        } else {
                            // 检查所有输入是否已完成
                            const allInputs = Array.from(inputsContainer.querySelectorAll('.split-input'));
                            const allFilled = allInputs.every(input => input.value.trim() !== '');
                            if (allFilled) {
                                this.checkSplitAnswer();
                            }
                        }
                    }
                });

                // 阻止空格键的默认行为
                input.addEventListener('keypress', (e) => {
                    if (!isComposing && e.code === 'Space') {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                });

                inputWrapper.appendChild(input);
                inputsContainer.appendChild(inputWrapper);
            });

            mainContainer.appendChild(inputsContainer);
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'split-input';
            
            this.adjustInputWidth(input);
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.showCorrectAnswer(question);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const answer = input.value.trim();
                    if (answer) {
                        if (question.answers.includes(answer)) {
                            input.classList.remove('error');
                            input.classList.add('correct');
                            this.showCorrectAnswer(question);
                            this.updateHistory(question);
                            setTimeout(() => this.nextQuestion(), 2000);
                        } else {
                            input.classList.add('error');
                            setTimeout(() => input.classList.remove('error'), 500);
                        }
                    }
                }
            });

            mainContainer.appendChild(input);
        }

        // 将主容器添加到输入区域
        inputArea.appendChild(mainContainer);
        console.log('Main container added to input area');

        // 自动聚焦第一个输入框
        const firstInput = mainContainer.querySelector('input');
        if (firstInput) {
            setTimeout(() => {
                firstInput.focus();
                if (isMobile) {
                    firstInput.click();
                }
            }, 200);
        }

        this.updateProgress();

        // 修改语音播放逻辑
        let isPlaying = false;
        const playAudio = () => {
            if (isPlaying) return;
            isPlaying = true;

            const text = question.character;
            if (this.japaneseVoice && 'speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.voice = this.japaneseVoice;
                utterance.lang = 'ja-JP';
                
                utterance.onend = () => {
                    isPlaying = false;
                };
                
                utterance.onerror = (event) => {
                    console.error('Speech synthesis error:', event);
                    isPlaying = false;
                };

                window.speechSynthesis.speak(utterance);
            }
        };

        // 绑定语音播放事件
        const audioButton = document.querySelector('.play-audio');
        if (audioButton) {
            const newAudioButton = audioButton.cloneNode(true);
            audioButton.parentNode.replaceChild(newAudioButton, audioButton);
            newAudioButton.addEventListener('click', playAudio);
        }

        // 绑定全局 Tab 键事件，只用于播放语音
        const handleKeydown = (event) => {
            if (event.key === 'Tab') {
                event.preventDefault();
                playAudio();
            }
        };

        // 移除旧的事件监听器并添加新的
        document.removeEventListener('keydown', this.currentKeydownHandler);
        this.currentKeydownHandler = handleKeydown;
        document.addEventListener('keydown', this.currentKeydownHandler);
    }

    updateProgress() {
        const total = this.questions.length;
        const current = this.currentQuestionIndex + 1;
        // 只更新课程标题中的进度
        document.querySelector('.lesson-info span').textContent = `第一课 (${current}/${total})`;
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            // Control 键播放声音
            if (e.key === 'Control') {
                e.preventDefault();
                this.playSound();
            }
            // Alt + M 键标记已掌握
            else if ((e.key === 'm' || e.key === 'M') && e.altKey) {
                e.preventDefault();
                const currentQuestion = this.questions[this.currentQuestionIndex];
                if (currentQuestion) {
                    this.markAsMastered(currentQuestion);
                }
            }
        });
    }

    checkAnswer(answer) {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        // 将答案转换为数组并检查是否有完全匹配
        const possibleAnswers = currentQuestion.answers.split('|');
        if (possibleAnswers.some(possibleAnswer => answer === possibleAnswer)) {
            console.log('Correct answer!');
            this.showCorrectAnswer(currentQuestion);
            // 延迟 2 秒后进入下一题
            setTimeout(() => {
                console.log('Moving to next question');
                this.nextQuestion();
            }, 2000);
        } else {
            this.showError();
        }
    }

    showCorrectAnswer(question, isTabPress = false) {
        // 清除任何现有的定时器
        if (this.nextQuestionTimer) {
            clearTimeout(this.nextQuestionTimer);
            this.nextQuestionTimer = null;
        }

        const answerDisplay = document.querySelector('.answer-display');
        const inputArea = document.querySelector('.input-area');
        const character = document.querySelector('.character');
        const functionButtons = document.querySelector('.function-buttons');
        
        if (!answerDisplay || !inputArea || !character) {
            console.error('Required elements not found');
            return;
        }

        // 隐藏输入区域和字符
        inputArea.style.display = 'none';
        character.style.display = 'none';
        functionButtons.style.display = 'none'; // 隐藏功能按钮组

        // 清空并显示答案区域
        answerDisplay.innerHTML = '';
        answerDisplay.style.display = 'block';
        answerDisplay.classList.add('show');
        
        // 创建答案内容区域
        const answerContent = document.createElement('div');
        answerContent.className = 'answer-content';
        
        // 更新答案内容
        answerContent.innerHTML = `
            <div class="kanji-text">${question.character}</div>
            <div class="kana-text">${question.hiragana}</div>
            <div class="romaji-text">${question.romaji}</div>
            <div class="meaning-text">${question.meaning}</div>
        `;
        
        // 添加标记按钮
        const masteryButton = document.createElement('button');
        masteryButton.className = 'mastery-button';
        masteryButton.innerHTML = '✓ 标记为已掌握 (Alt+M)';
        masteryButton.onclick = () => this.markAsMastered(question);

        // 设置 data-question 属性
        const questionKey = `${this.course}:${this.lesson}:${question.character}`;
        masteryButton.setAttribute('data-question', questionKey);

        // 检查是否已掌握
        const masteredSentences = JSON.parse(localStorage.getItem('masteredSentences') || '{}');
        if (masteredSentences[questionKey]) {
            masteryButton.classList.add('mastered');
            masteryButton.innerHTML = '✓ 已掌握 (Alt+M)';
        }

        answerContent.appendChild(masteryButton);
        answerDisplay.appendChild(answerContent);
        
        // 播放声音
        this.speak(question.character);
        
        if (isTabPress) {
            // Tab键显示答案：2秒后返回原题
            this.nextQuestionTimer = setTimeout(() => {
                // 隐藏答案显示
                answerDisplay.classList.remove('show');
                answerDisplay.style.display = 'none';
                // 显示输入区域和功能按钮
                inputArea.style.display = 'flex';
                character.style.display = 'block';
                functionButtons.style.display = 'flex'; // 恢复显示功能按钮组
                // 聚焦到第一个输入框
                const firstInput = inputArea.querySelector('input');
                if (firstInput) firstInput.focus();
            }, 2000);
        } else {
            // 答对后显示答案：2秒后进入下一题
            this.nextQuestionTimer = setTimeout(() => {
                this.nextQuestion();
            }, 2000);
        }
    }

    // 添加标记为已掌握的方法
    markAsMastered(question) {
        console.log('=== markAsMastered START ===');
        if (!question) {
            console.error('No question provided');
            return;
        }

        const masteredSentences = JSON.parse(localStorage.getItem('masteredSentences') || '{}');
        const questionKey = `${this.course}:${this.lesson}:${question.character}`;
        const wasMarked = !!masteredSentences[questionKey];
        
        console.log('Current state:', {
            questionKey,
            wasMarked,
            course: this.course,
            lesson: this.lesson
        });

        // 先更新状态
        if (wasMarked) {
            delete masteredSentences[questionKey];
            console.log('Unmarking as mastered');
        } else {
            masteredSentences[questionKey] = {
                timestamp: Date.now(),
                meaning: question.meaning
            };
            console.log('Marking as mastered');

            // 只有split类型的句子才添加到复习区
            if (question.type === 'split') {
                console.log('Adding split sentence to review history');
                const stats = statsData.getStatistics();
                if (!stats.reviewHistory) {
                    stats.reviewHistory = {};
                }
                
                // 使用包含课程和课时信息的唯一key
                const reviewKey = `${this.course}:${this.lesson}:${question.character}`;
                
                // 检查是否已存在相同的句子
                let isDuplicate = false;
                Object.keys(stats.reviewHistory).forEach(key => {
                    if (stats.reviewHistory[key].japanese === question.character &&
                        stats.reviewHistory[key].course === this.course &&
                        stats.reviewHistory[key].lesson === this.lesson) {
                        isDuplicate = true;
                    }
                });

                // 只有不是重复的句子才添加
                if (!isDuplicate) {
                    const now = new Date();
                    stats.reviewHistory[reviewKey] = {
                        japanese: question.character,
                        hiragana: question.hiragana,
                        meaning: question.meaning,
                        course: this.course,
                        lesson: this.lesson,
                        lastReview: now.toISOString(),
                        nextReviewDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                        proficiency: 'high',
                        reviewCount: 1
                    };
                    
                    try {
                        // 保存统计数据
                        statsData.saveStatistics(stats);
                        console.log('Statistics saved successfully:', stats);
                    } catch (error) {
                        console.error('Error saving statistics:', error);
                    }
                }
            }
        }

        localStorage.setItem('masteredSentences', JSON.stringify(masteredSentences));

        // 更新按钮状态和动画
        const updateButton = (button, isMarked) => {
            if (!button) {
                console.log('Button not found for update');
                return;
            }
            
            // 移除之前的动画类
            button.classList.remove('success');
            button.classList.remove('mastered');
            
            // 强制重绘以确保动画可以重新触发
            void button.offsetWidth;
            
            if (isMarked) {
                // 添加新的状态和动画类
                button.classList.add('mastered');
                button.classList.add('success');
                button.innerHTML = `<span class="btn-icon">✓</span><span class="btn-text">已掌握</span><span class="btn-shortcut">Alt+M</span>`;
                
                // 500ms后移除动画类，但保留mastered状态
                setTimeout(() => {
                    button.classList.remove('success');
                }, 500);
            } else {
                button.innerHTML = `<span class="btn-icon">✓</span><span class="btn-text">标记掌握</span><span class="btn-shortcut">Alt+M</span>`;
            }
        };

        // 只更新当前问题的按钮
        const currentButton = document.querySelector(`.function-buttons .mark-mastered-btn[data-question="${questionKey}"]`);
        if (currentButton) {
            updateButton(currentButton, !wasMarked);
        }

        // 如果在答案显示区域也有按钮，也更新它
        const answerButton = document.querySelector(`.answer-display .mastery-button[data-question="${questionKey}"]`);
        if (answerButton) {
            updateButton(answerButton, !wasMarked);
        }

        console.log('Updated mastered status:', {
            questionKey,
            isMastered: !wasMarked,
            masteredSentences
        });
        console.log('=== markAsMastered END ===');
    }

    nextQuestion() {
        console.log('=== nextQuestion START ===');
        
        // 防止快速连续调用
        if (this.isTransitioning) {
            console.log('Already transitioning to next question, ignoring call');
            return;
        }
        this.isTransitioning = true;

        // 获取必要的DOM元素
        const answerDisplay = document.querySelector('.answer-display');
        const inputArea = document.querySelector('.input-area');
        const character = document.querySelector('.character');
        const functionButtons = document.querySelector('.function-buttons');
        
        if (!answerDisplay || !inputArea || !character) {
            console.error('Required elements not found in nextQuestion');
            this.isTransitioning = false;
            return;
        }

        // 隐藏答案显示区域
        answerDisplay.classList.remove('show');
        answerDisplay.style.display = 'none';
        answerDisplay.innerHTML = '';
        
        // 检查是否是最后一个问题
        if (this.currentQuestionIndex >= this.questions.length - 1) {
            console.log('Course complete, showing completion screen');
            this.showComplete();
            this.isTransitioning = false;
            return;
        }

        // 增加题目索引并显示下一题
        this.currentQuestionIndex++;
        console.log('Moving to next question:', this.currentQuestionIndex);
        
        // 显示输入区域和功能按钮
        inputArea.style.display = 'flex';
        character.style.display = 'block';
        if (functionButtons) {
            functionButtons.style.display = 'flex';
        }
        
        // 显示下一题
        this.showQuestion();
        
        // 重置转换状态
        setTimeout(() => {
            this.isTransitioning = false;
        }, 500);
        
        console.log('=== nextQuestion END ===');
    }

    showError() {
        const input = document.querySelector('.input-area input');
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 500);
    }

    showHint() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        const input = document.querySelector('.input-area input');
        input.value = currentQuestion.hiragana;
    }

    playSound() {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        if (currentQuestion) {
            this.speak(currentQuestion.character);
        }
    }
  

    showComplete() {
        try {
            // 只统计 split 类型的题目数量
            const splitQuestions = this.questions.filter(q => q.type === 'split');
            const splitCount = splitQuestions.length;
            
            console.log('Course completion details:', {
                course: this.course,
                lesson: this.lesson,
                totalQuestions: this.questions.length,
                splitCount: splitCount
            });
            
            // 保存课程数据到 localStorage
            const courseKey = `course_${this.course}_${this.lesson}`;
            localStorage.setItem(courseKey, JSON.stringify({
                questions: this.questions,
                title: document.querySelector('.lesson-info span')?.textContent || ''
            }));

            // 标记课程为已完成
            const completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '{}');
            if (!completedLessons[this.course]) {
                completedLessons[this.course] = [];
            }
            if (!completedLessons[this.course].includes(this.lesson)) {
                completedLessons[this.course].push(this.lesson);
                localStorage.setItem('completedLessons', JSON.stringify(completedLessons));
                
                // 触发自定义事件通知课程列表更新
                const event = new CustomEvent('lessonCompleted', {
                    detail: {
                        course: this.course,
                        lesson: this.lesson
                    }
                });
                window.dispatchEvent(event);
            }
            
            // 更新统计，只传递 split 类型的题目
            const lessonId = `${this.course}:${this.lesson}`;
            const updatedTotal = statsData.updateDailyStats(lessonId, splitCount, splitQuestions);
            
            // 验证数据保存
            console.log('Statistics updated:', {
                lessonId,
                splitCount,
                updatedTotal
            });

            // 隐藏练习相关的元素
            const practiceElements = document.querySelectorAll('.character, .input-area, .answer-display, .previous-question');
            practiceElements.forEach(element => {
                if (element) element.style.display = 'none';
            });

            // 创建完成界面
            const completeScreen = document.createElement('div');
            completeScreen.className = 'completion-screen';
            completeScreen.innerHTML = `
                <h1>おめでとう！</h1>
                <p>课程完成！</p>
                <p>今日已学习: ${splitCount} 个句子</p>
                <p>连续学习: ${statsData.getLearningDays()} 天</p>
                <div class="button-group">
                    <button class="restart-btn" onclick="location.reload()">重新开始</button>
                    <button class="next-lesson-btn">下一课</button>
                    <button class="return-btn" onclick="window.location.href='/typingJapanese/'">返回首页</button>
                </div>
            `;

            // 添加到页面
            const practiceContainer = document.querySelector('.practice-container');
            if (practiceContainer) {
                practiceContainer.innerHTML = '';
                practiceContainer.appendChild(completeScreen);
            }
            // 创建彩花和星星效果
            this.createConfetti(completeScreen);
            this.createStars(completeScreen);
            // 绑定下一课按钮事件
            const nextLessonBtn = completeScreen.querySelector('.next-lesson-btn');
            if (nextLessonBtn) {
                nextLessonBtn.onclick = async () => {
                    try {
                        // 直接从当前课程信息构建下一课
                        const currentLessonNumber = parseInt(this.lesson.replace('lesson', ''));
                        const nextLessonNumber = currentLessonNumber + 1;
                        const nextLesson = `lesson${nextLessonNumber}`;

                        // 验证下一课是否存在
                        try {
                            // 尝试加载下一课的数据来验证其存在性
                            await DataLoader.getCourseWithLessonData(this.course, nextLesson);
                            
                            // 如果成功加载，则跳转到下一课
                            console.log('Navigating to next lesson:', {
                                course: this.course,
                                currentLesson: this.lesson,
                                nextLesson: nextLesson
                            });
                            
                            // 使用基于域名的绝对路径
                            window.location.href = `/typingJapanese/practice/practice.html?course=${this.course}&lesson=${nextLesson}`;
                        } catch (loadError) {
                            // 如果无法加载下一课，说明已经是最后一课
                            console.log('No more lessons available:', loadError);
                            alert('恭喜！您已完成本课程的所有课时！');
                            window.location.href = '/typingJapanese/';
                        }
                    } catch (error) {
                        console.error('Error navigating to next lesson:', error);
                        console.error('Course:', this.course);
                        console.error('Current lesson:', this.lesson);
                        alert('无法加载下一课，请返回首页重试');
                        window.location.href = '/typingJapanese/';
                    }
                };
            }
            // 播放掌声和祝贺音效
            const applause = new Audio('assets/audio/applause.mp3');
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
            alert('完成界面显示出错，但您已完成本课程！');
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

    checkSplitAnswer() {
        const question = this.questions[this.currentQuestionIndex];
        const inputs = document.querySelectorAll('.split-input');
        const answers = Array.from(inputs).map(input => input.value.trim());
        
        // 获取正确答案数组
        const correctAnswers = question.answers.split('|').map(answer => {
            const [kana, romaji] = answer.split(':');
            return kana;
        });

        console.log('Checking answers:', {
            userAnswers: answers,
            correctAnswers: correctAnswers
        });

        // 检查每个答案并标记
        const allCorrect = answers.every((answer, index) => {
            const correctAnswer = correctAnswers[index];
            const input = inputs[index];
            const isCorrect = answer === correctAnswer;

            // 根据正确与否设置样式
            if (isCorrect) {
                input.classList.remove('error');
                input.classList.add('correct');
            } else {
                input.classList.add('error');
                input.classList.remove('correct');
                console.log(`Answer at index ${index} is wrong:`, {
                    userAnswer: answer,
                    correctAnswer: correctAnswer
                });
            }

            return isCorrect;
        });

        if (allCorrect) {
            // 更新历史记录
            this.updateHistory(question);
            
            // 显示答案区域
            const answerDisplay = document.querySelector('.answer-display');
            const inputArea = document.querySelector('.input-area');
            const character = document.querySelector('.character');
            const functionButtons = document.querySelector('.function-buttons');
            
            // 隐藏输入区域和字符
            inputArea.style.display = 'none';
            character.style.display = 'none';
            functionButtons.style.display = 'none'; // 隐藏功能按钮组

            // 清空并显示答案区域
            answerDisplay.innerHTML = '';
            answerDisplay.style.display = 'block';
            answerDisplay.classList.add('show');
            
            // 创建答案内容区域
            const answerContent = document.createElement('div');
            answerContent.className = 'answer-content';
            
            // 更新答案内容
            answerContent.innerHTML = `
                <div class="kanji-text">${question.character}</div>
                <div class="kana-text">${question.hiragana}</div>
                <div class="romaji-text">${question.romaji}</div>
                <div class="meaning-text">${question.meaning}</div>
            `;

            // 直接添加答案内容，不添加按钮
            answerDisplay.appendChild(answerContent);
            
            // 播放声音
            this.speak(question.character);

            // 防止重复调用nextQuestion
            if (this.nextQuestionTimer) {
                clearTimeout(this.nextQuestionTimer);
            }
            
            // 2秒后进入下一题
            this.nextQuestionTimer = setTimeout(() => {
                this.nextQuestion();
            }, 2000);
        } else {
            // 显示错误动画
            inputs.forEach(input => {
                if (input.classList.contains('error')) {
                    input.classList.add('shake');
                    setTimeout(() => input.classList.remove('shake'), 500);
                }
            });
        }
    }

    // 在 PracticeManager 类中添加新方法
    adjustInputWidth(input) {
        // 创建一个隐藏的 span 来测量文本宽度
        const measureSpan = document.createElement('span');
        measureSpan.style.visibility = 'hidden';
        measureSpan.style.position = 'absolute';
        measureSpan.style.whiteSpace = 'pre';
        measureSpan.style.font = window.getComputedStyle(input).font;
        document.body.appendChild(measureSpan);

        // 更新测量 span 的内容并获取宽度
        const updateWidth = () => {
            const value = input.value || input.placeholder;
            measureSpan.textContent = value || 'ああああ';  // 默认5个字符宽度
            const width = measureSpan.offsetWidth;
            input.style.width = `${Math.max(width + 16, 80)}px`; // 最小宽度改为80px
        };

        // 初始化宽度
        updateWidth();

        // 监听输入事件
        input.addEventListener('input', updateWidth);
        
        // 清理函数
        return () => {
            document.body.removeChild(measureSpan);
            input.removeEventListener('input', updateWidth);
        };
    }

    // 切换侧边栏显示状态
    toggleSplitList() {
        const sidebar = document.getElementById('splitListSidebar');
        if (!sidebar) return;

        this.isSidebarOpen = !this.isSidebarOpen;
        if (this.isSidebarOpen) {
            sidebar.classList.add('show');
            this.updateSplitList();
        } else {
            sidebar.classList.remove('show');
        }
    }

    // 更新分句列表内容
    updateSplitList() {
        const sidebarContent = document.querySelector('.sidebar-content');
        if (!sidebarContent) return;

        // 清空现有内容
        sidebarContent.innerHTML = '';

        // 筛选所有分句练习题目
        const splitQuestions = this.questions.filter(q => q.type === 'split');
        
        // 创建列表内容
        splitQuestions.forEach((question, index) => {
            const item = document.createElement('div');
            item.className = 'split-item';
            item.innerHTML = `
                <div class="japanese">${question.character}</div>
                <div class="meaning">${question.meaning}</div>
            `;

            // 点击跳转到对应题目
            item.addEventListener('click', () => {
                this.currentQuestionIndex = this.questions.indexOf(question);
                this.showQuestion();
                this.toggleSplitList(); // 关闭侧边栏
            });

            sidebarContent.appendChild(item);
        });

        // 如果没有分句练习
        if (splitQuestions.length === 0) {
            sidebarContent.innerHTML = '<div class="split-item">当前课程没有分句练习</div>';
        }
    }

    // 添加更新历史记录的方法
    updateHistory(question) {
        const historyContent = document.querySelector('.history-content');
        // 清空之前的历史记录
        historyContent.innerHTML = '';
        
        // 创建新的历史记录项
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const japanese = document.createElement('div');
        japanese.className = 'japanese';
        japanese.textContent = question.character || question.hiragana;
        
        const meaning = document.createElement('div');
        meaning.className = 'meaning';
        meaning.textContent = question.meaning;
        
        historyItem.appendChild(japanese);
        historyItem.appendChild(meaning);
        
        // 添加到历史记录区域
        historyContent.appendChild(historyItem);
    }

    // 绑定完成事件
    bindCompletionEvents() {
        // 监听最后一个句子完成的事件
        document.addEventListener('lastSentenceCompleted', async () => {
            await this.completePractice();
        });
    }

    async completePractice() {
        try {
            // 添加调试日志
            console.log('Starting completePractice with:', {
                sentences: this.sentences,
                courseId: this.courseId,
                lessonId: this.lessonId
            });

            // 更新统计数据
            statsData.addLearningRecord(this.sentences.map(sentence => ({
                id: `${this.courseId}_${this.lessonId}_${sentence.index}`,
                text: sentence.japanese,
                translation: sentence.chinese
            })));
            
            // 更新课程完成状态
            const completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '{}');
            if (!completedLessons[this.courseId]) {
                completedLessons[this.courseId] = [];
            }
            if (!completedLessons[this.courseId].includes(this.lessonId)) {
                completedLessons[this.courseId].push(this.lessonId);
            }
            localStorage.setItem('completedLessons', JSON.stringify(completedLessons));

            // 添加调试日志
            console.log('Practice completed:', {
                courseId: this.courseId,
                lessonId: this.lessonId,
                sentencesCount: this.sentences.length
            });

            // 触发完成事件
            window.dispatchEvent(new Event('lessonCompleted'));
        } catch (error) {
            console.error('Error in completePractice:', error);
        }
    }
}

// 修改初始化方式
window.addEventListener('DOMContentLoaded', () => {
    window.practiceManager = new PracticeManager();
});

// 检查题目数据结构
function generateQuestion(data, index, courseKey) {
    // 使用课程标识+序号作为ID
    const questionId = data.id || `${courseKey}_q${index + 1}`;
    return {
        id: questionId,
        type: 'split',
        character: data.character,
        hiragana: data.hiragana,
        meaning: data.meaning,
        romaji: data.romaji
    };
}

// 在加载课程时使用
function loadLesson(course, lesson) {
    const questions = lessonData.questions.map(q => generateQuestion(q));
    // ... 其他代码 ...
}

// 在完成练习时调用
function completePractice() {
    const stats = new Statistics();
    // sentences 是本次学习的句子数组，每个句子包含 id, text, translation
    stats.addLearningRecord(sentences);
    
    // 其他完成逻辑...
}