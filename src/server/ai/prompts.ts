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
  const difficultyGuide = getExamDifficultyGuide(examProfile.id);

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

## 考试风格细则
${difficultyGuide}

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
8. translationCn 必须和 paragraphs 一一对应，每个 translationCn[i] 是 paragraphs[i] 的忠实中文翻译。
9. 不要写成低龄化故事，不要使用"小学生作文式"表达。
10. 即使目标词里有基础词，也不能降低整篇文章难度。
11. 文章必须接近所选考试的阅读理解材料，而不是普通英语学习短文。
12. 如果考试是 CET-6、考研、IELTS 或 TOEFL，文章必须包含一定抽象论述和推理链条。
13. 所有目标词必须以原形出现在正文中，不能只使用变形。

## 输出格式
严格输出以下 JSON 格式，不要输出任何其他内容，不要使用 Markdown 代码块：

{
  "topic": "主题英文名",
  "title": "文章英文标题",
  "guideCn": "中文导读，50-100字",
  "paragraphs": ["英文段落1", "英文段落2"],
  "translationCn": ["英文段落1的中文翻译", "英文段落2的中文翻译"],
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

function getExamDifficultyGuide(examId: string): string {
  switch (examId) {
    case 'zhongkao':
      return `- Use A2-B1 level English.
- Clear, simple sentences with basic vocabulary.
- Topics should be relatable to middle school students: daily life, school, family, simple science.`;
    case 'gaokao':
      return `- Use B1 level English.
- Include some compound and complex sentences.
- Topics: social issues, science, culture, campus life.
- Questions should include main idea, detail, and simple inference.`;
    case 'cet4':
      return `- Use B1-B2 level English.
- The passage should be clear but not childish.
- Include compound and complex sentences.
- Focus on practical social, campus, technology, or workplace topics.
- Questions should include main idea, detail, and simple inference.`;
    case 'cet6':
      return `- Use B2 level English suitable for CET-6 reading.
- Do not write a simple story or elementary essay.
- Use analytical exposition or argumentative prose.
- Include abstract nouns, concessive clauses, causal reasoning, and contrastive transitions.
- At least half of the sentences should be medium-long or complex.
- The passage should require inference, not just surface-level understanding.
- Even if some target words are simple, do not lower the overall passage difficulty.`;
    case 'postgraduate':
      return `- Use B2-C1 level argumentative English.
- The style should resemble a serious editorial or social science passage.
- Use dense reasoning, counterarguments, qualification, and abstract concepts.
- Include longer sentences with subordination and logical transitions.
- Questions should test inference, author attitude, discourse function, and argument structure.`;
    case 'ielts':
    case 'toefl':
      return `- Use B2-C1 academic English.
- The passage should be explanatory or academic rather than conversational.
- Use topic-specific concepts, definitions, examples, and cause-effect relations.
- Questions should test information location, inference, vocabulary in context, and structure.`;
    default:
      return `- Match the selected exam level.
- Keep the language natural and exam-appropriate.`;
  }
}
