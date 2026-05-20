import { ReadingGenerationService } from '@/server/services/reading-generation.service';
import { UserRepository } from '@/server/repositories/user.repository';
import { DEFAULT_USER_ID } from '@/shared/constants';
import { getToday } from '@/shared/date';
import { normalizeReadingTargetWordCount } from '@/shared/reading-target-limits';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const topic = typeof body.topic === 'string' ? body.topic : undefined;
        const vocabBookIds = Array.isArray(body.vocabBookIds)
          ? body.vocabBookIds.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
          : undefined;

        const userRepo = new UserRepository();
        const plan = await userRepo.getPlan(DEFAULT_USER_ID);

        const targetWordCount =
          body.targetWordCount !== undefined
            ? normalizeReadingTargetWordCount(body.targetWordCount, plan.examTarget)
            : undefined;

        const service = new ReadingGenerationService();

        const reading = await service.generateTodayReading({
          userId: DEFAULT_USER_ID,
          date: getToday(),
          topic,
          vocabBookIds,
          targetWordCount,
          onProgress: send,
        });

        send({ type: 'done', percent: 100, message: '生成完成', reading });
      } catch (error) {
        send({
          type: 'error',
          percent: 100,
          message: error instanceof Error ? error.message : '生成失败，请重试',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
