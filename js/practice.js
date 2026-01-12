// 课程数据结构
const courseData = {
    // 标准日本语初级（上）
    'standard-basic-1': {
        name: '标准日本语初级（上）',
        courses: {
            'kimochi': {
                name: '気持ち',
                description: '表达感受的词汇',
                lessons: {
                    'Lesson1': {
                        title: '第1课 - 基本表达',
                        description: '学习表达喜欢和讨厌的基本句型',
                        sentences: []
                    },
                    'Lesson2': {
                        title: '第2课 - 程度表达',
                        description: '学习表达喜欢程度的句型',
                        sentences: []
                    }
                }
            },
            'gimon': {
                name: '疑問詞',
                description: '疑问词练习',
                lessons: {
                    'Lesson1': {
                        title: '第1课 - 基本疑问词',
                        description: '学习基本疑问句型',
                        sentences: []
                    }
                }
            }
        }
    },
    // 词组记单词
    'word-group': {
        name: '词组记单词',
        courses: {
            "huku": {
                "name": "服",
                "description": "服装相关表达",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 上装",
                        "description": ""
                    },
                    "lesson2": {
                        "title": "第2课 - 下装",
                        "description": ""
                    },
                    "lesson3": {
                        "title": "第3课 - 配饰",
                        "description": ""
                    },
                    "lesson4": {
                        "title": "第4课 - 化妆防晒等",
                        "description": ""
                    },
                    "lesson5": {
                        "title": "第5课 - 服饰词汇",
                        "description": ""
                    }
                }
            },
            "syoku": {
                "name": "食",
                "description": "吃，饮食方面",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 口味",
                        "description": ""
                    },
                    "lesson2": {
                        "title": "第2课 - 做饭烧水等动作",
                        "description": ""
                    },
                    "lesson3": {
                        "title": "第3课 - 做饭点火",
                        "description": ""
                    }
                }
            },
            "sumu": {
                "name": "住",
                "description": "房屋居家行为",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 房子布局",
                        "description": ""
                    },
                    "lesson2": {
                        "title": "第2课 - 居家日常",
                        "description": ""
                    },
                    "lesson3": {
                        "title": "第3课 - 电力垃圾等",
                        "description": ""
                    }
                }
            },
            "koutsuu": {
                "name": "交通",
                "description": "交通出行",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 开车",
                        "description": ""
                    },
                    "lesson2": {
                        "title": "第2课 - 坐车",
                        "description": ""
                    },
                    "lesson3": {
                        "title": "第3课 - 路况",
                        "description": ""
                    }
                }
            },
            "gakkou": {
                "name": "学校",
                "description": "学校",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 上学",
                        "description": ""
                    },
                    "lesson2": {
                        "title": "第2课 - 学习作业",
                        "description": ""
                    }
                }
            },
            "shigoto": {
                "name": "工作",
                "description": "工作",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 公司工作行为",
                        "description": ""
                    },
                    "lesson2": {
                        "title": "第2课 - 工资",
                        "description": ""
                    }
                }
            },
            "okane": {
                "name": "钱、购物",
                "description": "钱、购物",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 金钱储蓄",
                        "description": ""
                    }
                }
            },
            "tsuushin": {
                "name": "情报通信",
                "description": "情报通信",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 电脑手机",
                        "description": ""
                    },
                    "lesson2": {
                        "title": "第2课 - 数据文件",
                        "description": ""
                    },
                    "lesson3": {
                        "title": "第3课 - 网络邮件",
                        "description": ""
                    }
                }
            },
            "jikan": {
                "name": "计划",
                "description": "计划",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 时间日期",
                        "description": ""
                    },
                    "lesson2": {
                        "title": "第2课 - 计划预定",
                        "description": ""
                    },
                    "lesson3": {
                        "title": "第3课 - 说明缘由",
                        "description": ""
                    }
                }
            },
            "tomodachi": {
                "name": "人际交往",
                "description": "人际交往",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 恋人关系",
                        "description": ""
                    },
                    "lesson2": {
                        "title": "第2课 - 人际交往",
                        "description": ""
                    }
                }
            },
            "kyoumi": {
                "name": "兴趣爱好",
                "description": "兴趣爱好",
                "lessons": {}
            },
            "tenki": {
                "name": "天气",
                "description": "天气",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 自然天气",
                        "description": ""
                    }
                }
            },
            "saigai": {
                "name": "自然灾害",
                "description": "自然灾害",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 自然灾害",
                        "description": ""
                    }
                }
            },
            "karada": {
                "name": "身体",
                "description": "身体",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 身体",
                        "description": ""
                    }
                }
            },
            "byouki": {
                "name": "生病健康",
                "description": "生病健康",
                "lessons": {
                    "lesson1": {
                        "title": "第1课 - 生病",
                        "description": ""
                    }
                }
            }
        }
    }
};

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
        this.type = urlParams.get('type') || 'standard'; // 添加类型参数
        
        this.totalSentences = 0;
        this.completedSentences = 0;
        
        this.init();
        
        // 绑定完成事件
        this.bindCompletionEvents();
    }

    async init() {
        try {
            // 根据类型加载不同的数据
            if (this.type === 'custom') {
                await this.loadCustomCollection();
            } else {
                await this.loadStandardCourse();
            }
            
            this.showQuestion();
            this.updateProgress();
        } catch (error) {
            console.error('Error in init:', error);
            this.showError('加载课程失败，请刷新重试');
        }
    }

    async loadCustomCollection() {
        if (!window.customCollections) {
            throw new Error('Custom collections not initialized');
        }

        const collection = window.customCollections.collections[this.currentCourse];
        if (!collection) {
            throw new Error('Collection not found');
        }

        // 更新页面信息
        document.querySelector('.book-name').textContent = '自定义收藏';
        document.querySelector('.course-name').textContent = collection.name;
        document.querySelector('.lesson-progress').textContent = '练习模式';

        // 将收藏夹中的句子转换为练习题目
        this.questions = Object.values(collection.sentences).map(sentence => ({
            type: 'split',
            character: sentence.japanese,
            hiragana: sentence.hiragana,
            romaji: sentence.romaji,
            meaning: sentence.meaning,
            answers: [sentence.japanese, sentence.hiragana]
        }));

        // 随机打乱题目顺序
        this.questions.sort(() => Math.random() - 0.5);
    }

    async loadStandardCourse() {
        const courseData = await DataLoader.getCourseWithLessonData(this.currentCourse, this.currentLesson);
        if (!courseData) {
            throw new Error('Course data not found');
        }

        // 更新页面信息
        document.querySelector('.book-name').textContent = courseData.course.name;
        document.querySelector('.course-name').textContent = courseData.course.name;
        document.querySelector('.lesson-progress').textContent = courseData.lesson.title;

        // 加载标准课程的题目
        this.questions = courseData.lesson.sentences.map(sentence => ({
            type: 'split',
            character: sentence.japanese,
            hiragana: sentence.hiragana,
            romaji: sentence.romaji,
            meaning: sentence.meaning,
            answers: [sentence.japanese, sentence.hiragana]
        }));
    }

    // ... 其他现有方法 ...

    async completePractice() {
        try {
            // 根据类型执行不同的完成逻辑
            if (this.type === 'custom') {
                // 自定义收藏夹完成逻辑
                const collection = window.customCollections.collections[this.currentCourse];
                statsData.addLearningRecord(
                    Object.values(collection.sentences).map(sentence => ({
                        id: `custom_${this.currentCourse}_${sentence.japanese}`,
                        text: sentence.japanese,
                        translation: sentence.meaning
                    }))
                );
            } else {
                // 标准课程完成逻辑
                const completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '{}');
                if (!completedLessons[this.currentCourse]) {
                    completedLessons[this.currentCourse] = [];
                }
                if (!completedLessons[this.currentCourse].includes(this.currentLesson)) {
                    completedLessons[this.currentCourse].push(this.currentLesson);
                }
                localStorage.setItem('completedLessons', JSON.stringify(completedLessons));
                
                // 更新统计数据并触发全局事件
                const stats = statsData.getStatistics();
                stats.completedLessons = completedLessons;
                statsData.saveStatistics(stats);
                window.dispatchEvent(new CustomEvent('statisticsUpdated', { detail: { stats } }));
            }

            // 触发完成事件
            window.dispatchEvent(new Event('lessonCompleted'));
        } catch (error) {
            console.error('Error in completePractice:', error);
        }
    }

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
            
            // 根据类型显示不同的完成信息
            const splitCount = this.questions.filter(q => q.type === 'split').length;
            completeScreen.innerHTML = `
                <h1>🎉 课程完成!</h1>
                <p>本次练习: ${splitCount} 个句子</p>
                <div class="button-group">
                    <button class="restart-btn completion-btn">复习本课程</button>
                    <button class="next-lesson-btn completion-btn" style="display: none;">下一课</button>
                    <button class="return-btn completion-btn" onclick="window.location.href='../'">返回首页</button>
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

            // 重新学习按钮
            const restartBtn = completeScreen.querySelector('.restart-btn');
            if (restartBtn) restartBtn.onclick = () => location.reload();

            // 动态显示“下一课”按钮
            const nextLessonBtn = completeScreen.querySelector('.next-lesson-btn');
            if (this.type === 'standard' && nextLessonBtn) {
                const currentLessonNum = parseInt(this.currentLesson.replace('lesson', ''));
                const nextLessonId = `lesson${currentLessonNum + 1}`;
                
                // 检查下一课是否存在
                if (courseData[this.currentCourse]?.lessons[nextLessonId]) {
                    nextLessonBtn.style.display = 'inline-block';
                    nextLessonBtn.onclick = () => {
                        window.location.href = `practice.html?course=${this.currentCourse}&lesson=${nextLessonId}`;
                    };
                } else {
                    // 如果是最后一课，可以考虑显示“返回课程列表”等
                    console.log('This is the last lesson of the course.');
                }
            }
        } catch (error) {
            console.error('Error in showComplete:', error);
        }
        
                 // 同步到云端
                 console.log('%c[PRACTICE COMPLETE] ready to push stats', 'background:yellow;color:black');
                 statsData.saveStatistics(statsData.getStatistics());   // 先走统一入口
                // 防守：如果内部仍未找到函数，再直接 push
                if (typeof window.saveDataToFirebase === 'function') {
                    window.saveDataToFirebase('typing_statistics',
                     localStorage.getItem('typing_statistics'));
                    }
    }
   
}

export function initializePractice(courseId, lessonId) {
    // 获取DOM元素
    const bookNameElement = document.querySelector('.book-name');
    const courseNameElement = document.querySelector('.course-name');
    const lessonProgressElement = document.querySelector('.lesson-progress');
    const japaneseTextElement = document.querySelector('.japanese-text');
    const meaningTextElement = document.querySelector('.meaning-text');
    const typingInput = document.getElementById('typingInput');
    const hintButton = document.querySelector('.hint-btn');
    const skipButton = document.querySelector('.skip-btn');
    const nextButton = document.querySelector('.next-btn');
    const progressBar = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

    // 当前练习状态
    let currentState = {
        currentSentenceIndex: 0,
        sentences: [],
        correctCount: 0
    };

    // 加载课程数据
    function loadCourseData() {
        // 这里应该从后端API获取数据，现在先用模拟数据
        const course = courseData[courseId];
        if (!course) {
            console.error('Course not found:', courseId);
            return;
        }

        // 更新页面信息
        bookNameElement.textContent = course.name;
        courseNameElement.textContent = course.name;
        lessonProgressElement.textContent = course.lessons[lessonId].title;

        // 加载句子数据
        currentState.sentences = course.lessons[lessonId].sentences || [];
        updateProgress();
        showNextSentence();
    }

    // 显示下一个句子
    function showNextSentence() {
        if (currentState.currentSentenceIndex >= currentState.sentences.length) {
            // 练习完成
            finishPractice();
            return;
        }

        const sentence = currentState.sentences[currentState.currentSentenceIndex];
        japaneseTextElement.textContent = sentence.japanese;
        meaningTextElement.textContent = sentence.meaning;
        typingInput.value = '';
        typingInput.focus();
    }

    // 检查输入
    function checkInput() {
        const currentSentence = currentState.sentences[currentState.currentSentenceIndex];
        if (typingInput.value.trim() === currentSentence.japanese.trim()) {
            // 答对了
            currentState.correctCount++;
            typingInput.classList.add('correct');
            nextButton.style.display = 'block';
            updateProgress();
            statsData.addReviewItem(currentSentence);
            statsData.updateDisplay();
        }
    }

    // 更新进度
    function updateProgress() {
        const progress = (currentState.currentSentenceIndex / currentState.sentences.length) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${currentState.currentSentenceIndex}/${currentState.sentences.length}`;
    }

    // 完成练习
    function finishPractice() {
        // 显示完成信息
        japaneseTextElement.textContent = '练习完成！';
        meaningTextElement.textContent = `正确率: ${(currentState.correctCount / currentState.sentences.length * 100).toFixed(1)}%`;
        typingInput.style.display = 'none';
        hintButton.style.display = 'none';
        skipButton.style.display = 'none';
        statsData.updateDailyStats(
            `${courseId}:${lessonId}`,
            currentState.sentences.length,
            currentState.sentences
        );
    }

    // 事件监听
    typingInput.addEventListener('input', checkInput);
    
    hintButton.addEventListener('click', () => {
        const currentSentence = currentState.sentences[currentState.currentSentenceIndex];
        // 显示提示信息
    });

    skipButton.addEventListener('click', () => {
        currentState.currentSentenceIndex++;
        showNextSentence();
    });

    nextButton.addEventListener('click', () => {
        currentState.currentSentenceIndex++;
        nextButton.style.display = 'none';
        typingInput.classList.remove('correct');
        showNextSentence();
    });

    // 初始化
    loadCourseData();
}
// 在完成练习时调用
function showComplete(course, lesson, stats) {
    try {
        const sentences = lesson.sentences || [];
        statsData.updateDailyStats(
            `${course.id}:${lesson.id}`,
            sentences.length,
            sentences
        );
        // ... 其他完成逻辑 ...
    } catch (error) {
        console.error('Error in showComplete:', error);
    }
} 
       