import { courseData } from './courseData.js';

export class CourseDisplay {
    constructor() {
        try {
            this.selectedBook = localStorage.getItem('selectedBook') || 'word-group';
            this.courses = (courseData[this.selectedBook] || {}).courses || {};
            this.loadData();
            this.initializeEventListeners();
        } catch (error) {
            console.error('Error in CourseDisplay constructor:', error);
        }
    }

    initializeEventListeners() {
        window.addEventListener('collectionsUpdated', () => this.loadCourses());
        window.addEventListener('statisticsUpdated', () => this.loadCourses());
    }

    setBook(bookId) {
        if (!courseData[bookId]) return;
        this.selectedBook = bookId;
        localStorage.setItem('selectedBook', bookId);
        localStorage.removeItem('selectedCollection');
        this.courses = (courseData[bookId] || {}).courses || {};
        this.loadCourses();
    }

    setCollection(collectionId) {
        localStorage.setItem('selectedCollection', collectionId);
        this.loadCourses();
    }

    loadData() {
        this.stats = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
        this.completedLessons = this.stats.completedLessons || {};
    }

    // 将时间线项目移动到顶部
    moveTimelineItemToTop(timelineItem, timelineContainer) {
        // 获取第一个项目作为参考位置
        const firstItem = timelineContainer.querySelector('.timeline-item:first-child');
        if (!firstItem || firstItem === timelineItem) return;

        // 添加移动动画类
        timelineItem.classList.add('moving');
        
        // 获取所有项目，用于重新排序
        const allItems = Array.from(timelineContainer.querySelectorAll('.timeline-item'));
        const currentIndex = allItems.indexOf(timelineItem);
        
        // 如果已经是第一个，不需要移动
        if (currentIndex === 0) {
            timelineItem.classList.remove('moving');
            return;
        }

        // 使用 requestAnimationFrame 确保 DOM 更新后再移动
        requestAnimationFrame(() => {
            // 将当前项目移动到第一个位置
            timelineContainer.insertBefore(timelineItem, firstItem);
            
            // 等待 DOM 更新后移除移动动画类
            setTimeout(() => {
                timelineItem.classList.remove('moving');
            }, 100);
        });
    }

    _generateCourseCard(courseId) {
        const course = this.courses[courseId];
        if (!course) return '';

        const basePath = window.location.hostname === 'kummerspec.github.io' ? '/typingJapanese/' : '';
        const total = Object.keys(course.lessons || {}).length;
        // 从 typing_statistics.completedLessons 中按 courseId 统计完成的课时
        const completedMap = (this.stats && this.stats.completedLessons) ? this.stats.completedLessons : {};
        const completedArr = Object.keys(completedMap)
            .filter(k => k.startsWith(`${courseId}_`))
            .map(k => k.split('_')[1]);
        const completed = completedArr.length;
        let nextLesson = 'lesson1';
        for (let i = 1; i <= total; i++) {
            const id = `lesson${i}`;
            if (!completedArr.includes(id)) { nextLesson = id; break; }
        }
        const inProgress = completed > 0 && completed < total;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        return `
            <div class="course-card">
                <div class="card-header">
                    <h2>${course.name.charAt(0)}</h2>
                    ${inProgress ? '<span class="continue-badge">继续学习</span>' : ''}
                </div>
                <div class="card-content">
                    <h3>${course.name}</h3>
                    <p>${course.description || ''}</p>
                    <div class="course-stats">
                        <span><i class="fas fa-book"></i> ${total} 课时</span>
                        <span><i class="fas fa-check"></i> ${completed} 已完成</span>
                    </div>
                    <div class="progress-bar"><div class="progress" style="width:${percent}%"></div></div>
                    <div class="progress-text">${completed}/${total} 课时</div>
                    <div class="course-actions">
                        <a class="start-button" href="${basePath}practice/practice.html?course=${courseId}&lesson=${nextLesson}">
                            <i class="fas fa-play"></i> ${inProgress ? '继续学习' : '开始学习'}
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    async loadCourses() {
        try {
            const timelineContainer = document.querySelector('.course-timeline');
            if (!timelineContainer) return;
            timelineContainer.innerHTML = '';

            this.loadData(); // Reload stats

            // 如果选择了收藏夹，则仅显示该收藏夹的学习卡片
            const selectedCollection = localStorage.getItem('selectedCollection');
            const mgr = window.customCollectionsManager;
            if (selectedCollection && mgr) {
                const collection = (mgr.getCollections() || []).find(c => c.id === selectedCollection);
                if (collection) {
                    const basePath = window.location.hostname === 'kummerspec.github.io' ? '/typingJapanese/' : '';
                    const practiceUrl = `${basePath}practice/practice.html?collection=${collection.id}`;
                    const flashcardUrl = `${basePath}review/flashcard.html?collection=${collection.id}`;
                    const sentenceCount = collection.sentences ? collection.sentences.length : 0;
                    
                    // 创建一个类似课程卡片的学习卡片
                    const collectionCard = document.createElement('div');
                    collectionCard.className = 'course-card';
                    collectionCard.innerHTML = `
                        <div class="card-header">
                            <h2>${collection.name.charAt(0)}</h2>
                        </div>
                        <div class="card-content">
                            <h3>${collection.name}</h3>
                            <p>${collection.description || '自定义收藏夹'}</p>
                            <div class="course-stats">
                                <span><i class="fas fa-book"></i> ${sentenceCount} 个句子</span>
                                <span><i class="fas fa-calendar"></i> ${new Date(collection.created_at).toLocaleDateString()}</span>
                            </div>
                            <div class="course-actions">
                                <a href="${practiceUrl}" class="start-button"><i class="fas fa-keyboard"></i> 打字练习</a>
                                <a href="${flashcardUrl}" class="start-button flashcard-button"><i class="fas fa-graduation-cap"></i> 闪卡练习</a>
                            </div>
                        </div>
                    `;
                    timelineContainer.appendChild(collectionCard);
                    return; // 收藏夹模式下不显示时间线
                }
            }

            let firstInProgressNode = null;

            Object.entries(this.courses).forEach(([courseId, course], index) => {
                const total = Object.keys(course.lessons || {}).length;
                // 依据 typing_statistics.completedLessons 统计完成情况
                const completedMap = (this.stats && this.stats.completedLessons) ? this.stats.completedLessons : {};
                const completedArr = Object.keys(completedMap)
                    .filter(k => k.startsWith(`${courseId}_`))
                    .map(k => k.split('_')[1]);
                const completed = completedArr.length;
                const inProgress = completed > 0 && completed < total;
                const isCompleted = total > 0 && completed === total;

                let status = 'locked';
                if (isCompleted) {
                    status = 'completed';
                } else if (inProgress) {
                    status = 'in-progress';
                } else if (!firstInProgressNode) {
                    status = 'in-progress';
                }

                const timelineItem = document.createElement('div');
                timelineItem.className = 'timeline-item';
                timelineItem.innerHTML = `
                    <div class="timeline-node status-${status}" data-course-id="${courseId}">
                        <span class="node-label">${course.name.charAt(0)}</span>
                            </div>
                    <div class="timeline-card-container">
                        <div class="timeline-card-content" id="card-${courseId}"></div>
                        </div>
                `;
                timelineContainer.appendChild(timelineItem);

                if (status === 'in-progress' && !firstInProgressNode) {
                    firstInProgressNode = timelineItem.querySelector('.timeline-node');
                }
            });

            // 确保课程区域有一个用于显示展开卡片的独立容器
            const courseSection = timelineContainer.closest('.course-section');
            let expandedCardContainer = document.getElementById('expandedCardView');
            if (courseSection && !expandedCardContainer) {
                expandedCardContainer = document.createElement('div');
                expandedCardContainer.id = 'expandedCardView';
                expandedCardContainer.style.display = 'none'; // 默认隐藏
                courseSection.appendChild(expandedCardContainer);
            }

            const showTimeline = () => {
                timelineContainer.style.display = '';
                if (expandedCardContainer) expandedCardContainer.style.display = 'none';
                if (expandedCardContainer) expandedCardContainer.innerHTML = '';
            };

            const showCard = (courseId) => {
                timelineContainer.style.display = 'none';
                if (expandedCardContainer) {
                    expandedCardContainer.style.display = 'block';
                    // 生成卡片内容，并添加一个返回按钮
                    expandedCardContainer.innerHTML = `
                        <div class="expanded-card-wrapper">
                            <button class="back-to-timeline-btn"><i class="fas fa-arrow-left"></i> 返回课程列表</button>
                            ${this._generateCourseCard(courseId)}
                        </div>
                    `;
                    // 为返回按钮添加事件
                    expandedCardContainer.querySelector('.back-to-timeline-btn').addEventListener('click', showTimeline);
                }
            };

            // 为时间线容器统一添加点击事件监听
            timelineContainer.addEventListener('click', (e) => {
                const node = e.target.closest('.timeline-node');
                if (node) {
                    const courseId = node.dataset.courseId;
                    showCard(courseId);
                }
            });

            // 自动展开第一个“进行中”的课程
            if (firstInProgressNode) {
                firstInProgressNode.click();
            }

        } catch (error) {
            console.error('Error loading courses:', error);
        }
    }
} 