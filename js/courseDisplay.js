import { courseData } from './courseData.js';

// 新建 courseDisplay.js 文件来处理课程显示逻辑
export class CourseDisplay {
    constructor() {
        try {
            // 读取当前选中的课程集（书籍）
            this.selectedBook = localStorage.getItem('selectedBook') || 'word-group';
            // 直接从 courseData 加载课程信息（按所选书籍）
            this.courses = (courseData[this.selectedBook] || {}).courses || {};
            console.log('Loaded courses for book:', this.selectedBook, this.courses);
            
            this.loadData();
            this.initializeEventListeners();
            this.stats = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
        } catch (error) {
            console.error('Error in CourseDisplay constructor:', error);
            throw error;
        }
    }

    initializeEventListeners() {
        // 监听自定义收藏夹更新事件
        window.addEventListener('collectionsUpdated', () => {
            this.loadCourses();
        });
    }

    // 切换当前书籍
    setBook(bookId) {
        if (!courseData[bookId]) return;
        this.selectedBook = bookId;
        localStorage.setItem('selectedBook', bookId);
        localStorage.removeItem('selectedCollection');
        this.courses = (courseData[bookId] || {}).courses || {};
        this.loadCourses();
    }

    // 切换到某个收藏夹视图
    setCollection(collectionId) {
        localStorage.setItem('selectedCollection', collectionId);
        this.selectedBook = this.selectedBook || 'word-group';
        this.loadCourses();
    }

    loadData() {
        // 获取已完成的课程数据
        this.completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '{}');
        // 获取最近学习的课程
        this.lastStudied = JSON.parse(localStorage.getItem('lastStudied') || '{}');
    }

    // 获取下一个课程
    getNextCourse(currentCourseId) {
        const currentIndex = this.courseOrder.indexOf(currentCourseId);
        if (currentIndex < this.courseOrder.length - 1) {
            return this.courseOrder[currentIndex + 1];
        }
        return null;
    }

    // 获取课程进度信息的核心方法
    getCourseProgress(courseId, course, completedLessons) {
        // 真实的课时总数（不再写死为 5）
        const totalLessons = course && course.lessons ? Object.keys(course.lessons).length : 0;
        const completedArr = Array.isArray(completedLessons?.[courseId]) ? completedLessons[courseId] : [];
        const completedCount = completedArr.length;

        // 查找第一个未完成的课时作为“下一课”
        let nextLessonNumber = null;
        for (let i = 1; i <= totalLessons; i++) {
            const id = `lesson${i}`;
            if (!completedArr.includes(id)) {
                nextLessonNumber = i;
                break;
            }
        }

        // 仅在已开始但未学完时显示为“继续学习”
        if (nextLessonNumber !== null && completedCount > 0 && completedCount < totalLessons) {
            return {
                id: courseId,
                name: course.name,
                description: course.description || '',
                nextLesson: nextLessonNumber,
                progress: {
                    completed: completedCount,
                    total: totalLessons
                }
            };
        }
        // 全部完成则不作为“继续学习”返回
        return null;
    }

    // 获取所有正在学习的课程
    getCurrentAndNextLessons() {
        const completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '{}');
        const currentCourses = [];
        const addedCourses = new Set();
        
        // 遍历所有课程
        Object.entries(courseData['word-group'].courses).forEach(([courseId, course]) => {
            if (addedCourses.has(courseId)) return;

            const progress = this.getCourseProgress(courseId, course, completedLessons);
            if (progress) {
                currentCourses.push(progress);
                addedCourses.add(courseId);
            } else if (completedLessons[courseId]?.length === Object.keys(course.lessons).length) {
                // 如果当前课程已完成，尝试获取下一个课程
                const nextCourseId = this.getNextCourse(courseId);
                if (nextCourseId && !addedCourses.has(nextCourseId)) {
                    const nextCourse = courseData['word-group'].courses[nextCourseId];
                    currentCourses.push({
                        id: nextCourseId,
                        name: nextCourse.name,
                        description: nextCourse.description,
                        lessons: nextCourse.lessons,
                        currentLesson: 'lesson0',
                        nextLesson: 'lesson1',
                        isNewCourse: true
                    });
                    addedCourses.add(nextCourseId);
                }
            }
        });

        return currentCourses;
    }

    // 获取单个正在学习的课程
    getContinueLearningCourse() {
        try {
            const stats = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
            const completedLessons = stats.completedLessons || {};
            const inProgressCourses = [];

            for (const [courseId, course] of Object.entries(this.courses)) {
                const progress = this.getCourseProgress(courseId, course, completedLessons);
                if (progress) {
                    inProgressCourses.push(progress);
                }
            }
            
            return inProgressCourses;
        } catch (error) {
            console.error('获取继续学习课程时出错:', error);
            return [];
        }
    }

    // 获取今天的推荐课程
    getRecommendedCourse() {
        const today = new Date().toISOString().split('T')[0];
        const lastRecommendation = JSON.parse(localStorage.getItem('lastRecommendation') || '{}');
        
        // 获取当前所选书籍下的课程
        const allCourses = (courseData[this.selectedBook] || {}).courses || {};
        const courseIds = Object.keys(allCourses);
        
        // 获取已完成的课程
        const completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '{}');
        
        // 过滤出未完成的课程
        const availableCourses = courseIds.filter(courseId => {
            const course = allCourses[courseId];
            const lessonCount = Object.keys(course.lessons).length;
            const completed = completedLessons[courseId]?.length || 0;
            return completed < lessonCount;
        });

        // 如果没有可用课程，返回第一个课程
        if (availableCourses.length === 0) {
            const defaultRecommendation = {
                id: courseIds[0],
                lessonId: 'lesson1'
            };
            
            // 保存今天的推荐
            localStorage.setItem('lastRecommendation', JSON.stringify({
                date: today,
                course: defaultRecommendation
            }));
            
            return defaultRecommendation;
        }

        let selectedCourseId;
        
        // 如果是同一天且上次推荐的课程仍然可用，继续使用相同推荐
        if (lastRecommendation.date === today && 
            availableCourses.includes(lastRecommendation.course.id)) {
            selectedCourseId = lastRecommendation.course.id;
                } else {
            // 否则随机选择一个新课程
            // 如果上次推荐的课程仍在可用列表中，避免重复推荐
            const filteredCourses = lastRecommendation.course ? 
                availableCourses.filter(id => id !== lastRecommendation.course.id) : 
                availableCourses;
            
            // 如果还有其他可选课程，从中随机选择；否则从所有可用课程中选择
            const coursesToChooseFrom = filteredCourses.length > 0 ? filteredCourses : availableCourses;
            const randomIndex = Math.floor(Math.random() * coursesToChooseFrom.length);
            selectedCourseId = coursesToChooseFrom[randomIndex];
        }

        const selectedCourse = allCourses[selectedCourseId];
        
        // 找到该课程的下一个未完成课时
        const completedCourseLessons = completedLessons[selectedCourseId] || [];
        let nextLessonNumber = completedCourseLessons.length + 1;
        const recommendation = {
            id: selectedCourseId,
            lessonId: `lesson${nextLessonNumber}`
        };

        // 保存今天的推荐
        localStorage.setItem('lastRecommendation', JSON.stringify({
            date: today,
            course: recommendation
        }));

        return recommendation;
    }

    async loadCourses() {
        try {
            const courseListContainer = document.querySelector('.course-list');
            if (!courseListContainer) {
                console.error('Course list container not found');
                return;
            }

            // 清空现有内容
            courseListContainer.innerHTML = '';

            const basePath = window.location.hostname === 'kummerspec.github.io' ? '/typingJapanese/' : '';

            // 如果选择了收藏夹，则仅显示该收藏夹卡片
            const selectedCollection = localStorage.getItem('selectedCollection');
            const mgr = window.customCollectionsManager;
            if (selectedCollection && mgr) {
                const collection = (mgr.getCollections() || []).find(c => c.id === selectedCollection);
                if (collection) {
                    const collectionCard = document.createElement('div');
                    collectionCard.className = 'collection-item';
                    const practiceUrl = `${basePath}practice/practice.html?collection=${collection.id}`;
                    const flashcardUrl = `${basePath}review/flashcard.html?collection=${collection.id}`;
                    collectionCard.innerHTML = `
                        <div class="collection-header">
                            <h3>${collection.name}</h3>
                            <div class="collection-actions">
                                <button class="add-sentence-btn" type="button" title="添加句子"><i class="fas fa-plus"></i></button>
                                <button class="edit-btn" type="button" title="编辑收藏夹"><i class="fas fa-edit"></i></button>
                                <button class="delete-btn" type="button" title="删除收藏夹"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                        <p class="collection-description">${collection.description || '暂无描述'}</p>
                        <div class="collection-stats">
                            <span><i class="fas fa-book"></i> ${collection.sentences ? collection.sentences.length : 0} 个句子</span>
                            <span><i class="fas fa-calendar"></i> ${new Date(collection.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="course-actions">
                            <a href="${practiceUrl}" class="start-button"><i class="fas fa-keyboard"></i> 打字练习</a>
                            <a href="${flashcardUrl}" class="start-button flashcard-button"><i class="fas fa-graduation-cap"></i> 闪卡练习</a>
                        </div>
                        <button class="view-sentences-btn" type="button"><i class="fas fa-list"></i> 查看句子 (${collection.sentences ? collection.sentences.length : 0})</button>
                    `;
                    // 绑定按钮事件（与下方一致）
                    collectionCard.querySelector('.add-sentence-btn')?.addEventListener('click', (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const addSentenceModal = document.getElementById('addSentenceModal');
                        if (addSentenceModal) {
                            const form = addSentenceModal.querySelector('#addSentenceForm');
                            if (form) { form.dataset.collectionId = collection.id; form.reset(); }
                            addSentenceModal.classList.add('show');
                        }
                    });
                    collectionCard.querySelector('.edit-btn')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); window.customCollectionsManager.showEditCollectionModal(collection.id); });
                    collectionCard.querySelector('.delete-btn')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (confirm('确定要删除这个收藏夹吗？')) { window.customCollectionsManager.deleteCollection(collection.id); this.loadCourses(); }});
                    const viewSentencesBtn = collectionCard.querySelector('.view-sentences-btn');
                    if (viewSentencesBtn) {
                        viewSentencesBtn.addEventListener('click', (e) => {
                            e.preventDefault(); e.stopPropagation();
                            const modal = document.getElementById('viewSentencesModal');
                            const modalTitle = modal.querySelector('.modal-header h3');
                            const sentencesContainer = modal.querySelector('.sentences-container');
                            modalTitle.textContent = `${collection.name} - 句子列表`;
                            sentencesContainer.innerHTML = (collection.sentences || []).map(s => `
                                <div class=\"sentence-item\"><div class=\"sentence-content\"><div class=\"japanese\">${s.japanese||''}</div><div class=\"chinese\">${s.meaning||''}</div></div></div>`).join('');
                            modal.classList.add('show');
                        });
                    }
                    courseListContainer.appendChild(collectionCard);
                    return; // 仅显示该收藏夹
                }
            }

            // 获取完成状态
            const stats = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
            const completedLessons = stats.completedLessons || {};

            // 渲染当前所选书籍的所有课程（简洁一致的卡片）
            Object.entries(this.courses).forEach(([courseId, course]) => {
                const total = Object.keys(course.lessons || {}).length;
                const completedArr = Array.isArray(completedLessons?.[courseId]) ? completedLessons[courseId] : [];
                const completed = completedArr.length;
                let nextLesson = 'lesson1';
                for (let i = 1; i <= total; i++) {
                    const id = `lesson${i}`;
                    if (!completedArr.includes(id)) { nextLesson = id; break; }
                }
                const inProgress = completed > 0 && completed < total;
                const percent = total ? Math.round(completed / total * 100) : 0;

                const card = document.createElement('div');
                card.className = 'course-card' + (inProgress ? ' continue-learning' : '');
                card.innerHTML = `
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
                    </div>`;
                courseListContainer.appendChild(card);
            });

            // 自定义收藏夹区域保留
            const customCollectionsManager = window.customCollectionsManager;
            if (customCollectionsManager) {
                const collections = customCollectionsManager.getCollections();
                collections.forEach(collection => {
                    const collectionCard = document.createElement('div');
                    collectionCard.className = 'collection-item';

                    const practiceUrl = `${basePath}practice/practice.html?collection=${collection.id}`;
                    const flashcardUrl = `${basePath}review/flashcard.html?collection=${collection.id}`;

                    collectionCard.innerHTML = `
                        <div class="collection-header">
                            <h3>${collection.name}</h3>
                            <div class="collection-actions">
                                <button class="add-sentence-btn" type="button" title="添加句子">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="edit-btn" type="button" title="编辑收藏夹">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-btn" type="button" title="删除收藏夹">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <p class="collection-description">${collection.description || '暂无描述'}</p>
                        <div class="collection-stats">
                            <span><i class="fas fa-book"></i> ${collection.sentences ? collection.sentences.length : 0} 个句子</span>
                            <span><i class="fas fa-calendar"></i> ${new Date(collection.created_at).toLocaleDateString()}</span>
                        </div>
                        <div class="course-actions">
                            <a href="${practiceUrl}" class="start-button">
                                <i class="fas fa-keyboard"></i> 打字练习
                            </a>
                            <a href="${flashcardUrl}" class="start-button flashcard-button">
                                <i class="fas fa-graduation-cap"></i> 闪卡练习
                            </a>
                        </div>
                        <button class="view-sentences-btn" type="button">
                            <i class="fas fa-list"></i>
                            查看句子 (${collection.sentences ? collection.sentences.length : 0})
                        </button>
                    `;

                    const viewSentencesBtn = collectionCard.querySelector('.view-sentences-btn');
                    if (viewSentencesBtn) {
                        viewSentencesBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const modal = document.getElementById('viewSentencesModal');
                            const modalTitle = modal.querySelector('.modal-header h3');
                            const sentencesContainer = modal.querySelector('.sentences-container');
                            modalTitle.textContent = `${collection.name} - 句子列表`;
                            sentencesContainer.innerHTML = (collection.sentences || []).map(sentence => `
                                <div class="sentence-item">
                                    <div class="sentence-content">
                                        <div class="japanese">${sentence.japanese || ''}</div>
                                        <div class="chinese">${sentence.meaning || ''}</div>
                                    </div>
                                </div>
                            `).join('');
                            modal.classList.add('show');
                        });
                    }

                    // 其余按钮事件保持不变
                    collectionCard.querySelector('.add-sentence-btn')?.addEventListener('click', (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const addSentenceModal = document.getElementById('addSentenceModal');
                        if (addSentenceModal) {
                            const form = addSentenceModal.querySelector('#addSentenceForm');
                            if (form) { form.dataset.collectionId = collection.id; form.reset(); }
                            addSentenceModal.classList.add('show');
                        }
                    });
                    collectionCard.querySelector('.edit-btn')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); window.customCollectionsManager.showEditCollectionModal(collection.id); });
                    collectionCard.querySelector('.delete-btn')?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (confirm('确定要删除这个收藏夹吗？')) { window.customCollectionsManager.deleteCollection(collection.id); this.loadCourses(); }});
                    courseListContainer.appendChild(collectionCard);
                });
            }
        } catch (error) {
            console.error('Error loading courses:', error);
        }
    }

    // 修改渲染方法以显示继续学习信息
    renderCourseList() {
        const courseListContainer = document.querySelector('.course-list');
        courseListContainer.innerHTML = '';

        Object.entries(this.courses).forEach(([courseId, course]) => {
            const courseElement = document.createElement('div');
            courseElement.className = 'course-card';
            if (course.recommended) {
                courseElement.classList.add('recommended');
            }
            if (course.continueLearning) {
                courseElement.classList.add('continue-learning');
            }
            courseElement.setAttribute('data-course', courseId);

            // 添加标签
            let badgeHtml = '';
            if (course.recommended) {
                badgeHtml = '<div class="recommended-badge">今日推荐</div>';
            } else if (course.continueLearning) {
                badgeHtml = '<div class="continue-badge">继续学习</div>';
            }
            
            // 显示课程信息和进度
            let progressHtml = '';
            if (course.continueLearning && course.progress) {
                const percent = (course.progress.completed / course.progress.total) * 100;
                progressHtml = `
                    <div class="progress-bar">
                        <div class="progress" style="width: ${percent}%"></div>
                    </div>
                    <div class="progress-text">
                        已完成 ${course.progress.completed}/${course.progress.total} 课时
                    </div>
                `;
            }

            courseElement.innerHTML = `
                ${badgeHtml}
                <h3>${course.name}</h3>
                <p>${course.description}</p>
                ${progressHtml}
                <div class="next-lesson">下一课时：${course.lessons[course.nextLesson].title}</div>
            `;

            // 添加点击事件监听器
            courseElement.addEventListener('click', () => {
                console.log(`Clicked on course: ${courseId}`);
                window.location.href = `practice/practice.html?course=${courseId}&lesson=${course.nextLesson}`;
            });

            courseListContainer.appendChild(courseElement);
        });
    }
} 