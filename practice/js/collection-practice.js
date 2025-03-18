import { PracticeManager } from './practice.js';

class CollectionPracticeManager extends PracticeManager {
    constructor() {
        super();
        this.collectionId = null;
        this.collectionData = null;
        this.init();
    }

    async init() {
        try {
            // 从 URL 获取收藏夹 ID
            const urlParams = new URLSearchParams(window.location.search);
            this.collectionId = urlParams.get('collection');
            
            if (!this.collectionId) {
                throw new Error('Collection ID is missing');
            }

            // 从 localStorage 获取收藏夹数据
            const collections = JSON.parse(localStorage.getItem('customCollections') || '{}');
            this.collectionData = collections[this.collectionId];

            if (!this.collectionData) {
                throw new Error('Collection not found');
            }

            // 将收藏夹中的句子转换为练习题目格式
            this.questions = this.collectionData.sentences.map((sentence, index) => ({
                type: 'split',
                character: sentence.japanese,
                hiragana: sentence.hiragana,
                meaning: sentence.meaning,
                romaji: sentence.romaji,
                answers: sentence.hiragana // 使用平假名作为答案
            }));

            // 更新页面标题
            document.querySelector('h1').textContent = `${this.collectionData.name} - 练习`;

            // 初始化练习
            this.currentQuestionIndex = 0;
            this.totalSentences = this.questions.length;
            this.completedSentences = 0;

            // 显示第一个题目
            this.showQuestion();

            // 绑定事件监听器
            this.bindEvents();

        } catch (error) {
            console.error('Error in CollectionPracticeManager init:', error);
            alert('加载收藏夹失败，请返回重试');
            window.location.href = '/typingJapanese/';
        }
    }

    // 重写 showComplete 方法以适应收藏夹练习
    showComplete() {
        try {
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
                <p>练习完成！</p>
                <p>今日已学习: ${this.questions.length} 个句子</p>
                <p>连续学习: ${this.getLearningDays()} 天</p>
                <div class="button-group">
                    <button class="restart-btn" onclick="location.reload()">重新开始</button>
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
            alert('完成界面显示出错，但您已完成练习！');
        }
    }

    // 获取学习天数
    getLearningDays() {
        const stats = JSON.parse(localStorage.getItem('learningStats') || '{}');
        return stats.learningDays || 0;
    }
}

// 初始化收藏夹练习
window.addEventListener('DOMContentLoaded', () => {
    window.practiceManager = new CollectionPracticeManager();
}); 