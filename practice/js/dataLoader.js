// DataLoader 类用于加载课程数据
export default class DataLoader {
    static async getCourseWithLessonData(course, lesson) {
        try {
            // 处理课程名，转换为小写
            const lessonId = lesson.toLowerCase();
            const path = `./data/${course}/${lessonId}.json`;
            
            console.log('Loading course data:', {
                course,
                lesson: lessonId,
                path
            });

            // 使用相对路径加载数据
            const response = await fetch(path);
            if (!response.ok) {
                console.error('Failed to load:', path, 'Status:', response.status);
                throw new Error(`Failed to load course data (${response.status})`);
            }
            
            const data = await response.json();
            console.log('Raw data loaded:', data);
            
            // 直接返回JSON数据
            return {
                questions: data.questions
            };
        } catch (error) {
            console.error('Error loading lesson:', error);
            throw error;
        }
    }
} 