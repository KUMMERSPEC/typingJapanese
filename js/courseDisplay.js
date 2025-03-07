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
        } catch (error) {
            console.error('Error in CourseDisplay constructor:', error);
            throw error;
        }
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

    // 获取当前正在学习的课程和下一课
    getCurrentAndNextLessons() {
        const currentCourses = [];
        const addedCourses = new Set(); // 用于跟踪已添加的课程
        
        // 遍历所有课程，找出正在学习的课程
        for (const [courseId, lessons] of Object.entries(this.completedLessons)) {
            // 如果这个课程已经添加过，跳过
            if (addedCourses.has(courseId)) continue;
            
            const lastLesson = lessons[lessons.length - 1];
            const nextLessonNumber = parseInt(lastLesson.replace('lesson', '')) + 1;
            const nextLesson = `lesson${nextLessonNumber}`;
            
            // 检查是否超出当前课程的课时数
            if (this.courseLessons[courseId] && nextLessonNumber > this.courseLessons[courseId]) {
                // 获取下一个课程
                const nextCourseId = this.getNextCourse(courseId);
                if (nextCourseId && !addedCourses.has(nextCourseId)) {
                    currentCourses.push({
                        courseId: nextCourseId,
                        currentLesson: 'lesson0',
                        nextLesson: 'lesson1',
                        isNewCourse: true
                    });
                    addedCourses.add(nextCourseId);
                }
            } else {
                currentCourses.push({
                    courseId,
                    currentLesson: lastLesson,
                    nextLesson: nextLesson,
                    isNewCourse: false
                });
                addedCourses.add(courseId);
            }
        }

        return currentCourses;
    }

    // 获取今天的推荐课程
    getRecommendedCourse() {
        const today = new Date().toISOString().split('T')[0];
        const lastRecommendation = JSON.parse(localStorage.getItem('lastRecommendation') || '{}');
        
        // 如果今天已经推荐过课程，返回同样的推荐
        if (lastRecommendation.date === today) {
            return lastRecommendation.course;
        }

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
            return {
                id: courseIds[0],
                lessonId: 'lesson1'
            };
        }

        // 随机选择一个课程
        const randomIndex = Math.floor(Math.random() * availableCourses.length);
        const selectedCourseId = availableCourses[randomIndex];
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

            // 从 courseData 中加载推荐的课程
            const recommendedCourse = courseData['word-group'].courses[recommendation.id];
            
            this.courses = {
                [recommendation.id]: {
                    name: recommendedCourse.name,
                    description: recommendedCourse.description,
                    lessons: recommendedCourse.lessons,
                    recommended: true,
                    nextLesson: recommendation.lessonId
                }
            };

            this.renderCourseList(); // 渲染课程列表
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

    // 修改渲染方法以显示推荐信息
    renderCourseList() {
        const courseListContainer = document.querySelector('.course-list');
        courseListContainer.innerHTML = '';

        Object.entries(this.courses).forEach(([courseId, course]) => {
            const courseElement = document.createElement('div');
            courseElement.className = 'course-card';
            if (course.recommended) {
                courseElement.classList.add('recommended');
            }
            courseElement.setAttribute('data-course', courseId);

            // 添加推荐标签
            const recommendedHtml = course.recommended ? '<div class="recommended-badge">今日推荐</div>' : '';
            
            // 显示课程信息和下一课时
            courseElement.innerHTML = `
                ${recommendedHtml}
                <h3>${course.name}</h3>
                <p>${course.description}</p>
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