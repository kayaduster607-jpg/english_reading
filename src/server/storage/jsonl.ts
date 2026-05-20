import fs from 'fs';

export async function readJsonl<T>(filePath: string): Promise<T[]> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

export async function appendJsonl<T>(filePath: string, item: T): Promise<void> {
  await fs.promises.mkdir(getDir(filePath), { recursive: true });
  await fs.promises.appendFile(filePath, JSON.stringify(item) + '\n', 'utf-8');
}

export async function writeJsonl<T>(filePath: string, items: T[]): Promise<void> {
  await fs.promises.mkdir(getDir(filePath), { recursive: true });
  const content = items.map((item) => JSON.stringify(item)).join('\n') + '\n';
  await fs.promises.writeFile(filePath, content, 'utf-8');
}

function getDir(filePath: string): string {
  return filePath.replace(/[\\/][^\\/]+$/, '');
}
