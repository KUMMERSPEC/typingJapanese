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
        statsData.updateDailyStats(lessonId, currentState.correctCount, currentState.sentences);
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