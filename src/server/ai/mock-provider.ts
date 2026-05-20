import type { AIProvider, AIReadingInput, AIReadingOutput, VocabItem } from '@/shared/types';

export class MockAIProvider implements AIProvider {
  async generateReading(input: AIReadingInput): Promise<AIReadingOutput> {
    const { examProfile, targetWords, topic } = input;
    const selectedTopic = topic || 'technology and daily life';
    const words = targetWords.slice(0, 10);

    const paragraphs = this.buildParagraphs(words, examProfile);

    return {
      topic: selectedTopic,
      title: this.generateTitle(selectedTopic),
      guideCn: `本文围绕"${selectedTopic}"展开，适合${examProfile.name}水平学习者。文章中自然嵌入了${words.length}个目标词汇，帮助你在语境中理解和记忆这些重要单词。`,
      paragraphs,
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
    const w = words.map((item) => item.word);
    const used = (i: number) => w[i % w.length];

    return [
      `In today's rapidly changing world, the concept of ${used(0)} has become increasingly important. Many researchers have begun to ${used(1)} new approaches to understand how these changes affect our daily lives. The evidence suggests that we need to ${used(2)} more attention to this growing phenomenon.`,
      `Experts in the field argue that ${used(3)} is one of the key factors driving this transformation. When we ${used(4)} the current situation carefully, we can see that the impact extends far beyond what most people realize. It is ${used(5)} that this trend will continue to shape our future.`,
      `Some scholars take a more cautious approach, suggesting that we should not ${used(6)} too quickly to conclusions. They believe that a ${used(7)} understanding of the underlying principles is necessary before we can make meaningful progress. The ${used(8)} of their research points to a more nuanced view of the issue.`,
      `In ${used(9)}, the journey toward understanding these complex issues requires both patience and dedication. As we continue to explore new possibilities, we must remain open to different perspectives and be willing to adapt our thinking accordingly. The future depends on our ability to learn and grow.`,
    ].slice(0, exam.paragraphCount.min);
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
