import type { GeneratedReading } from '@/shared/types';
import { readJson, writeJsonAtomic } from '../storage/json';
import { readingPath, userPath } from '../storage/path';
import { fileExists, listFiles } from '../storage/file-system';
import fs from 'fs';

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
    await writeJsonAtomic(filePath, reading);
    await this.updateIndex(userId, reading);
  }

  async listHistory(userId: string): Promise<GeneratedReading[]> {
    const readings: GeneratedReading[] = [];
    const readingsDir = userPath(userId, 'readings');

    try {
      await this.walkReadingsDir(readingsDir, readings);
    } catch {
      // directory might not exist yet
    }

    return readings.sort((a, b) => b.date.localeCompare(a.date));
  }

  private async walkReadingsDir(dir: string, results: GeneratedReading[]): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        await this.walkReadingsDir(fullPath, results);
      } else if (entry.name.endsWith('.json') && entry.name !== 'index.json') {
        try {
          const reading = await readJson<GeneratedReading>(fullPath);
          results.push(reading);
        } catch {
          // skip invalid files
        }
      }
    }
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
