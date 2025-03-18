import { courseData } from './courseData.js';

// 新建 courseDisplay.js 文件来处理课程显示逻辑
export class CourseDisplay {
    constructor() {
        try {
            this.loadCoursesFromHTML(); // 从 HTML 加载课程信息
            console.log('Courses:', this.courses); // 添加调试信息
            this.completedLessons = {};
            this.courseOrder = []; // 这里可以根据需要初始化课程顺序
            this.courseLessons = {};
            
            // 从加载的课程信息初始化课程课时数
            Object.entries(this.courses).forEach(([courseId, course]) => {
                this.courseLessons[courseId] = course.lessonCount || 0; // 确保有课时数
            });
            
            this.loadData();
            this.initializeEventListeners();
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
        console.log(`Checking progress for course ${courseId}:`, {
            course,
            completedLessons: completedLessons[courseId]
        });
        
        const totalLessons = Object.keys(course.lessons).length;
        const completedCourseLessons = completedLessons[courseId] || [];
        const completed = completedCourseLessons.length;

        console.log(`Course ${courseId} progress:`, {
            totalLessons,
            completed,
            hasProgress: completed > 0 && completed < totalLessons
        });

        // 只要有完成的课时，就返回进度信息
        if (completed > 0) {
            const nextLessonNumber = completed + 1;
            const progress = {
                id: courseId,
                name: course.name,
                description: course.description,
                lessons: course.lessons,
                nextLesson: `lesson${nextLessonNumber}`,
                currentLesson: `lesson${completed}`,
                progress: {
                    completed: completed,
                    total: totalLessons
                },
                isNewCourse: false
            };
            console.log(`Returning progress for ${courseId}:`, progress);
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
        const completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '{}');
        
        // 遍历所有课程，找出第一个正在学习但未完成的课程
        for (const [courseId, course] of Object.entries(courseData['word-group'].courses)) {
            const progress = this.getCourseProgress(courseId, course, completedLessons);
            if (progress) {
                return progress;
            }
        }
        return null;
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

            // Clear existing content
            courseListContainer.innerHTML = '';

            // 获取今天的推荐课程
            const recommendation = this.getRecommendedCourse();
            console.log('Today\'s recommendation:', recommendation);

            // 从 courseData 中加载所有课程
            const allCourses = courseData['word-group'].courses;
            
            // 获取正在学习的课程
            const continueLearningCourse = this.getContinueLearningCourse();
            console.log('Continue learning course:', continueLearningCourse);

            // 创建继续学习的课程卡片
            if (continueLearningCourse) {
                const course = allCourses[continueLearningCourse.id];
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
                        <p>${course.description}</p>
                        <div class="course-stats">
                            <span><i class="fas fa-book"></i> ${progress.total} 课时</span>
                            <span><i class="fas fa-check"></i> ${progress.completed} 已完成</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${progressPercentage}%"></div>
                        </div>
                        <div class="progress-text">${progress.completed}/${progress.total} 课时</div>
                        <div class="course-actions">
                            <a href="practice/practice.html?course=${continueLearningCourse.id}&lesson=${continueLearningCourse.nextLesson}" class="start-button">
                                <i class="fas fa-play"></i> 继续学习
                            </a>
                        </div>
                    </div>
                `;
                courseListContainer.appendChild(courseCard);
            }

            // 创建推荐课程卡片
            if (recommendation && (!continueLearningCourse || recommendation.id !== continueLearningCourse.id)) {
                const recommendedCourse = allCourses[recommendation.id];
                const courseCard = document.createElement('div');
                courseCard.className = 'course-card recommended';
                
                courseCard.innerHTML = `
                    <div class="card-header">
                        <h2>${recommendedCourse.name.charAt(0)}</h2>
                        <span class="recommended-badge">今日推荐</span>
                    </div>
                    <div class="card-content">
                        <h3>${recommendedCourse.name}</h3>
                        <p>${recommendedCourse.description}</p>
                        <div class="course-stats">
                            <span><i class="fas fa-book"></i> ${Object.keys(recommendedCourse.lessons).length} 课时</span>
                        </div>
                        <div class="course-actions">
                            <a href="practice/practice.html?course=${recommendation.id}&lesson=${recommendation.lessonId}" class="start-button">
                                <i class="fas fa-play"></i> 开始学习
                            </a>
                        </div>
                    </div>
                `;
                courseListContainer.appendChild(courseCard);
            }

            // 获取自定义收藏夹
            const customCollectionsManager = window.customCollectionsManager;
            if (customCollectionsManager) {
                const collections = customCollectionsManager.getCollections();
                collections.forEach(collection => {
                    const collectionCard = document.createElement('div');
                    collectionCard.className = 'collection-item';
                    
                    // 构建句子列表 HTML
                    const sentencesHtml = collection.sentences ? collection.sentences.map(sentence => `
                        <div class="sentence-item">
                            <div class="sentence-japanese">${sentence.japanese}</div>
                            <div class="sentence-chinese">${sentence.meaning}</div>
                        </div>
                    `).join('') : '';
                    
                    collectionCard.innerHTML = `
                        <div class="collection-header">
                            <h3>${collection.name}</h3>
                            <div class="collection-actions">
                                <button class="edit-btn" title="编辑收藏夹">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-btn" title="删除收藏夹">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        <p class="collection-description">${collection.description || '暂无描述'}</p>
                        <div class="collection-stats">
                            <span><i class="fas fa-book"></i> ${collection.sentences ? collection.sentences.length : 0} 个句子</span>
                            <span><i class="fas fa-calendar"></i> ${new Date(collection.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button class="toggle-sentences" type="button">
                            <i class="fas fa-chevron-down"></i>
                            ${collection.sentences?.length ? '查看句子' : '暂无句子'}
                        </button>
                        <div class="sentences-list">
                            ${sentencesHtml}
                        </div>
                    `;

                    // 添加展开/折叠功能
                    const toggleBtn = collectionCard.querySelector('.toggle-sentences');
                    const sentencesList = collectionCard.querySelector('.sentences-list');
                    
                    if (collection.sentences?.length) {
                        toggleBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleBtn.classList.toggle('expanded');
                            const icon = toggleBtn.querySelector('i');
                            if (icon) {
                                icon.style.transform = toggleBtn.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0)';
                            }
                            sentencesList.classList.toggle('show');
                        });
                    } else {
                        toggleBtn.style.color = '#999';
                        toggleBtn.style.cursor = 'default';
                    }

                    // 添加编辑和删除功能
                    const editBtn = collectionCard.querySelector('.edit-btn');
                    const deleteBtn = collectionCard.querySelector('.delete-btn');
                    
                    editBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (customCollectionsManager) {
                            customCollectionsManager.editCollection(collection.id);
                        }
                    });
                    
                    deleteBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (customCollectionsManager) {
                            customCollectionsManager.deleteCollection(collection.id);
                        }
                    });

                    courseListContainer.appendChild(collectionCard);
                });
            }

            console.log('Courses loaded:', this.courses);
        } catch (error) {
            console.error('Error in loadCourses:', error);
        }
    }

    loadCoursesFromHTML() {
        const courseCards = document.querySelectorAll('.course-card');
        console.log('Found course cards:', courseCards); // 确认找到的课程卡片
        this.courses = {};

        courseCards.forEach(card => {
            const courseId = card.getAttribute('data-course'); // 确保读取 data-course 属性
            if (!courseId) {
                console.error('Course ID is null or undefined for card:', card);
                return; // 如果 courseId 为 null，跳过该卡片
            }

            const courseNameElement = card.querySelector('h2');
            const courseDescriptionElement = card.querySelector('p');

            const courseName = courseNameElement ? courseNameElement.textContent : '未知课程';
            const courseDescription = courseDescriptionElement ? courseDescriptionElement.textContent : '无描述';

            this.courses[courseId] = {
                name: courseName,
                description: courseDescription,
                lessons: [] // 这里可以添加具体的课时信息
            };
        });

        console.log('Loaded courses:', this.courses); // 确认加载的课程
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