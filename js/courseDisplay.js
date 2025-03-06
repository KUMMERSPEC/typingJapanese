import { courseConfig } from './config/courseConfig.js';

// 新建 courseDisplay.js 文件来处理课程显示逻辑
export class CourseDisplay {
    constructor() {
        try {
            this.loadCoursesFromHTML(); // 从 HTML 加载课程信息
            if (!courseConfig || !courseConfig.courses) {
                throw new Error('Course config not found');
            }
            
            console.log('Courses:', this.courses); // 添加调试信息
            this.completedLessons = {};
            this.courseOrder = courseConfig.courseOrder;
            this.courseLessons = {};
            
            // 从配置文件初始化课程课时数
            Object.entries(this.courses).forEach(([courseId, course]) => {
                this.courseLessons[courseId] = course.lessonCount;
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

        // 使用 Object.entries 遍历对象
        Object.entries(this.courses).forEach(([courseId, course]) => {
            const courseElement = document.createElement('div');
            courseElement.className = 'course-card';
            courseElement.innerHTML = `<h3>${course.name}</h3>`; // 使用 course.name

            const lessons = course.lessons || []; // 确保 lessons 是一个数组
            let ongoingLesson = null;
            let allLessonsCompleted = true;

            lessons.forEach((lesson, index) => {
                const lessonKey = `${course.id}:${lesson.id}`;
                const isCompleted = this.completedLessons[course.id] && this.completedLessons[course.id].includes(lesson.id);

                if (isCompleted) {
                    // 如果课程的所有课时都已完成
                    if (index === lessons.length - 1) {
                        courseElement.innerHTML += '<p>已学完</p>';
                    }
                } else {
                    allLessonsCompleted = false;
                    if (!ongoingLesson) {
                        ongoingLesson = lesson;
                    }
                }
            });

            if (ongoingLesson) {
                courseElement.innerHTML += `<p>正在学习 ${ongoingLesson.title}</p>`;
            } else if (!allLessonsCompleted) {
                courseElement.innerHTML += `<p>继续学习 ${lessons[0].title}</p>`;
            } else {
                courseElement.innerHTML += '<p>所有课时已完成</p>';
            }

            // 添加点击事件监听器
            courseElement.addEventListener('click', () => {
                console.log(`Clicked on course: ${courseId}`); // 调试信息
                // 在这里添加点击后的逻辑，例如跳转到课程详情页面
            });

            courseListContainer.appendChild(courseElement);
        });
    }

    loadCourses() {
        // 这里是加载课程的逻辑
        return [
            { id: 'huku', title: 'Huku课程', lessons: [{ id: 'lesson1', title: 'Lesson 1' }, { id: 'lesson2', title: 'Lesson 2' }] },
            // 其他课程...
        ];
    }

    loadCoursesFromHTML() {
        const courseCards = document.querySelectorAll('.course-card');
        console.log('Course cards found:', courseCards.length); // 添加调试信息
        this.courses = {};

        courseCards.forEach(card => {
            const courseId = card.getAttribute('data-course');
            const courseName = card.querySelector('h2') ? card.querySelector('h2').textContent : '未知课程';
            const courseDescription = card.querySelector('p') ? card.querySelector('p').textContent : '无描述';

            this.courses[courseId] = {
                name: courseName,
                description: courseDescription,
                lessons: [] // 这里可以添加具体的课时信息
            };
        });
    }
} 