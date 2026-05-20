import type { VocabParserInput, VocabParseResult } from './parser-factory';
import {
  parsePdfVocabText,
  parseInlineNumberedPdfText,
  parseMomoTablePdfText,
} from './pdf-vocab-text-parser';

export async function parsePdf(input: VocabParserInput): Promise<VocabParseResult> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: input.buffer });

    try {
      const result = await parser.getText();
      const rawText = normalizePdfText(result.text || '');
      const mode = input.mode || 'auto';

      if (rawText.trim().length < 100) {
        return {
          items: [],
          warnings: ['这个 PDF 几乎没有可提取的文字层，可能是扫描版 PDF。当前版本需要上传可复制文字的 PDF。'],
          rawTextPreview: rawText.slice(0, 2000),
        };
      }

      let parsed;
      if (mode === 'inline-numbered') {
        parsed = parseInlineNumberedPdfText(rawText, input.fileName);
      } else if (mode === 'momo-table') {
        parsed = parseMomoTablePdfText(rawText, input.fileName);
      } else {
        parsed = parsePdfVocabText(rawText, input.fileName);
      }

      return {
        items: parsed.items,
        warnings: parsed.warnings,
        rawTextPreview: rawText.slice(0, 8000),
        parserReport: parsed.parserReport,
      };
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    console.error('PDF parse failed:', error);
    return {
      items: [],
      warnings: [
        error instanceof Error ? `PDF 解析失败：${error.message}` : 'PDF 解析失败：未知错误',
        '如果错误信息包含 Object.defineProperty called on non-object，通常是 pdf-parse / PDF.js worker 或 Next.js 打包配置问题。',
      ],
    };
  }
}

function normalizePdfText(text: string): string {
  return text
    .replace(/\r/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
