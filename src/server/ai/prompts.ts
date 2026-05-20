import type { ExamProfile, VocabItem } from '@/shared/types';

export function buildReadingPrompt(
  examProfile: ExamProfile,
  targetWords: VocabItem[],
  topic?: string
): string {
  const wordList = targetWords
    .map((w) => `- ${w.word} (${w.pos || ''}): ${w.meaningCn}`)
    .join('\n');

  const topicLine = topic ? `主题: ${topic}` : '请自行选择一个适合该考试水平的主题。';

  return `你是一名英语等级考试阅读材料命题老师。

请根据以下要求生成一篇英文阅读文章。

## 考试目标
- 考试: ${examProfile.name}
- CEFR 等级: ${examProfile.cefr}
- 文章风格: ${examProfile.style}

## 文章要求
- 字数范围: ${examProfile.articleWordCount.min}-${examProfile.articleWordCount.max} 词
- 段落数: ${examProfile.paragraphCount.min}-${examProfile.paragraphCount.max}
- 句子长度: ${examProfile.sentenceLength}
- 语法复杂度: ${examProfile.grammarComplexity}

## 难度说明
${examProfile.difficultyNotes.map((n) => `- ${n}`).join('\n')}

## ${topicLine}

## 必须在文章中自然使用的词汇
${wordList}

## 要求
1. 文章难度符合指定考试。
2. 正文必须自然使用所有目标词汇，每个至少出现一次。
3. 不要堆砌单词，要让文章自然可读。
4. 生成 ${examProfile.allowedQuestionTypes.length} 道阅读理解题，类型包括: ${examProfile.allowedQuestionTypes.join(', ')}。
5. 生成与目标词汇相关的完形填空题，每词一题。
6. 中文导读要解释文章主题和学习重点。
7. 每个重点词都要给出文中例句和中文解释。

## 输出格式
严格输出以下 JSON 格式，不要输出任何其他内容，不要使用 Markdown 代码块：

{
  "topic": "主题英文名",
  "title": "文章英文标题",
  "guideCn": "中文导读，50-100字",
  "paragraphs": ["段落1", "段落2", ...],
  "vocabularyInContext": [
    {
      "word": "目标词",
      "sentence": "文中包含该词的完整句子",
      "meaningCn": "该词在文中的中文含义",
      "noteCn": "用法说明或辨析，中文"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "type": "main_idea",
      "question": "英文题目",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "正确选项的完整文本",
      "explanationCn": "中文解析"
    }
  ],
  "cloze": [
    {
      "id": "c1",
      "sentence": "包含 ____ 的英文句子",
      "answer": "正确答案单词",
      "hintCn": "中文提示"
    }
  ]
}`;
}
