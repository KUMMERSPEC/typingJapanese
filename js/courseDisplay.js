import { courseData } from './courseData.js';

export class CourseDisplay {
    constructor() {
            this.selectedBook = localStorage.getItem('selectedBook') || 'word-group';
            this.courses = (courseData[this.selectedBook] || {}).courses || {};
        
        // DOM 元素只获取一次
        this.timelineContainer = document.querySelector('.course-timeline');
        this.courseSection = this.timelineContainer ? this.timelineContainer.closest('.course-section') : null;
        this.expandedCardContainer = null;

            this.loadData();
        this.initialize(); // 初始化一次
    }

    // 初始化：创建容器、绑定永久事件
    initialize() {
        if (!this.courseSection) return;

        // 1. 创建用于显示卡片的独立容器
        if (!document.getElementById('expandedCardView')) {
            this.expandedCardContainer = document.createElement('div');
            this.expandedCardContainer.id = 'expandedCardView';
            this.expandedCardContainer.style.display = 'none';
            this.courseSection.appendChild(this.expandedCardContainer);
        } else {
            this.expandedCardContainer = document.getElementById('expandedCardView');
        }

        // 2. 绑定永久的事件监听器
        this.timelineContainer.addEventListener('click', (e) => {
            const node = e.target.closest('.timeline-node');
            if (node) {
                const courseId = node.dataset.courseId;
                this.showCard(courseId);
            }
        });

        // 监听外部事件，只重新加载课程数据，不重新绑定事件
        window.addEventListener('collectionsUpdated', () => this.loadCourses());
        window.addEventListener('statisticsUpdated', () => this.loadCourses());
    }

    // 切换到卡片视图
    showCard(courseId) {
        this.timelineContainer.style.display = 'none';
        if (this.expandedCardContainer) {
            this.expandedCardContainer.style.display = 'block';
            this.expandedCardContainer.innerHTML = `
                <div class="expanded-card-wrapper">
                    <button class="back-to-timeline-btn"><i class="fas fa-arrow-left"></i> 返回课程列表</button>
                    ${this._generateCourseCard(courseId)}
                </div>
            `;
            // 每次生成卡片时，为新的“返回”按钮绑定单次事件
            this.expandedCardContainer.querySelector('.back-to-timeline-btn').addEventListener('click', () => this.showTimeline());
        }
    }

    // 切换回时间线（气球池）视图
    showTimeline() {
        this.timelineContainer.style.display = 'flex'; // 使用 flex 以应用 gap 等样式
        if (this.expandedCardContainer) {
            this.expandedCardContainer.style.display = 'none';
            this.expandedCardContainer.innerHTML = '';
        }
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
        localStorage.removeItem('selectedBook'); // 选择收藏夹时，清除课程选择
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
        const completedMap = (this.stats && this.stats.completedLessons) ? this.stats.completedLessons : {};
        let completedArr = [];
        if (Array.isArray(completedMap[courseId])) {
            // 兼容旧结构：completedLessons = { [courseId]: ['lesson1', 'lesson2'] }
            completedArr = completedMap[courseId];
        } else {
            completedArr = Object.keys(completedMap)
                .filter(k => k.startsWith(`${courseId}_`))
                .map(k => k.split('_')[1]);
        }
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

    _renderCollectionCard(collectionId) {
        const mgr = window.customCollectionsManager;
        if (!mgr) return;

        const collection = mgr.collections[collectionId];
        if (!collection) {
            this.timelineContainer.innerHTML = '<p>找不到该收藏夹。</p>';
            return;
        }

        const totalSentences = Object.keys(collection.sentences || {}).length;
        const basePath = window.location.hostname === 'kummerspec.github.io' ? '/typingJapanese/' : '';

        const cardHtml = `
            <div class="course-card">
                <div class="card-header">
                    <h2>${collection.name.charAt(0)}</h2>
                    <span class="continue-badge">收藏夹</span>
                </div>
                <div class="card-content">
                    <h3>${collection.name}</h3>
                    <p>${collection.description || '自定义收藏夹'}</p>
                    <div class="course-stats">
                        <span><i class="fas fa-book"></i> ${totalSentences} 句子</span>
                    </div>
                    <div class="course-actions">
                        <a class="start-button" href="${basePath}practice/practice.html?collection=${collectionId}">
                            <i class="fas fa-play"></i> 开始学习
                        </a>
                    </div>
                </div>
            </div>
        `;

        this.timelineContainer.style.display = 'none';
        this.expandedCardContainer.style.display = 'block';
        this.expandedCardContainer.innerHTML = `
            <div class="expanded-card-wrapper">
                 <button class="back-to-timeline-btn"><i class="fas fa-arrow-left"></i> 返回课程列表</button>
                ${cardHtml}
            </div>
        `;
        this.expandedCardContainer.querySelector('.back-to-timeline-btn').addEventListener('click', () => this.showTimeline());
    }

    async loadCourses() {
        if (!this.timelineContainer) return;

        this.showTimeline(); // 确保开始时时间线是可见的
        this.timelineContainer.innerHTML = ''; // 清空旧的气球
        this.loadData();

        const selectedCollection = localStorage.getItem('selectedCollection');
        const mgr = window.customCollectionsManager;

        if (selectedCollection && mgr) {
            this._renderCollectionCard(selectedCollection);
            return; // 渲染完收藏夹卡片后，直接返回
        }

        // 重新生成所有气球
        Object.entries(this.courses).forEach(([courseId, course]) => {
                const total = Object.keys(course.lessons || {}).length;
                const completedMap = (this.stats && this.stats.completedLessons) ? this.stats.completedLessons : {};
            const completedArr = Object.keys(completedMap).filter(k => k.startsWith(`${courseId}_`)).map(k => k.split('_')[1]);
                const completed = completedArr.length;
                const inProgress = completed > 0 && completed < total;
                const isCompleted = total > 0 && completed === total;
            let status = isCompleted ? 'completed' : (inProgress ? 'in-progress' : 'locked');

                const timelineItem = document.createElement('div');
                timelineItem.className = 'timeline-item';

            const containerWidth = this.timelineContainer.offsetWidth;
            const containerHeight = this.timelineContainer.offsetHeight;
            const nodeSize = 44;
            const randomLeft = Math.random() * (containerWidth - nodeSize);
            const randomTop = Math.random() * (containerHeight - nodeSize);
            timelineItem.style.left = `${randomLeft}px`;
            timelineItem.style.top = `${randomTop}px`;

            const randomDelay = -Math.random() * 15;

                timelineItem.innerHTML = `
                <div class="timeline-node status-${status}" data-course-id="${courseId}" style="animation-delay: ${randomDelay}s;">
                        <span class="node-label">${course.name.charAt(0)}</span>
                        </div>
                `;
            this.timelineContainer.appendChild(timelineItem);
        });
    }
}