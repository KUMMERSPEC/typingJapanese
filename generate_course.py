import pandas as pd
import json

def generate_course_code(excel_file):
    # 读取Excel文件中的课程数据
    df = pd.read_excel(excel_file)
    
    # 生成HTML代码
    html_code = []
    course_data = {}
    
    for _, row in df.iterrows():
        # 生成course-card HTML
        card_html = f'''
            <div class="course-card" data-course="{row['course_id']}" data-lesson="lesson1">
                <h2>{row['course_name_jp']}</h2>
                <p>{row['course_description_jp']}</p>
            </div>'''
        html_code.append(card_html)
        
        # 生成课程数据
        lessons = {}
        lesson_count = row['lesson_count']
        if pd.notna(lesson_count):  # 检查是否为空值
            for i in range(1, int(lesson_count) + 1):
                # 检查相应的列是否存在且不为空
                title_key = f'lesson{i}_title'
                desc_key = f'lesson{i}_description'
                
                title = row.get(title_key, '')
                description = row.get(f'lesson{i}_descri{"p" if "p" in desc_key else ""}ption', '')
                
                if pd.notna(title) and pd.notna(description):
                    lessons[f'lesson{i}'] = {
                        'title': f'第{i}课 - {title}',
                        'description': description
                    }
        
        course_data[row['course_id']] = {
            'name': row['course_name_jp'],
            'description': row['course_description_jp'],
            'lessons': lessons
        }
    
    # 生成完整的HTML代码
    html_output = '\n'.join(html_code)
    
    # 生成JavaScript代码
    js_output = f"const courseData = {json.dumps(course_data, ensure_ascii=False, indent=4)};"
    
    # 保存生成的代码到文件
    with open('generated_html.txt', 'w', encoding='utf-8') as f:
        f.write(html_output)
    
    with open('generated_js.txt', 'w', encoding='utf-8') as f:
        f.write(js_output)

if __name__ == "__main__":
    # 使用示例
    generate_course_code('courses.xlsx') 