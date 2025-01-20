// 新建 courseDisplay.js 文件来处理课程显示逻辑
export class CourseDisplay {
    constructor() {
        this.courseData = {};
        this.completedLessons = {};
        this.loadData();
    }

    loadData() {
        // 获取已完成的课程数据
        this.completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '{}');
        // 获取最近学习的课程
        this.lastStudied = JSON.parse(localStorage.getItem('lastStudied') || '{}');
    }

    // 获取当前正在学习的课程和下一课
    getCurrentAndNextLessons() {
        const currentCourses = [];
        
        // 遍历所有课程，找出正在学习的课程
        for (const [courseId, lessons] of Object.entries(this.completedLessons)) {
            const lastLesson = lessons[lessons.length - 1];
            const nextLessonNumber = parseInt(lastLesson.replace('lesson', '')) + 1;
            const nextLesson = `lesson${nextLessonNumber}`;
            
            currentCourses.push({
                courseId,
                currentLesson: lastLesson,
                nextLesson: nextLesson
            });
        }

        return currentCourses;
    }

    // 渲染课程列表
    renderCourseList() {
        const courseList = document.querySelector('.course-list');
        courseList.innerHTML = ''; // 清空现有内容

        const currentCourses = this.getCurrentAndNextLessons();
        
        if (currentCourses.length === 0) {
            // 如果没有正在学习的课程，显示默认的第一课
            courseList.innerHTML = `
                <div class="course-card" onclick="window.location.href='./practice/practice.html?course=kimochi&lesson=lesson1'">
                    <h3>気持ち</h3>
                    <p>开始学习第一课</p>
                </div>
            `;
        } else {
            // 显示正在学习的课程和它们的下一课
            currentCourses.forEach(course => {
                const courseNames = {
                    'kimochi': '気持ち',
                    'gimon': '疑問詞',
                    'hitei': '否定',
                    'katei': '假设',
                    'kantan': '感叹',
                    'ajiwai': '味道',
                    'kanjou': '负面感情',
                    'huku': '服装相关',
                    'syoku': '饮食相关'
                };

                courseList.innerHTML += `
                    <div class="course-card current-course" onclick="window.location.href='./practice/practice.html?course=${course.courseId}&lesson=${course.nextLesson}'">
                        <div class="course-status">继续学习</div>
                        <h3>${courseNames[course.courseId] || course.courseId}</h3>
                        <p>继续学习第${parseInt(course.nextLesson.replace('lesson', ''))}课</p>
                    </div>
                `;
            });
        }
    }
} 