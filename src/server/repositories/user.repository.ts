import type { UserPlan, UserProfile } from '@/shared/types';
import { readJson, writeJsonAtomic } from '../storage/json';
import { userPath } from '../storage/path';
import { fileExists } from '../storage/file-system';
import { normalizeReadingTargetWordCount } from '@/shared/reading-target-limits';

export class UserRepository {
  async getProfile(userId: string): Promise<UserProfile> {
    const filePath = userPath(userId, 'profile.json');
    if (await fileExists(filePath)) {
      return readJson<UserProfile>(filePath);
    }
    return { userId, displayName: 'Learner', createdAt: new Date().toISOString() };
  }

  async getPlan(userId: string): Promise<UserPlan> {
    const filePath = userPath(userId, 'plan.json');
    if (!(await fileExists(filePath))) {
      throw new Error(`No plan found for user ${userId}`);
    }

    const stored = await readJson<Partial<UserPlan>>(filePath);
    const examTarget = stored.examTarget || 'cet6';

    return {
      userId,
      examTarget,
      activeVocabBookIds: stored.activeVocabBookIds || ['cet6-core'],
      dailyNewWords: stored.dailyNewWords ?? 10,
      dailyReviewWords: stored.dailyReviewWords ?? 10,
      readingTargetWordCount: normalizeReadingTargetWordCount(
        stored.readingTargetWordCount ?? stored.dailyTargetWords ?? 14,
        examTarget
      ),
      dailyTargetWords: stored.dailyTargetWords,
      articlePerDay: stored.articlePerDay ?? 1,
      preferredTopics: stored.preferredTopics || ['technology', 'education', 'environment', 'health', 'campus life'],
      generationStyle: stored.generationStyle || {
        articleType: 'exam_reading',
        includeChineseGuide: true,
        includeQuestions: true,
        includeCloze: true,
        includeVocabularyPanel: true,
      },
    };
  }

  async savePlan(userId: string, plan: UserPlan): Promise<void> {
    const filePath = userPath(userId, 'plan.json');
    await writeJsonAtomic(filePath, plan);
  }
}
