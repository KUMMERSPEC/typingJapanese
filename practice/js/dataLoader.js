// DataLoader 类用于加载课程数据
export default class DataLoader {
    static async getCourseWithLessonData(course, lesson) {
        try {
            console.log(`Loading lesson data for ${course}/${lesson}`);
            
            // 构建课程数据文件的路径
            const lessonPath = `../data/${course}/${lesson}.json`;
            console.log('Fetching from path:', lessonPath);

            // 添加时间戳防止缓存
            const response = await fetch(`${lessonPath}?t=${Date.now()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const lessonData = await response.json();
            console.log('Loaded lesson data:', lessonData);

            // 验证数据结构
            if (!lessonData || !Array.isArray(lessonData.questions)) {
                throw new Error('Invalid lesson data format');
            }

            return lessonData;

        } catch (error) {
            console.error('Error loading lesson data:', error);
            console.error('Course:', course);
            console.error('Lesson:', lesson);
            throw new Error(`Failed to load lesson data: ${error.message}`);
        }
    }

    static async getCourseData(course) {
        try {
            // 构建课程配置文件的路径
            const coursePath = `../data/${course}/config.json`;
            const response = await fetch(coursePath);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const courseData = await response.json();
            return courseData;

        } catch (error) {
            console.error('Error loading course data:', error);
            throw error;
        }
    }
} 