import { courseConfig } from './config/courseConfig.js';

// 新建 courseDisplay.js 文件来处理课程显示逻辑
export class CourseDisplay {
    constructor() {
        try {
            if (!courseConfig || !courseConfig.courses) {
                throw new Error('Course config not found');
            }
            
            this.courseData = {};
            this.completedLessons = {};
            this.courseOrder = courseConfig.courseOrder;
            this.courseLessons = {};
            
            // 从配置文件初始化课程课时数
            Object.entries(courseConfig.courses).forEach(([courseId, course]) => {
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
                // 课程已完成，添加已完成状态
                currentCourses.push({
                    courseId,
                    currentLesson: lastLesson,
                    nextLesson: null,
                    isCompleted: true // 标记为已完成
                });
            } else {
                currentCourses.push({
                    courseId,
                    currentLesson: lastLesson,
                    nextLesson: nextLesson,
                    isNewCourse: false,
                    isCompleted: false // 标记为未完成
                });
                addedCourses.add(courseId);
            }
        }

        return currentCourses;
    }

    // 渲染课程列表
    renderCourseList() {
        const courseList = document.querySelector('.course-list');
        if (!courseList) return;
        
        courseList.innerHTML = '';

        try {
            const currentCourses = this.getCurrentAndNextLessons();
            
            if (currentCourses.length === 0) {
                const firstCourse = courseConfig.courses['huku'];
                courseList.innerHTML = `
                    <div class="course-card" onclick="window.location.href='practice/practice.html?course=huku&lesson=lesson1'">
                        <h3>${firstCourse.name}</h3>
                        <p>开始学习第一课</p>
                    </div>
                `;
            } else {
                // 显示正在学习的课程和它们的下一课
                currentCourses.forEach(course => {
                    const courseInfo = courseConfig.courses[course.courseId];
                    if (!courseInfo) return;

                    if (course.isCompleted) {
                        // 如果课程已完成，显示已完成状态
                        courseList.innerHTML += `
                            <div class="course-card completed">
                                <div class="course-status">已完成</div>
                                <h3>${courseInfo.name}</h3>
                            </div>
                        `;
                    } else {
                        // 检查下一课是否存在
                        const nextLessonNumber = parseInt(course.nextLesson.replace('lesson', ''));
                        if (nextLessonNumber > courseInfo.lessonCount) {
                            return; // 如果下一课超出课程总课时，不显示
                        }

                        courseList.innerHTML += `
                            <div class="course-card current-course" onclick="window.location.href='practice/practice.html?course=${course.courseId}&lesson=${course.nextLesson}'">
                                <div class="course-status">${course.isNewCourse ? '开始新课程' : '继续学习'}</div>
                                <h3>${courseInfo.name}</h3>
                                <p>${course.isNewCourse ? '开始第1课' : `继续学习第${nextLessonNumber}课`}</p>
                            </div>
                        `;
                    }
                });
            }
        } catch (error) {
            console.error('Error rendering course list:', error);
            courseList.innerHTML = `
                <div class="error-message">
                    加载课程失败，请刷新页面重试
                </div>
            `;
        }
    }
} 