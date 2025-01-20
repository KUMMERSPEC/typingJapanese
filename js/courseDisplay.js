import { courseConfig } from '../config/courseConfig.js';

// 新建 courseDisplay.js 文件来处理课程显示逻辑
export class CourseDisplay {
    constructor() {
        this.courseData = {};
        this.completedLessons = {};
        this.courseOrder = courseConfig.courseOrder;
        this.courseLessons = {};
        
        // 从配置文件初始化课程课时数
        Object.entries(courseConfig.courses).forEach(([courseId, course]) => {
            this.courseLessons[courseId] = course.lessonCount;
        });
        
        this.loadData();
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
        
        // 遍历所有课程，找出正在学习的课程
        for (const [courseId, lessons] of Object.entries(this.completedLessons)) {
            const lastLesson = lessons[lessons.length - 1];
            const nextLessonNumber = parseInt(lastLesson.replace('lesson', '')) + 1;
            const nextLesson = `lesson${nextLessonNumber}`;
            
            // 检查是否超出当前课程的课时数
            if (this.courseLessons[courseId] && nextLessonNumber > this.courseLessons[courseId]) {
                // 获取下一个课程
                const nextCourseId = this.getNextCourse(courseId);
                if (nextCourseId) {
                    currentCourses.push({
                        courseId: nextCourseId,
                        currentLesson: 'lesson0',
                        nextLesson: 'lesson1',
                        isNewCourse: true
                    });
                }
            } else {
                currentCourses.push({
                    courseId,
                    currentLesson: lastLesson,
                    nextLesson: nextLesson,
                    isNewCourse: false
                });
            }
        }

        return currentCourses;
    }

    // 渲染课程列表
    renderCourseList() {
        const courseList = document.querySelector('.course-list');
        if (!courseList) return;  // 添加安全检查
        
        courseList.innerHTML = ''; // 清空现有内容

        try {
            const currentCourses = this.getCurrentAndNextLessons();
            
            if (currentCourses.length === 0) {
                // 如果没有正在学习的课程，显示默认的第一课
                const firstCourse = courseConfig.courses[courseConfig.courseOrder[0]];
                if (!firstCourse) throw new Error('No course config found');
                
                courseList.innerHTML = `
                    <div class="course-card" onclick="window.location.href='practice/practice.html?course=${courseConfig.courseOrder[0]}&lesson=lesson1'">
                        <h3>${firstCourse.name}</h3>
                        <p>${firstCourse.description}</p>
                    </div>
                `;
            } else {
                // 显示正在学习的课程和它们的下一课
                currentCourses.forEach(course => {
                    const courseInfo = courseConfig.courses[course.courseId];
                    if (!courseInfo) return;  // 跳过无效的课程
                    
                    courseList.innerHTML += `
                        <div class="course-card current-course" onclick="window.location.href='practice/practice.html?course=${course.courseId}&lesson=${course.nextLesson}'">
                            <div class="course-status">${course.isNewCourse ? '开始新课程' : '继续学习'}</div>
                            <h3>${courseInfo.name}</h3>
                            <p>${course.isNewCourse ? '开始第1课' : `继续学习第${parseInt(course.nextLesson.replace('lesson', ''))}课`}</p>
                        </div>
                    `;
                });
            }
        } catch (error) {
            console.error('Error rendering course list:', error);
            // 显示错误提示
            courseList.innerHTML = `
                <div class="error-message">
                    加载课程失败，请刷新页面重试
                </div>
            `;
        }
    }
} 