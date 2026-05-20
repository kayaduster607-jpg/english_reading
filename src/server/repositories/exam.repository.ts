import type { ExamProfile, ExamId } from '@/shared/types';
import { readJson } from '../storage/json';
import { examPath, dataPath } from '../storage/path';
import { listFiles } from '../storage/file-system';

export class ExamRepository {
  async getById(examId: ExamId): Promise<ExamProfile> {
    return readJson<ExamProfile>(examPath(examId));
  }

  async listAll(): Promise<ExamProfile[]> {
    const files = await listFiles(dataPath('exams'), '.json');
    const exams: ExamProfile[] = [];
    for (const file of files) {
      const exam = await readJson<ExamProfile>(dataPath('exams', file));
      exams.push(exam);
    }
    return exams;
  }
}
