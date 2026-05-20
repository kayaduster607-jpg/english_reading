import type { UserPlan, UserProfile } from '@/shared/types';
import { readJson, writeJsonAtomic } from '../storage/json';
import { userPath } from '../storage/path';
import { fileExists } from '../storage/file-system';

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
    if (await fileExists(filePath)) {
      return readJson<UserPlan>(filePath);
    }
    throw new Error(`No plan found for user ${userId}`);
  }

  async savePlan(userId: string, plan: UserPlan): Promise<void> {
    const filePath = userPath(userId, 'plan.json');
    await writeJsonAtomic(filePath, plan);
  }
}
