import { Logger } from '@augejs/core';
import { MiddlewareFactory, HttpStatus, KoaContext } from '@augejs/koa';
import { REDIS_IDENTIFIER, Commands } from '@augejs/redis';
import ms from 'ms';

const LIMIT_REQUEST_IDENTIFIER = 'limitRequest';

const logger = Logger.getLogger(LIMIT_REQUEST_IDENTIFIER);

interface LimitRequestOpts {
  limitTime?: number | string
}

export function KoaLimitRequestMiddleware(limitOpts: LimitRequestOpts): ClassDecorator & MethodDecorator {
  const limitTime = (typeof limitOpts.limitTime === 'string' ? ms(limitOpts.limitTime) : limitOpts.limitTime) ?? 0;
  return MiddlewareFactory(async () => {
    return async (ctx: KoaContext, next: CallableFunction) => {
      const redis = ctx.scanContext.container.get<Commands>(REDIS_IDENTIFIER);

      const requestPath = `${ctx.request.method}:${ctx.request.path}`;
      const accessToken = (ctx.get('Authorization') || (ctx.request.body as Record<string, string>)?.['access_token'] || ctx.request.query?.['access_token'] || '') as string;
      const ipAddress = ctx.ip;

      const limitRequestContent = `${ipAddress}:${accessToken}:${requestPath}`;

      const redisKey = `limit:${limitRequestContent}`;
      const lastTimeStr = await redis.get(redisKey);
      const lastTime = Number(lastTimeStr);
      const currentTime = Date.now();
      const timePassed = currentTime - lastTime;

      // ctx.set('X-RateLimit-Limit', limitTime + '');
      // ctx.set('X-RateLimit-Remaining', remaining);
      // ctx.set('X-RateLimit-Reset', reset)

      if (timePassed < limitTime) {
        ctx.throw(HttpStatus.StatusCodes.TOO_MANY_REQUESTS, 'Too Many Requests');
      }

      await next();

      await redis.set(redisKey, currentTime, 'PX', limitTime);
    }
  })
}


