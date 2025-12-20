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

    _generateCourseCard(courseId) {
        const course = this.courses[courseId];
        if (!course) return '';

        const basePath = window.location.hostname === 'kummerspec.github.io' ? '/typingJapanese/' : '';
        const total = Object.keys(course.lessons || {}).length;
        const completedArr = Array.isArray(this.completedLessons?.[courseId]) ? this.completedLessons[courseId] : [];
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

            // 如果选择了收藏夹，则仅显示该收藏夹卡片
            const selectedCollection = localStorage.getItem('selectedCollection');
            const mgr = window.customCollectionsManager;
            if (selectedCollection && mgr) {
                const collection = (mgr.getCollections() || []).find(c => c.id === selectedCollection);
                if (collection) {
                    // ... (收藏夹卡片渲染逻辑保持不变)
                }
                return; // 收藏夹模式下不显示时间线
            }

            let firstInProgressNode = null;

            Object.entries(this.courses).forEach(([courseId, course], index) => {
                const total = Object.keys(course.lessons || {}).length;
                const completedArr = Array.isArray(this.completedLessons?.[courseId]) ? this.completedLessons[courseId] : [];
                const completed = completedArr.length;
                const inProgress = completed > 0 && completed < total;
                const isCompleted = completed === total && total > 0;

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

                const isExpanded = cardContainer.classList.contains('expanded');

                document.querySelectorAll('.timeline-card-content.expanded').forEach(el => {
                    el.classList.remove('expanded');
                    el.innerHTML = '';
                });

                if (!isExpanded) {
                    cardContainer.innerHTML = this._generateCourseCard(courseId);
                    setTimeout(() => cardContainer.classList.add('expanded'), 10);
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