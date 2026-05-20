import type { GeneratedReading } from '@/shared/types';
import { readJson, writeJsonAtomic } from '../storage/json';
import { readingPath, userPath } from '../storage/path';
import { fileExists } from '../storage/file-system';
import { HISTORY_KEEP_DAYS, isDateWithinDays } from '@/shared/history';
import fs from 'fs';
import path from 'path';

export class ReadingRepository {
  async getTodayReading(userId: string, dateStr: string): Promise<GeneratedReading | null> {
    const filePath = readingPath(userId, dateStr);
    if (await fileExists(filePath)) {
      return readJson<GeneratedReading>(filePath);
    }
    return null;
  }

  async saveReading(userId: string, reading: GeneratedReading): Promise<void> {
    const filePath = readingPath(userId, reading.date);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await writeJsonAtomic(filePath, reading);
    await this.updateIndex(userId, reading);
  }

  async listHistory(userId: string, options?: { days?: number }): Promise<GeneratedReading[]> {
    const days = options?.days ?? HISTORY_KEEP_DAYS;
    const readingsDir = userPath(userId, 'readings');
    const readings: GeneratedReading[] = [];

    try {
      const files = await this.walkJsonFiles(readingsDir);
      for (const file of files) {
        try {
          const reading = await readJson<GeneratedReading>(file);
          if (reading.date && isDateWithinDays(reading.date, days)) {
            readings.push(reading);
          }
        } catch {
          // skip invalid files
        }
      }
    } catch {
      // directory might not exist yet
    }

    return readings.sort((a, b) => b.date.localeCompare(a.date));
  }

  async pruneOldReadings(userId: string, days = HISTORY_KEEP_DAYS): Promise<void> {
    const readingsDir = userPath(userId, 'readings');

    try {
      const files = await this.walkJsonFiles(readingsDir);
      for (const file of files) {
        try {
          const reading = await readJson<GeneratedReading>(file);
          if (reading.date && !isDateWithinDays(reading.date, days)) {
            await fs.promises.unlink(file);
          }
        } catch {
          // skip invalid files
        }
      }
    } catch {
      // directory might not exist yet
    }
  }

  private async walkJsonFiles(dir: string): Promise<string[]> {
    const result: string[] = [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result.push(...(await this.walkJsonFiles(fullPath)));
      } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'index.json') {
        result.push(fullPath);
      }
    }

    return result;
  }

  private async updateIndex(userId: string, reading: GeneratedReading): Promise<void> {
    const indexPath = userPath(userId, 'readings', 'index.json');
    let index: { readings: { id: string; date: string; title: string }[] } = { readings: [] };

    if (await fileExists(indexPath)) {
      index = await readJson<typeof index>(indexPath);
    }

    const exists = index.readings.some((r) => r.id === reading.id);
    if (!exists) {
      index.readings.push({ id: reading.id, date: reading.date, title: reading.title });
    }

    await writeJsonAtomic(indexPath, index);
  }
}
