import statistics from '../common/statistics.js';

class ReviewManager {
    constructor() {
        this.currentIndex = 0;
        this.sentences = [];
        this.init();
    }

    init() {
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

            // 绑定输入事件
            const input = document.querySelector('.split-input');
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.checkAnswer();
                    }
                });
            }

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

        // 显示问题
        const characterElement = document.querySelector('.character');
        if (characterElement) {
            characterElement.textContent = current.japanese;
        }

        // 清空并聚焦输入框
        const input = document.querySelector('.split-input');
        if (input) {
            input.value = '';
            input.focus();
        }
    }

    checkAnswer() {
        const input = document.querySelector('.split-input');
        const current = this.sentences[this.currentIndex];
        
        if (!input || !current) return;

        const isCorrect = input.value === current.hiragana;
        
        // 更新复习记录
        statistics.updateReviewRecord(current.id, isCorrect);

        // 显示答案
        this.showAnswer(current, isCorrect);
    }

    showAnswer(question, isCorrect) {
        // ... 显示答案的代码 ...
        setTimeout(() => {
            if (this.currentIndex < this.sentences.length - 1) {
                this.currentIndex++;
                this.showQuestion();
            } else {
                this.showComplete();
            }
        }, 2000);
    }

    showHint() {
        const current = this.sentences[this.currentIndex];
        if (current) {
            const input = document.querySelector('.split-input');
            if (input) {
                input.value = current.hiragana;
            }
        }
    }

    playSound() {
        const current = this.sentences[this.currentIndex];
        if (current) {
            const utterance = new SpeechSynthesisUtterance(current.japanese);
            utterance.lang = 'ja-JP';
            window.speechSynthesis.speak(utterance);
        }
    }
}

// 创建全局实例
window.reviewManager = new ReviewManager(); 