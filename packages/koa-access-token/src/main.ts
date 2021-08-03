import crypto from 'crypto';

import { Config, LifecycleOnInitHook, Logger, Metadata, ScanContext, ScanNode } from '@augejs/core';
import { KOA_WEB_SERVER_IDENTIFIER, MiddlewareFactory, HttpStatus, KoaApplication, KoaContext } from '@augejs/koa';
import { I18N_IDENTIFIER, I18n } from '@augejs/i18n';
import { FindAccessDataListByUserIdOpts, AccessData, AccessDataImpl } from './AccessData';
import { REDIS_IDENTIFIER, Commands } from '@augejs/redis';

export { AccessData };

const ACCESS_TOKEN_IDENTIFIER = 'accessToken';
const DEFAULT_ACCESS_TOKE_MAX_AGE= '20m';

const logger = Logger.getLogger(ACCESS_TOKEN_IDENTIFIER);

interface AccessDataManager {
  createAccessData(userId:string, maxAge?: string | number): AccessData;
  findAccessData(accessToken: string): Promise<AccessData | null>
  findAccessDataListByUserId(userId: string, opts?: FindAccessDataListByUserIdOpts): Promise<AccessData[]>
  deleteAccessData(accessToken: string):Promise<void>
}

declare module '@augejs/koa' {
  interface KoaContext extends AccessDataManager {
    accessData: AccessData | null
  }
}

interface FingerPrintOptions {
  userAgent?: boolean
  ip?: boolean
  deviceUUId?:boolean
}

type CalculateFingerPrintFunction =  (ctx: KoaContext, fingerPrintOptions?: FingerPrintOptions) => Promise<string> | string;

interface AccessDataConfigOptions {
  maxAge?: string | number
  autoKeepActive?: boolean
  fingerPrintOptions?: FingerPrintOptions
  customCalculateFingerPrint?: CalculateFingerPrintFunction
}

export function AccessTokenManager(opts?: AccessDataConfigOptions): ClassDecorator {
  return function(target: CallableFunction) {
    Metadata.decorate([
      Config({
        [ACCESS_TOKEN_IDENTIFIER]: {
          // this will auto keep active for every request.
          maxAge: DEFAULT_ACCESS_TOKE_MAX_AGE,
          autoKeepActive: true,
          ...opts,
        }
      }),

      LifecycleOnInitHook(async (scanNode: ScanNode, next: CallableFunction) => {
        const context: ScanContext = scanNode.context;
        const koa = context.container.get<KoaApplication>(KOA_WEB_SERVER_IDENTIFIER);
        const redis = context.container.get<Commands>(REDIS_IDENTIFIER);

        const config: AccessDataConfigOptions = {
          ...scanNode.context.rootScanNode!.getConfig(ACCESS_TOKEN_IDENTIFIER),
          ...scanNode.getConfig(ACCESS_TOKEN_IDENTIFIER),
        };

        const accessDataManager: AccessDataManager = {
          createAccessData(userId:string, maxAge?: string | number): AccessData {
            const ctx = this as KoaContext;
            const ip = ctx.ip;
            const currentMaxAge: string | number = (maxAge ?? config.maxAge ?? DEFAULT_ACCESS_TOKE_MAX_AGE) as string | number;
            return AccessDataImpl.create(redis, userId, ip, currentMaxAge);
          },

          async findAccessData(accessToken: string): Promise<AccessData | null> {
            return await AccessDataImpl.find(redis, accessToken);
          },

          async findAccessDataListByUserId(userId: string, opts?: FindAccessDataListByUserIdOpts): Promise<AccessData[]> {
            const ctx = this as KoaContext;
            const currentAccessToken = ctx.accessData?.token ?? null;
            return await AccessDataImpl.findAccessDataListByUserId(redis, userId, currentAccessToken, opts);
          },
          
          async deleteAccessData(accessToken: string):Promise<void> {
            await AccessDataImpl.delete(redis, accessToken);
          },
        }

        koa.context.calculateFingerprint = async function (): Promise<string> {
          const ctx = this as KoaContext;
          if (typeof config?.customCalculateFingerPrint === 'function') {
            return await config.customCalculateFingerPrint(ctx, config.fingerPrintOptions) ?? '';
          }
          const deviceId = config.fingerPrintOptions?.deviceUUId ? ctx.get('device-uuid') : '';
          const ip = config?.fingerPrintOptions?.ip ? ctx.ip : '';
          const userAgent: string = config?.fingerPrintOptions?.userAgent ? ctx.get('user-agent') : '';
          return crypto.createHash('md5').update(`${deviceId}${ip}${userAgent}`).digest('hex');
        }

        koa.context.accessData = null;

        Object.assign(koa.context, accessDataManager);

        await next();
      })
    ], target);
  }
}


type AccessTokenMiddlewareOptions = {
  optional?: boolean,
  autoActive?: boolean,
  autoSave?: boolean,
  checkFingerprint?: boolean,
}

// https://github.com/koajs/bodyparser
export function AccessTokenMiddleware(opts?: AccessTokenMiddlewareOptions): ClassDecorator & MethodDecorator {
  return MiddlewareFactory(async (scanNode: ScanNode) => {
    const i18n = scanNode.context.container.get<I18n>(I18N_IDENTIFIER);

    const config: AccessTokenMiddlewareOptions = {
      autoActive: true,
      autoSave: true,
      ...scanNode.context.rootScanNode!.getConfig(ACCESS_TOKEN_IDENTIFIER),
      ...scanNode.getConfig(ACCESS_TOKEN_IDENTIFIER),
      ...opts,
    };

    const autoSave = !!config.autoSave;
    const autoActive = !!config.autoActive;
    const checkFingerprint = !!config.checkFingerprint;
    const optional = !!config?.optional;

    return async (ctx: KoaContext, next: CallableFunction) => {
      const accessToken:string = ctx.get('Authorization') ?? (ctx.request.body as Record<string, unknown>)?.['access_token'] ?? ctx.request.query?.['access_token'];
      if (!accessToken) {
        if (optional) {
          await next();
          return;
        } else {
          // https://github.com/ValueFE/egg-access-token/blob/1f3718bc6a71c548236facc5694e96263a20daa6/app/middleware/accessToken.js#L21
          // todo throw error here
          logger.warn(`ip: ${ctx.ip} accessToken is required!`);

          ctx.throw(HttpStatus.StatusCodes.UNAUTHORIZED, 
            i18n.formatMessage({
              id: 'Error_Missing_Access_Token',
              defaultMessage: 'AccessToken is Required'
            })
          )
        }
      }

      const accessData = await ctx.findAccessData(accessToken);

      if (!accessData) {
        if (optional) {
          await next();
          return;
        } else {
          // todo throw error here
          // https://github.com/ValueFE/egg-access-token/blob/1f3718bc6a71c548236facc5694e96263a20daa6/app/middleware/accessToken.js#L35
          logger.warn(`ip: ${ctx.ip} accessToken is invalid!`);
          ctx.throw(HttpStatus.StatusCodes.UNAUTHORIZED, 
            i18n.formatMessage({
              id: 'Error_Invalid_Access_Token',
              defaultMessage: 'AccessToken Is Invalid'
            })
          )
        }
      }

      if (accessData.isDeadNextTime) {
        const flashMessage = accessData.flashMessage ?? '';
        logger.warn(`userId: ${accessData.userId} accessToken is ready to invalid. message: ${flashMessage}`);
        await accessData.delete();
        ctx.throw(HttpStatus.StatusCodes.UNAUTHORIZED, flashMessage);
      }

      if (checkFingerprint) {
        const calculatedFingerprint = ctx.calculateFingerprint();
        if (accessData.fingerprint !== calculatedFingerprint) {
          await accessData.delete();
          logger.warn(`userId: ${accessData.userId} fingerprint is invalid expect: ${calculatedFingerprint} receive: ${accessData.fingerprint}`);
        
          ctx.throw(HttpStatus.StatusCodes.UNAUTHORIZED, 
            i18n.formatMessage({
              id: 'Error_Invalid_Client_Fingerprint',
              defaultMessage: 'Client fingerprint is changed!'
            })
          )
        }
      }

      ctx.accessData = accessData;

      await next();

      if (!ctx.accessData) {
        await accessData.delete();
        return;
      }

      if (accessData.flashMessage) {
        accessData.flashMessage = null;
      }

      if (autoSave) {
        await accessData.save();
      }

      if (autoActive && !accessData.hasSaved) {
        await accessData.active();
      }
    }
  })
}

