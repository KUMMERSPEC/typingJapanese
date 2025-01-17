import pandas as pd
import json
import os

def generate_answers(row):
    """根据问题类型自动生成answers"""
    if row['type'] == 'normal':
        return f"{row['hiragana']}:{row['romaji']}"
    elif row['type'] == 'split':
        hiragana_parts = row['hiragana'].split(':')
        romaji_parts = row['romaji'].split(':')
        answers = []
        for h, r in zip(hiragana_parts, romaji_parts):
            answers.append(f"{h}:{r}")
        return '|'.join(answers)
    return ''

def process_questions(questions_df):
    """处理问题数据,添加自动生成的answers"""
    questions_dict = {}
    
    for _, row in questions_df.iterrows():
        # 确保 course_id 和 lesson_id 是字符串类型
        course_id = str(row['course_id']).strip()
        lesson_id = str(row['lesson_id']).strip()
        
        if course_id not in questions_dict:
            questions_dict[course_id] = {}
            
        if lesson_id not in questions_dict[course_id]:
            questions_dict[course_id][lesson_id] = []
            
        question = {
            'character': str(row['character']),
            'hiragana': str(row['hiragana']),
            'romaji': str(row['romaji']),
            'meaning': str(row['meaning']),
            'type': str(row['type']),
            'answers': generate_answers(row)
        }
        
        questions_dict[course_id][lesson_id].append(question)
        
    return questions_dict

def generate_lesson_files(questions_dict):
    """生成lesson JSON文件"""
    for course_id, course_data in questions_dict.items():
        # 确保 course_id 是字符串
        course_id = str(course_id).strip()
        
        # 创建课程目录
        course_dir = os.path.join('practice', 'data', course_id)
        os.makedirs(course_dir, exist_ok=True)
        
        # 为每个lesson生成JSON文件
        for lesson_id, questions in course_data.items():
            # 确保 lesson_id 是字符串
            lesson_id = str(lesson_id).strip()
            
            lesson_json = {
                'questions': questions
            }
            
            # 保存JSON文件
            filename = os.path.join(course_dir, f'{lesson_id.lower()}.json')
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(lesson_json, f, ensure_ascii=False, indent=2)

def main():
    # 读取Excel文件
    questions_df = pd.read_excel('lesson_questions.xlsx')
    
    # 处理问题数据
    questions_dict = process_questions(questions_df)
    
    # 生成lesson文件
    generate_lesson_files(questions_dict)
    
    print("JSON files generated successfully!")

if __name__ == '__main__':
    main()