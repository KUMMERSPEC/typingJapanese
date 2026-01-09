import DataLoader from './dataLoader.js';
import statsData from '../../js/common/statsData.js';

// #region UTILITY FUNCTIONS
const PUNCT_RE = /^[、。！？….,，;；:：!！?？"“”「」『』]+$/;

function stripPunctArr(arr) {
    return arr.filter(u => u && !PUNCT_RE.test(u));
}

function getUrlParams() {
    const p = new URLSearchParams(window.location.search);
    return {
        course: p.get('course'),
        lesson: p.get('lesson'),
        collection: p.get('collection'),
        type: p.get('type')
    };
}

function adjustInputWidth(input) {
    const measureSpan = document.createElement('span');
    measureSpan.style.visibility = 'hidden';
    measureSpan.style.position = 'absolute';
    measureSpan.style.whiteSpace = 'pre';
    measureSpan.style.font = window.getComputedStyle(input).font;
    document.body.appendChild(measureSpan);

    const updateWidth = () => {
        const value = input.value || input.placeholder || 'ああああ';
        measureSpan.textContent = value;
        const width = measureSpan.offsetWidth;
        input.style.width = `${Math.max(width + 16, 80)}px`;
    };

    updateWidth();
    input.addEventListener('input', updateWidth);

    return () => {
        document.body.removeChild(measureSpan);
        input.removeEventListener('input', updateWidth);
    };
}
// #endregion

export class PracticeManager {
    constructor() {
        this.params = getUrlParams();
        this.$ = this._cacheDom();

        this.currentQuestionIndex = 0;
        this.questions = [];
        this.score = 0;
        this.totalSentences = 0;
        this.completedSentences = 0;
        this.isSidebarOpen = false;
        this.isTransitioning = false;
        this.nextQuestionTimer = null;

        this.speechSynthesis = window.speechSynthesis;
        this.japaneseVoice = null;

        this.init();
    }

    _cacheDom() {
        return {
            lessonTitle: document.querySelector('.lesson-info span'),
            char: document.querySelector('.character'),
            inputArea: document.querySelector('.input-area'),
            ansDisplay: document.querySelector('.answer-display'),
            funcBtns: document.querySelector('.function-buttons'),
            markBtn: document.querySelector('.function-buttons .mark-mastered-btn'),
            sidebar: document.getElementById('splitListSidebar'),
            sidebarContent: document.querySelector('.sidebar-content'),
            historyBox: document.querySelector('.history-content'),
            practiceContainer: document.querySelector('.practice-container'),
            audioButton: document.querySelector('.play-audio'),
        };
    }

    async init() {
        try {
            await this.initVoice();
            await this.loadQuestions();

            if (this.questions.length === 0) {
                alert('没有可练习的句子！');
                window.location.href = '../index.html';
                return;
            }

            this.totalSentences = this.questions.length;
            this.showQuestion();
            this.bindEvents();
            this.addCompletionStyles();

        } catch (error) {
            console.error('Error in init:', error);
            alert(`加载失败: ${error.message}，请返回重试`);
            window.location.href = '../index.html';
        }
    }

    async loadQuestions() {
        const { course, lesson, collection, type } = this.params;

        if (type === 'collection' || collection) {
            const collections = JSON.parse(localStorage.getItem('custom_collections') || '{}');
            const collectionData = collections[collection];
            if (!collectionData) throw new Error('Collection not found');

            this.questions = Object.values(collectionData.sentences).map(s => ({
                type: 'split',
                character: s.japanese,
                hiragana: s.hiragana,
                meaning: s.meaning,
                romaji: s.romaji,
                lang: s.lang || 'ja',
                answers: [s.japanese, s.hiragana]
            }));
            this.course = 'collection';
            this.lesson = collection;
            if (this.$.lessonTitle) this.$.lessonTitle.textContent = `${collectionData.name} (1/${this.questions.length})`;

        } else {
            if (!course || !lesson) throw new Error('Course or lesson parameter is missing');
            this.course = course;
            this.lesson = lesson;

            const lessonData = await DataLoader.getCourseWithLessonData(course, lesson);
            if (!lessonData?.questions?.length) throw new Error('Invalid or empty lesson data');

            const masteredSentences = JSON.parse(localStorage.getItem('masteredSentences') || '{}');
            this.questions = lessonData.questions.filter(q => {
                const key = `${course}:${lesson}:${q.character}`;
                return !masteredSentences[key];
            });
            if (this.$.lessonTitle) {
                const lessonNum = parseInt(this.lesson.replace('lesson', ''), 10);
                this.$.lessonTitle.textContent = `第${lessonNum}课 (1/${this.questions.length})`;
            }
        }
    }

    async initVoice() {
        if (!this.speechSynthesis) return;
        if (this.speechSynthesis.getVoices().length === 0) {
            await new Promise(resolve => {
                this.speechSynthesis.onvoiceschanged = resolve;
                setTimeout(resolve, 1000); // Timeout fallback
            });
        }
        const voices = this.speechSynthesis.getVoices();
        this.japaneseVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('ja')) || voices.find(v => v.lang.includes('ja') || v.lang.includes('JP')) || voices[0];
    }

    async speak(text, lang = 'ja') {
        try {
            const question = this.questions[this.currentQuestionIndex] || {};
            const textToSpeak = (lang === 'ja' ? (question.hiragana || question.character) : (question.character || text)).replace(/:/g, ' ');

            if (lang === 'ja') {
                const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(textToSpeak)}&le=jap&type=3`);
                await audio.play();
            } else {
                this.fallbackSpeak(textToSpeak, lang);
            }
        } catch (error) {
            console.warn('Audio playback failed, using fallback:', error);
            this.fallbackSpeak(text, lang);
        }
    }

    fallbackSpeak(text, lang = 'ja') {
        if (!this.speechSynthesis) return;
        this.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const langMap = { ja: 'ja-JP', en: 'en-US' };
        utterance.lang = langMap[lang] || 'en-US';
        const voices = this.speechSynthesis.getVoices();
        utterance.voice = voices.find(v => v.lang.toLowerCase().startsWith(utterance.lang.toLowerCase())) || this.japaneseVoice;
        this.speechSynthesis.speak(utterance);
    }

    showQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        if (!question) return;

        if (this.$.ansDisplay) this.$.ansDisplay.classList.remove('show');
        if (this.$.char) this.$.char.textContent = question.meaning;
        if (this.$.inputArea) this.$.inputArea.innerHTML = '';
        if (this.$.char) this.$.char.style.display = 'block';
        if (this.$.inputArea) this.$.inputArea.style.display = 'flex';

        const questionKey = `${this.course}:${this.lesson}:${question.character}`;
        if (this.$.markBtn) {
            this.$.markBtn.setAttribute('data-question', questionKey);
            const isMastered = JSON.parse(localStorage.getItem('masteredSentences') || '{}')[questionKey];
            this.$.markBtn.classList.toggle('mastered', !!isMastered);
            this.$.markBtn.innerHTML = `<span class="btn-icon">✓</span><span class="btn-text">${isMastered ? '已掌握' : '标记掌握'}</span><span class="btn-shortcut">Alt+M</span>`;
        }

        const mainContainer = document.createElement('div');
        mainContainer.className = 'main-input-container';
        mainContainer.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:15px; width:100%;';

        if (question.type === 'split') {
            const inputsContainer = document.createElement('div');
            inputsContainer.style.cssText = 'display:flex; flex-wrap:wrap; justify-content:center; gap:10px;';
            const words = question.hiragana.split(':');

            const processedWords = [];
            const punctRegex = /[、。！？….,，;；:：!！?？"“”「」『』]/g;
            words.forEach(unit => {
                if (!unit) return;
                const parts = unit.match(/[^、。！？….,，;；:：!！?？"“”「」『』]+|[、。！？….,，;；:：!！?？"“”「」『』]/g) || [unit];
                processedWords.push(...parts);
            });

            processedWords.forEach((word, index) => {
                if (PUNCT_RE.test(word) || word === '') {
                    const span = document.createElement('span');
                    span.className = 'punctuation-span';
                    span.textContent = word;
                    inputsContainer.appendChild(span);
                } else {
                    const input = this._createSplitInput(index, processedWords, question);
                    inputsContainer.appendChild(input);
                }
            });
            mainContainer.appendChild(inputsContainer);
        } else {
            // Non-split question: single input field
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'single-input';
            adjustInputWidth(input);

            const possibleAnswers = [question.hiragana, question.character, question.romaji].filter(Boolean);

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.showCorrectAnswer(question, true);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const ans = input.value.trim();
                    if (!ans) return;
                    if (possibleAnswers.includes(ans)) {
                        input.classList.add('correct');
                        this.showCorrectAnswer(question);
                        setTimeout(() => this.nextQuestion(), 2000);
                    } else {
                        input.classList.add('error');
                        setTimeout(() => input.classList.remove('error'), 500);
                    }
                }
            });

            mainContainer.appendChild(input);
        }

        if (this.$.inputArea) this.$.inputArea.appendChild(mainContainer);

        const firstInput = mainContainer.querySelector('input');
        if (firstInput) setTimeout(() => firstInput.focus(), 200);

        this.updateProgress();
    }

    _createSplitInput(index, words, question) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'split-input';
        input.dataset.index = index;
        adjustInputWidth(input);

        let isComposing = false;
        input.addEventListener('compositionstart', () => isComposing = true);
        input.addEventListener('compositionend', () => isComposing = false);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.showCorrectAnswer(question, true);
            } else if (e.code === 'Space' && !isComposing) {
                e.preventDefault();
                const nextInput = e.currentTarget.parentElement.nextElementSibling?.querySelector('input');
                nextInput?.focus();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const allInputs = Array.from(this.$.inputArea.querySelectorAll('.split-input'));
                const currentIndex = allInputs.indexOf(e.currentTarget);
                if (currentIndex < allInputs.length - 1) {
                    allInputs[currentIndex + 1].focus();
                } else {
                    this.checkSplitAnswer();
                }
            }
        });
        return input;
    }

    updateProgress() {
        if (!this.$.lessonTitle) return;
        const total = this.questions.length;
        const current = this.currentQuestionIndex + 1;
        const baseTitle = this.$.lessonTitle.textContent.split('(')[0].trim();
        this.$.lessonTitle.textContent = `${baseTitle} (${current}/${total})`;
    }

    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Control') {
                e.preventDefault();
                this.playSound();
            } else if ((e.key === 'm' || e.key === 'M') && e.altKey) {
                e.preventDefault();
                const currentQuestion = this.questions[this.currentQuestionIndex];
                if (currentQuestion) this.markAsMastered(currentQuestion);
            }
        });
        if (this.$.audioButton) {
            this.$.audioButton.addEventListener('click', () => this.playSound());
        }
    }

    checkSplitAnswer() {
        const inputs = Array.from(this.$.inputArea.querySelectorAll('.split-input'));
        const question = this.questions[this.currentQuestionIndex];
        const correctAnswers = stripPunctArr(question.hiragana.split(':'));
        let allCorrect = true;

        inputs.forEach((input, i) => {
            const isCorrect = input.value.trim() === (correctAnswers[i] || '');
            input.classList.toggle('correct', isCorrect);
            input.classList.toggle('error', !isCorrect);
            if (!isCorrect) allCorrect = false;
        });

        this.updateProficiency(question, allCorrect);

        if (allCorrect) {
            this.updateHistory(question);
            this.showCorrectAnswer(question);
            this.nextQuestionTimer = setTimeout(() => this.nextQuestion(), 2000);
        }
    }

    showCorrectAnswer(question, isTabPress = false) {
        if (this.nextQuestionTimer) clearTimeout(this.nextQuestionTimer);

        if (!this.$.ansDisplay || !this.$.inputArea || !this.$.char || !this.$.funcBtns) return;

        this.$.inputArea.style.display = 'none';
        this.$.char.style.display = 'none';
        this.$.funcBtns.style.display = 'none';

        this.$.ansDisplay.innerHTML = `
            <div class="answer-content">
                <div class="kanji-text">${question.character}</div>
                <div class="kana-text">${question.hiragana}</div>
                <div class="romaji-text">${question.romaji}</div>
                <div class="meaning-text">${question.meaning}</div>
            </div>`;
        this.$.ansDisplay.style.display = 'block';
        this.$.ansDisplay.classList.add('show');

        this.speak(question.character);

        if (isTabPress) {
            this.nextQuestionTimer = setTimeout(() => {
                this.$.ansDisplay.classList.remove('show');
                this.$.ansDisplay.style.display = 'none';
                this.$.inputArea.style.display = 'flex';
                this.$.char.style.display = 'block';
                this.$.funcBtns.style.display = 'flex';
                const firstInput = this.$.inputArea.querySelector('input');
                if (firstInput) firstInput.focus();
            }, 2000);
        }
    }

    markAsMastered(question) {
        if (!question) return;
        const masteredSentences = JSON.parse(localStorage.getItem('masteredSentences') || '{}');
        const key = `${this.course}:${this.lesson}:${question.character}`;
        const wasMarked = !!masteredSentences[key];

        if (wasMarked) {
            delete masteredSentences[key];
        } else {
            masteredSentences[key] = { timestamp: Date.now(), meaning: question.meaning };
            if (question.type === 'split') {
                // Simplified: Assume statsData handles duplicates and stats saving
                statsData.updateReviewProgress(key, true, { isNew: true, questionData: question });
            }
        }
        localStorage.setItem('masteredSentences', JSON.stringify(masteredSentences));

        if (this.$.markBtn) {
            this.$.markBtn.classList.toggle('mastered', !wasMarked);
            this.$.markBtn.innerHTML = `<span class="btn-icon">✓</span><span class="btn-text">${!wasMarked ? '已掌握' : '标记掌握'}</span><span class="btn-shortcut">Alt+M</span>`;
        }
    }

    nextQuestion() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        if (this.currentQuestionIndex >= this.questions.length - 1) {
            this.showComplete();
            this.isTransitioning = false;
            return;
        }

        this.currentQuestionIndex++;
        if (this.$.ansDisplay) {
            this.$.ansDisplay.classList.remove('show');
            this.$.ansDisplay.style.display = 'none';
        }
                // 显示输入区域和功能按钮
        this.$.inputArea.style.display = 'flex';
        this.$.char.style.display = 'block';
        this.$.funcBtns.style.display = 'flex';   // ★ 确保按钮重新显示
        this.showQuestion();

        setTimeout(() => { this.isTransitioning = false; }, 500);
    }

    playSound() {
        const question = this.questions[this.currentQuestionIndex];
        if (question) this.speak(question.character);
    }

    showComplete() {
        const splitCount = this.questions.filter(q => q.type === 'split').length;
        if (this.course && this.lesson && this.course !== 'collection') {
            statsData.updateDailyStats(`${this.course}:${this.lesson}`, splitCount, this.questions);
        }

        const completeScreen = document.createElement('div');
        completeScreen.className = 'complete-screen';
        completeScreen.innerHTML = `
            <div class="complete-content">
                <h2>🎉 课程完成！</h2>
                <p>本次练习: ${splitCount} 个句子</p>
                <div class="button-group">
                    <button class="review-btn">复习本课程</button>
                    <button class="next-lesson-btn" style="display:none;">下一课</button>
                    <button class="next-btn">返回首页</button>
                </div>
            </div>`;

        if (this.$.practiceContainer) {
            this.$.practiceContainer.innerHTML = ''; // Clear previous content
            this.$.practiceContainer.appendChild(completeScreen);
        }

        this.createConfetti(completeScreen);
        this.speak('おめでとうございます！');

        completeScreen.querySelector('.review-btn').addEventListener('click', () => location.reload());
        completeScreen.querySelector('.next-btn').addEventListener('click', () => window.location.href = '../index.html');

        const nextLessonBtn = completeScreen.querySelector('.next-lesson-btn');
        if (this.course !== 'collection') {
            const currentNum = parseInt(String(this.lesson).replace(/[^0-9]/g, ''), 10);
            const nextLessonId = `lesson${currentNum + 1}`;
            DataLoader.getCourseWithLessonData(this.course, nextLessonId).then(() => {
                nextLessonBtn.style.display = 'inline-flex';
                nextLessonBtn.addEventListener('click', () => {
                    const params = new URLSearchParams(window.location.search);
                    params.set('lesson', nextLessonId);
                    window.location.href = `${window.location.pathname}?${params.toString()}`;
                });
            }).catch(() => { /* No next lesson, button remains hidden */ });
        }
    }

    updateHistory(question) {
        if (!this.$.historyBox) return;
        this.$.historyBox.innerHTML = `
            <div class="history-item">
                <div class="japanese">${question.character || question.hiragana}</div>
                <div class="meaning">${question.meaning}</div>
            </div>`;
    }

    toggleSplitList() {
        if (!this.$.sidebar) return;
        this.isSidebarOpen = !this.isSidebarOpen;
        this.$.sidebar.classList.toggle('show', this.isSidebarOpen);
        if (this.isSidebarOpen) this.updateSplitList();
    }

    updateSplitList() {
        if (!this.$.sidebarContent) return;
        const splitQuestions = this.questions.filter(q => q.type === 'split');
        if (splitQuestions.length === 0) {
            this.$.sidebarContent.innerHTML = '<div class="split-item">当前课程没有分句练习</div>';
            return;
        }
        this.$.sidebarContent.innerHTML = splitQuestions.map((question) => `
            <div class="split-item" data-index="${this.questions.indexOf(question)}">
                <div class="japanese">${question.character}</div>
                <div class="meaning">${question.meaning}</div>
            </div>`).join('');
        
        this.$.sidebarContent.querySelectorAll('.split-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.currentQuestionIndex = parseInt(e.currentTarget.dataset.index, 10);
                this.showQuestion();
                this.toggleSplitList();
            });
        });
    }

    createConfetti(container) {
        const colors = ['#ff66ff', '#6b6bff', '#66ff66', '#ffeb3b', '#ff4444'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animation = `confettiFall ${1 + Math.random() * 2}s linear forwards`;
            confetti.style.animationDelay = Math.random() * 3 + 's';
            container.appendChild(confetti);
        }
    }

    addCompletionStyles() {
        const styleId = 'completion-styles';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .complete-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255, 255, 255, 0.9); z-index: 1000; }
            .complete-content { text-align: center; animation: fadeInUp 0.5s ease-out; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .button-group { display: flex; gap: 16px; margin-top: 24px; justify-content: center; }
            .review-btn, .next-btn, .next-lesson-btn { padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; }
            .review-btn { background: #4CAF50; color: white; }
            .next-btn, .next-lesson-btn { background: #2196F3; color: white; }
            .review-btn:hover, .next-btn:hover, .next-lesson-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .confetti { position: absolute; width: 10px; height: 10px; opacity: 0.8; transform: rotate(45deg); animation-timing-function: linear; }
            @keyframes confettiFall { from { top: -20px; transform: rotate(45deg); } to { top: 100vh; transform: rotate(765deg); } }`;
        document.head.appendChild(style);
    }
    
    // Deprecated methods, kept for compatibility, can be removed later
    bindCompletionEvents() {}
    updateProficiency(question, isCorrect) {
        // This logic is now part of statsData or should be
    }
}

if (window.location.pathname.includes('practice.html')) {
    window.addEventListener('DOMContentLoaded', () => {
        window.practiceManager = new PracticeManager();
    });
}
