import fs from 'fs';

export async function readJson<T>(filePath: string): Promise<T> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

export async function writeJsonAtomic<T>(filePath: string, data: T): Promise<void> {
  await fs.promises.mkdir(getDir(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.promises.rename(tempPath, filePath);
}

function getDir(filePath: string): string {
  return filePath.replace(/[\\/][^\\/]+$/, '');
}
