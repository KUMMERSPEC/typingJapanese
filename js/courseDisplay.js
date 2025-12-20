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

            // 为时间线容器统一添加点击事件监听
            timelineContainer.addEventListener('click', (e) => {
                const node = e.target.closest('.timeline-node');
                if (!node) return;

                const courseId = node.dataset.courseId;
                const cardContainer = document.getElementById(`card-${courseId}`);
                if (!cardContainer) return;

                const timelineItem = node.closest('.timeline-item');
                if (!timelineItem) return;

                const isExpanded = cardContainer.classList.contains('expanded');
                const isFirst = timelineItem === timelineContainer.querySelector('.timeline-item:first-child');

                // 如果点击的不是第一个，且卡片未展开，则移动到顶部
                if (!isFirst && !isExpanded) {
                    this.moveTimelineItemToTop(timelineItem, timelineContainer);
                }

                // 关闭其他已展开的卡片
                document.querySelectorAll('.timeline-card-content.expanded').forEach(el => {
                    if (el !== cardContainer) {
                        el.classList.remove('expanded');
                        el.innerHTML = '';
                    }
                });

                if (!isExpanded) {
                    cardContainer.innerHTML = this._generateCourseCard(courseId);
                    setTimeout(() => {
                        cardContainer.classList.add('expanded');
                        // 如果移动到顶部，平滑滚动到时间线容器顶部
                        if (!isFirst) {
                            const courseSection = timelineContainer.closest('.course-section');
                            if (courseSection) {
                                courseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            } else {
                                timelineContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                    }, 10);
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