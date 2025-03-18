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
            // 获取今天的推荐课程
            const recommendation = this.getRecommendedCourse();
            console.log('Today\'s recommendation:', recommendation);

            // 从 courseData 中加载所有课程
            const allCourses = courseData['word-group'].courses;
            
            // 获取正在学习的课程
            const continueLearningCourse = this.getContinueLearningCourse();
            console.log('Continue learning course:', continueLearningCourse);

            this.courses = {};
            
            // 遍历所有课程，检查是否有进度
            Object.entries(allCourses).forEach(([courseId, course]) => {
                const progress = this.getCourseProgress(courseId, course, this.completedLessons);
                
                if (progress) {
                    // 如果课程有进度，添加为继续学习
                    this.courses[courseId] = {
                        name: course.name,
                        description: course.description,
                        lessons: course.lessons,
                        nextLesson: progress.nextLesson,
                        progress: progress.progress,
                        continueLearning: true
                    };
                }
            });

            // 如果推荐课程不在继续学习列表中，添加为推荐
            if (!this.courses[recommendation.id]) {
                const recommendedCourse = allCourses[recommendation.id];
                this.courses[recommendation.id] = {
                    name: recommendedCourse.name,
                    description: recommendedCourse.description,
                    lessons: recommendedCourse.lessons,
                    recommended: true,
                    nextLesson: recommendation.lessonId
                };
            }

            const courseListElement = document.getElementById('course-list');
            if (!courseListElement) return;

            courseListElement.innerHTML = '';

            // 添加继续学习的课程
            Object.entries(this.courses).forEach(([courseId, course]) => {
                if (course.continueLearning) {
                    const courseElement = document.createElement('div');
                    courseElement.className = 'course-item continue-learning';
                    
                    const percent = (course.progress.completed / course.progress.total) * 100;
                    courseElement.innerHTML = `
                        <div class="continue-badge">继续学习</div>
                        <h3>${course.name}</h3>
                        <p>${course.description || '暂无描述'}</p>
                        <div class="course-stats">
                            <span><i class="fas fa-book"></i> ${course.progress.total} 个课时</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${percent}%"></div>
                        </div>
                        <div class="progress-text">
                            已完成 ${course.progress.completed}/${course.progress.total} 课时
                        </div>
                        <div class="course-actions">
                            <a href="practice/practice.html?course=${courseId}&lesson=${course.nextLesson}" class="start-button">
                                继续学习
                            </a>
                        </div>
                    `;
                    courseListElement.appendChild(courseElement);
                }
            });

            // 添加推荐课程
            Object.entries(this.courses).forEach(([courseId, course]) => {
                if (course.recommended) {
                    const courseElement = document.createElement('div');
                    courseElement.className = 'course-item recommended';
                    
                    courseElement.innerHTML = `
                        <div class="recommended-badge">今日推荐</div>
                        <h3>${course.name}</h3>
                        <p>${course.description || '暂无描述'}</p>
                        <div class="course-stats">
                            <span><i class="fas fa-book"></i> ${Object.keys(course.lessons).length} 个课时</span>
                        </div>
                        <div class="course-actions">
                            <a href="practice/practice.html?course=${courseId}&lesson=${course.nextLesson}" class="start-button">
                                开始学习
                            </a>
                        </div>
                    `;
                    courseListElement.appendChild(courseElement);
                }
            });

            // 添加自定义收藏夹
            if (window.customCollections) {
                Object.entries(window.customCollections.collections).forEach(([id, collection]) => {
                    const sentenceCount = Object.keys(collection.sentences).length;
                    if (sentenceCount > 0) {
                        const courseElement = document.createElement('div');
                        courseElement.className = 'course-item custom-collection';
                        
                        courseElement.innerHTML = `
                            <div class="collection-header">
                                <h3>${collection.name}</h3>
                                <button class="toggle-sentences" data-collection-id="${id}">
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                            </div>
                            <p>${collection.description || '暂无描述'}</p>
                            <div class="course-stats">
                                <span>
                                    <i class="fas fa-book"></i>
                                    ${sentenceCount} 个句子
                                </span>
                                <span class="custom-badge">
                                    <i class="fas fa-star"></i> 自定义收藏
                                </span>
                            </div>
                            <div class="sentence-list" style="display: none;" data-collection-id="${id}">
                                ${Object.entries(collection.sentences).map(([sentenceId, sentence]) => `
                                    <div class="sentence-item">
                                        <div class="sentence-content">
                                            <div class="japanese">${sentence.japanese}</div>
                                            <div class="chinese">${sentence.chinese}</div>
                                        </div>
                                        <div class="sentence-actions">
                                            <button class="edit-sentence" data-collection-id="${id}" data-sentence-id="${sentenceId}">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="delete-sentence" data-collection-id="${id}" data-sentence-id="${sentenceId}">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="course-actions">
                                <a href="practice/practice.html?course=${id}&type=custom" class="start-button">
                                    开始练习
                                </a>
                            </div>
                        `;

                        // 添加展开/折叠功能
                        const toggleButton = courseElement.querySelector('.toggle-sentences');
                        const sentenceList = courseElement.querySelector('.sentence-list');
                        toggleButton.addEventListener('click', (e) => {
                            e.preventDefault();
                            const icon = toggleButton.querySelector('i');
                            if (sentenceList.style.display === 'none') {
                                sentenceList.style.display = 'block';
                                icon.className = 'fas fa-chevron-up';
                            } else {
                                sentenceList.style.display = 'none';
                                icon.className = 'fas fa-chevron-down';
                            }
                        });

                        // 添加编辑和删除功能
                        courseElement.querySelectorAll('.edit-sentence').forEach(button => {
                            button.addEventListener('click', (e) => {
                                e.preventDefault();
                                const sentenceId = button.dataset.sentenceId;
                                const collectionId = button.dataset.collectionId;
                                window.customCollections.editSentence(collectionId, sentenceId);
                            });
                        });

                        courseElement.querySelectorAll('.delete-sentence').forEach(button => {
                            button.addEventListener('click', (e) => {
                                e.preventDefault();
                                const sentenceId = button.dataset.sentenceId;
                                const collectionId = button.dataset.collectionId;
                                if (confirm('确定要删除这个句子吗？')) {
                                    window.customCollections.deleteSentence(collectionId, sentenceId);
                                    this.loadCourses();
                                }
                            });
                        });

                        courseListElement.appendChild(courseElement);
                    }
                });
            }

            console.log('Final courses to display:', this.courses);
        } catch (error) {
            console.error('Error loading courses:', error);
            this.showError('加载课程失败，请刷新重试');
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