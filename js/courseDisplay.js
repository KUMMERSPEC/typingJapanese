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

    // 渲染课程列表
    renderCourseList() {
        const courseListContainer = document.querySelector('.course-list');
        courseListContainer.innerHTML = '';

        Object.entries(this.courses).forEach(([courseId, course]) => {
            const courseElement = document.createElement('div');
            courseElement.className = 'course-card';
            courseElement.setAttribute('data-course', courseId); // 设置 data-course 属性
            courseElement.innerHTML = `<h3>${course.name}</h3><p>${course.description}</p>`; // 使用课程名称和描述

            // 添加点击事件监听器
            courseElement.addEventListener('click', () => {
                console.log(`Clicked on course: ${courseId}`); // 调试信息
                // 在这里添加点击后的逻辑，例如跳转到课程详情页面
            });

            courseListContainer.appendChild(courseElement);
        });
    }

    async loadCourses() {
        try {
            // 从 courseData 中加载课程列表
            const courseList = Object.entries(courseData['standard-basic-1'].courses).map(([id, course]) => ({
                id,
                title: course.name,
                description: course.description,
                lessons: course.lessons
            }));

            this.courses = {};
            courseList.forEach(course => {
                this.courses[course.id] = {
                    name: course.title,
                    description: course.description,
                    lessons: course.lessons
                };
            });

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
} 