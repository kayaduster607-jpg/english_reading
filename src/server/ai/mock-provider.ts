import type { AIProvider, AIReadingInput, AIReadingOutput, VocabItem } from '@/shared/types';

export class MockAIProvider implements AIProvider {
  async generateReading(input: AIReadingInput): Promise<AIReadingOutput> {
    const { examProfile, targetWords, topic } = input;
    const selectedTopic = topic || 'technology and daily life';
    const words = targetWords;

    const paragraphs = this.buildParagraphs(words, examProfile);

    return {
      topic: selectedTopic,
      title: this.generateTitle(selectedTopic),
      guideCn: `本文围绕"${selectedTopic}"展开，适合${examProfile.name}水平学习者。文章中自然嵌入了${words.length}个目标词汇，帮助你在语境中理解和记忆这些重要单词。`,
      paragraphs,
      translationCn: paragraphs.map((p) => `[中文翻译] ${p}`),
      vocabularyInContext: words.map((w) => ({
        word: w.word,
        sentence: this.findSentence(paragraphs, w.word) || `${w.word} is used in this article.`,
        meaningCn: w.meaningCn,
        noteCn: `注意 ${w.word} 在文中的用法和搭配。`,
      })),
      questions: this.buildQuestions(words, paragraphs),
      cloze: words.map((w, i) => ({
        id: `c${i + 1}`,
        sentence: this.findSentence(paragraphs, w.word)?.replace(
          new RegExp(w.word, 'i'),
          '____'
        ) || `The word ____ is important in this context.`,
        answer: w.word,
        hintCn: w.meaningCn.split('；')[0],
      })),
    };
  }

  private generateTitle(topic: string): string {
    const titles: Record<string, string> = {
      technology: 'How Technology Is Reshaping Our Daily Lives',
      education: 'The Changing Landscape of Modern Education',
      environment: 'Small Steps Toward a Greener Future',
      health: 'Understanding the Science of Good Habits',
      culture: 'When Cultures Meet: Lessons in Understanding',
      work: 'The Evolving Nature of Work in the 21st Century',
      'campus life': 'What University Life Teaches Us Beyond the Classroom',
      'social media': 'The Hidden Impact of Social Media on Our Minds',
    };
    return titles[topic] || `Exploring the World of ${topic}`;
  }

  private buildParagraphs(words: VocabItem[], exam: AIReadingInput['examProfile']): string[] {
    const paragraphCount = exam.paragraphCount.min;
    const buckets: VocabItem[][] = Array.from({ length: paragraphCount }, () => []);
    words.forEach((word, index) => {
      buckets[index % paragraphCount].push(word);
    });

    const paragraphs = buckets.map((bucket, index) => {
      const embeddedSentences = bucket
        .map((item) => `The discussion also introduces ${item.word}, a term that learners should understand through context rather than memorise mechanically.`)
        .join(' ');

      if (index === 0) {
        return `In a society shaped by rapid economic, cultural, and technological change, people are often required to interpret information with greater care than before. Instead of accepting every claim at face value, educated readers need to examine causes, consequences, and hidden assumptions. ${embeddedSentences}`;
      }
      if (index === paragraphCount - 1) {
        return `Although the issue may appear simple at first, it becomes more complicated when different groups, interests, and long-term effects are considered together. A mature response therefore requires evidence, patience, and a willingness to revise earlier views. ${embeddedSentences}`;
      }
      return `One important aspect of this topic is the tension between individual choice and broader social influence. When people make decisions, they are rarely acting in isolation; their judgments are shaped by education, media, institutions, and personal experience. ${embeddedSentences}`;
    });

    return paragraphs;
  }

  private findSentence(paragraphs: string[], word: string): string | null {
    for (const p of paragraphs) {
      const sentences = p.split(/(?<=[.!?])\s+/);
      for (const s of sentences) {
        if (s.toLowerCase().includes(word.toLowerCase())) {
          return s;
        }
      }
    }
    return null;
  }

  private buildQuestions(
    words: VocabItem[],
    paragraphs: string[]
  ): AIReadingOutput['questions'] {
    const fullText = paragraphs.join(' ');
    return [
      {
        id: 'q1',
        type: 'main_idea',
        question: 'What is the main idea of this passage?',
        options: [
          `The passage discusses how ${words[0]?.word || 'change'} affects modern society.`,
          'The passage argues that technology has no impact on daily life.',
          'The passage is mainly about the history of science.',
          'The passage focuses on a single scientific discovery.',
        ],
        answer: `The passage discusses how ${words[0]?.word || 'change'} affects modern society.`,
        explanationCn: '文章主要讨论了主题对现代社会的影响，涵盖了多个角度的分析。',
      },
      {
        id: 'q2',
        type: 'detail',
        question: `According to the passage, what role does "${words[1]?.word || 'research'}" play?`,
        options: [
          'It is considered irrelevant to the main argument.',
          'It is described as a key factor in the discussion.',
          'It is mentioned only in the conclusion.',
          'It is presented as a counterargument.',
        ],
        answer: 'It is described as a key factor in the discussion.',
        explanationCn: '根据文章内容，该因素被描述为讨论中的关键因素。',
      },
      {
        id: 'q3',
        type: 'inference',
        question: 'What can be inferred from the last paragraph?',
        options: [
          'The author is completely pessimistic about the future.',
          'The author believes adaptability is important for progress.',
          'The author thinks further research is unnecessary.',
          'The author rejects all previous findings.',
        ],
        answer: 'The author believes adaptability is important for progress.',
        explanationCn: '从最后一段可以推断，作者认为适应能力对进步很重要。',
      },
    ];
  }
}
