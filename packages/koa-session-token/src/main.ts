import { Context } from 'koa';
import { Config, LifecycleOnInitHook, Logger, Metadata, ScanContext, ScanNode } from '@augejs/core';
import { KOA_WEB_SERVER_IDENTIFIER, MiddlewareFactory, HttpStatus, KoaApplication, KoaContext } from '@augejs/koa';
import { SessionData, SessionDataImpl } from './SessionData';
import { REDIS_IDENTIFIER, Commands } from '@augejs/redis';

export { SessionData };

const SESSION_TOKEN_IDENTIFIER = 'sessionToken';
const DEFAULT_TOKE_MAX_AGE= '5m';

const logger = Logger.getLogger(SESSION_TOKEN_IDENTIFIER);

interface SessionDataManager {
  createSessionData(sessionName:string, maxAge?: string | number, props?: Record<string, unknown>): SessionData
  findSessionData(sessionToken: string): Promise<SessionData | null>
  deleteSessionData(sessionToken: string):Promise<void>
}

declare module '@augejs/koa' {
  interface KoaContext extends Context, SessionDataManager {
    sessionData: SessionData | null
  }
}

interface SessionDataConfigOptions {
  maxAge?: string | number
}

export function KoaSessionTokenManager(opts?: SessionDataConfigOptions): ClassDecorator {
  return function(target: CallableFunction) {
    Metadata.decorate([
      Config({
        [SESSION_TOKEN_IDENTIFIER]: {
          // this will auto keep active for every request.
          maxAge: DEFAULT_TOKE_MAX_AGE,
          ...opts,
        }
      }),

      LifecycleOnInitHook(async (scanNode: ScanNode, next: CallableFunction) => {
        const context: ScanContext = scanNode.context;
        const koa = context.container.get<KoaApplication>(KOA_WEB_SERVER_IDENTIFIER);
        const redis = context.container.get<Commands>(REDIS_IDENTIFIER);

        const config: SessionDataConfigOptions = {
          ...scanNode.context.rootScanNode!.getConfig(SESSION_TOKEN_IDENTIFIER),
          ...scanNode.getConfig(SESSION_TOKEN_IDENTIFIER),
        };

        const sessionDataManager: SessionDataManager = {

          createSessionData(sessionName:string,  maxAge?: string | number, props?: Record<string, unknown>): SessionData {
            const currentMaxAge: string | number = (maxAge ?? config.maxAge ?? DEFAULT_TOKE_MAX_AGE) as string | number;
            return SessionDataImpl.create(redis, sessionName, currentMaxAge, props);
          },

          async findSessionData(stepToken: string): Promise<SessionData | null> {
            return await SessionDataImpl.find(redis, stepToken);
          },
          
          async deleteSessionData(stepToken: string):Promise<void> {
            await SessionDataImpl.delete(redis, stepToken);
          },
        }

        koa.context.stepData = null;

        Object.assign(koa.context, sessionDataManager);

        await next();
      })
    ], target);
  }
}

export function KoaSessionTokenMiddleware(sessionName?: string | string[]): MethodDecorator {
  return MiddlewareFactory(async () => {
    return async (ctx: KoaContext, next: CallableFunction) => {
      const sessionToken:string = (ctx.get('session-token') || (ctx.request.body as Record<string, string>)?.['session_token'] || ctx.request.query?.['session_token'] || '') as string;
      if (!sessionToken) {
        logger.warn(`ip: ${ctx.ip} sessionToken is required!`);
        ctx.throw(HttpStatus.StatusCodes.FORBIDDEN, 'SessionToken is Required');
      }

      const sessionData = await ctx.findSessionData(sessionToken);
      if (!sessionData) {
        logger.warn(`ip: ${ctx.ip} sessionToken is invalid!`);
        ctx.throw(HttpStatus.StatusCodes.FORBIDDEN, 'SessionToken is Invalid');
      }

      if (sessionName) {
        let isValidSessionName = false;
        if (Array.isArray(sessionName) && sessionName.length > 0 && sessionName.includes(sessionData.sessionName)) {
          isValidSessionName = true;
        } else if (typeof sessionName === 'string' && sessionName === sessionData.sessionName) {
          isValidSessionName = true;
        }

        if (!isValidSessionName) {
          logger.warn(`ip: ${ctx.ip} sessionName is invalid! expect ${sessionName} received ${sessionData.sessionName}`);
          ctx.throw(HttpStatus.StatusCodes.FORBIDDEN, 'SessionName is Invalid');
        }
      }

      ctx.sessionData = sessionData;

      await next();

      if (!ctx.sessionData) {
        await ctx.deleteSessionData(sessionToken);
      }
    }
  })
}


