import { courseData } from './courseData.js';

// 新建 courseDisplay.js 文件来处理课程显示逻辑
export class CourseDisplay {
    constructor() {
        try {
            // 直接从 courseData 加载课程信息
            this.courses = courseData['word-group'].courses;
            console.log('Loaded courses:', this.courses);
            
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
        console.log(`检查课程 ${courseId} 的进度:`, {
            course,
            completedLessons
        });
        
        // 获取课程的总课时数
        const totalLessons = 5; // 假设每个课程有5课时
        const completedCount = Object.keys(completedLessons || {})
            .filter(key => key.startsWith(`${courseId}_`))
            .length;

        console.log(`课程 ${courseId} 进度:`, {
            totalLessons,
            completedCount,
            hasProgress: completedCount > 0 && completedCount < totalLessons
        });

        // 如果有完成的课时且未完成全部课时，返回进度信息
        if (completedCount > 0 && completedCount < totalLessons) {
            const nextLessonNumber = completedCount + 1;
            const progress = {
                id: courseId,
                name: course.name,
                description: course.description || '',
                nextLesson: nextLessonNumber,
                progress: {
                    completed: completedCount,
                    total: totalLessons
                }
            };
            console.log(`返回课程 ${courseId} 的进度:`, progress);
            return progress;
        }
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
            // 获取完成状态
            const stats = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
            const completedLessons = stats.completedLessons || {};
            
            console.log('检查继续学习课程:', {
                stats,
                completedLessons
            });

            // 遍历所有课程，找出第一个正在学习但未完成的课程
            for (const [courseId, course] of Object.entries(this.courses)) {
                const progress = this.getCourseProgress(courseId, course, completedLessons);
                if (progress) {
                    console.log('找到继续学习的课程:', progress);
                    return progress;
                }
            }
            
            console.log('没有找到需要继续学习的课程');
            return null;
        } catch (error) {
            console.error('获取继续学习课程时出错:', error);
            return null;
        }
    }

    // 获取今天的推荐课程
    getRecommendedCourse() {
        const today = new Date().toISOString().split('T')[0];
        const lastRecommendation = JSON.parse(localStorage.getItem('lastRecommendation') || '{}');
        
        // 获取所有可用课程
        const allCourses = courseData['word-group'].courses;
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

            // 获取完成状态
            const stats = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
            const completedLessons = stats.completedLessons || {};
            console.log('已完成的课程:', completedLessons);

            // 获取继续学习的课程
            const continueLearningCourse = this.getContinueLearningCourse();
            console.log('继续学习的课程:', continueLearningCourse);

            // 如果找到了继续学习的课程，创建卡片
            if (continueLearningCourse) {
                const course = this.courses[continueLearningCourse.id];
                if (course) {
                    const courseCard = document.createElement('div');
                    courseCard.className = 'course-card continue-learning';
                    
                    const progress = continueLearningCourse.progress;
                    const progressPercentage = (progress.completed / progress.total) * 100;
                    
                    courseCard.innerHTML = `
                        <div class="card-header">
                            <h2>${course.name.charAt(0)}</h2>
                            <span class="continue-badge">继续学习</span>
                        </div>
                        <div class="card-content">
                            <h3>${course.name}</h3>
                            <p>${course.description || ''}</p>
                            <div class="course-stats">
                                <span><i class="fas fa-book"></i> ${progress.total} 课时</span>
                                <span><i class="fas fa-check"></i> ${progress.completed} 已完成</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress" style="width: ${progressPercentage}%"></div>
                            </div>
                            <div class="progress-text">${progress.completed}/${progress.total} 课时</div>
                            <div class="course-actions">
                                <a href="practice/?course=${continueLearningCourse.id}&lesson=${continueLearningCourse.nextLesson}" class="start-button">
                                    <i class="fas fa-play"></i> 继续学习
                                </a>
                            </div>
                        </div>
                    `;
                    courseListContainer.appendChild(courseCard);
                }
            }

            // 获取今天的推荐课程
            const recommendation = this.getRecommendedCourse();
            console.log('Today\'s recommendation:', recommendation);

            // 从 courseData 中加载所有课程
            const allCourses = courseData['word-group'].courses;
            
            // 获取自定义收藏夹
            const customCollectionsManager = window.customCollectionsManager;
            if (customCollectionsManager) {
                const collections = customCollectionsManager.getCollections();
                console.log('Loading collections:', collections); // 添加调试日志

                collections.forEach(collection => {
                    console.log('Processing collection:', collection); // 添加调试日志
                    console.log('Collection sentences:', collection.sentences); // 添加调试日志

                    const collectionCard = document.createElement('div');
                    collectionCard.className = 'collection-item';
                    
                    // 修改复习链接的路径
                    const basePath = window.location.hostname === 'kummerspec.github.io' 
                        ? '/typingJapanese/' 
                        : '';

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
                            <a href="${basePath}practice/?collection=${collection.id}" class="start-button">
                                <i class="fas fa-keyboard"></i> 打字练习
                            </a>
                            <a href="${basePath}review/flashcard.html?collection=${collection.id}" class="start-button flashcard-button">
                                <i class="fas fa-graduation-cap"></i> 闪卡练习
                            </a>
                        </div>
                        <button class="view-sentences-btn" type="button">
                            <i class="fas fa-list"></i>
                            查看句子 (${collection.sentences ? collection.sentences.length : 0})
                        </button>
                    `;

                    // 修改查看句子按钮的事件处理
                    const viewSentencesBtn = collectionCard.querySelector('.view-sentences-btn');
                    if (viewSentencesBtn) {
                        viewSentencesBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // 显示句子列表模态框
                            const modal = document.getElementById('viewSentencesModal');
                            const modalContent = modal.querySelector('.modal-content');
                            const modalTitle = modal.querySelector('.modal-header h3');
                            const sentencesContainer = modal.querySelector('.sentences-container');
                            
                            modalTitle.textContent = `${collection.name} - 句子列表`;
                            
                            // 生成句子列表内容
                            if (collection.sentences && collection.sentences.length > 0) {
                                sentencesContainer.innerHTML = collection.sentences.map(sentence => `
                                    <div class="sentence-item">
                                        <div class="sentence-content">
                                            <div class="japanese">${sentence.japanese || ''}</div>
                                            <div class="chinese">${sentence.meaning || ''}</div>
                                        </div>
                                    </div>
                                `).join('');
                            } else {
                                sentencesContainer.innerHTML = '<div class="no-sentences">暂无句子</div>';
                            }
                            
                            // 添加关闭按钮事件处理
                            const closeBtn = modal.querySelector('.close-btn');
                            if (closeBtn) {
                                closeBtn.onclick = () => {
                                    modal.classList.remove('show');
                                };
                            }

                            // 点击模态框外部关闭
                            modal.onclick = (e) => {
                                if (e.target === modal) {
                                    modal.classList.remove('show');
                                }
                            };
                            
                            modal.classList.add('show');
                        });
                    }

                    // 添加闪卡练习按钮事件
                    const flashcardButton = collectionCard.querySelector('.flashcard-button');
                    if (flashcardButton) {
                        flashcardButton.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!collection.sentences || collection.sentences.length === 0) {
                                alert('当前收藏夹没有句子，请先添加句子');
                                return;
                            }
                            const sentences = collection.sentences.map(sentence => ({
                                id: sentence.id,
                                japanese: sentence.japanese,
                                hiragana: sentence.hiragana,
                                romaji: sentence.romaji,
                                meaning: sentence.meaning,
                                type: 'custom',
                                course: collection.name,
                                lesson: '自定义',
                                proficiency: 'low',
                                lastReview: new Date().toISOString(),
                                audioUrl: `http://dict.youdao.com/dictvoice?le=jap&type=3&audio=${encodeURIComponent(sentence.japanese)}`
                            }));
                            sessionStorage.setItem('reviewSentences', JSON.stringify(sentences));
                            window.location.href = 'review/flashcard.html';
                        });
                    }

                    // 添加句子按钮事件
                    const addSentenceBtn = collectionCard.querySelector('.add-sentence-btn');
                    if (addSentenceBtn) {
                        addSentenceBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const addSentenceModal = document.getElementById('addSentenceModal');
                            if (addSentenceModal) {
                                const form = addSentenceModal.querySelector('#addSentenceForm');
                                if (form) {
                                    form.dataset.collectionId = collection.id;
                                    form.reset();
                                }
                                addSentenceModal.classList.add('show');
                            }
                        });
                    }

                    // 编辑和删除按钮事件
                    const editBtn = collectionCard.querySelector('.edit-btn');
                    const deleteBtn = collectionCard.querySelector('.delete-btn');
                    
                    editBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.customCollectionsManager.showEditCollectionModal(collection.id);
                    });
                    
                    deleteBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm('确定要删除这个收藏夹吗？')) {
                            window.customCollectionsManager.deleteCollection(collection.id);
                            this.loadCourses();
                        }
                    });

                    // 添加点击事件处理
                    collectionCard.addEventListener('click', (e) => {
                        // 如果点击的是按钮，不处理
                        if (e.target.closest('.collection-actions') || e.target.closest('.view-sentences-btn')) {
                            return;
                        }
                        // 否则展开/折叠句子列表
                        const toggleBtn = collectionCard.querySelector('.view-sentences-btn');
                        if (toggleBtn) {
                            toggleBtn.click();
                        }
                    });

                    courseListContainer.appendChild(collectionCard);
                });
            }

            console.log('Courses loaded:', this.courses);
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