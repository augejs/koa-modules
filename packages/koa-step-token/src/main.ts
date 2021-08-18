import { Context } from 'koa';
import { Config, LifecycleOnInitHook, Logger, Metadata, ScanContext, ScanNode } from '@augejs/core';
import { KOA_WEB_SERVER_IDENTIFIER, MiddlewareFactory, HttpStatus, KoaApplication, KoaContext } from '@augejs/koa';
import { StepData, StepDataImpl } from './StepData';
import { REDIS_IDENTIFIER, Commands } from '@augejs/redis';

export { StepData };

const STEP_TOKEN_IDENTIFIER = 'stepToken';
const DEFAULT_TOKE_MAX_AGE= '5m';

const logger = Logger.getLogger(STEP_TOKEN_IDENTIFIER);

interface StepDataManager {
  createStepData(sessionName:string, maxAge?: string | number, props?: Record<string, unknown>): StepData
  findStepData(stepToken: string): Promise<StepData | null>
  deleteStepData(stepToken: string):Promise<void>
}

declare module '@augejs/koa' {
  interface KoaContext extends Context, StepDataManager {
    stepData: StepData | null
  }
}

interface StepTokenManagerConfigOptions {
  maxAge?: string | number
}

export function KoaStepTokenManager(opts?: StepTokenManagerConfigOptions): ClassDecorator {
  return function(target: CallableFunction) {
    Metadata.decorate([
      Config({
        [STEP_TOKEN_IDENTIFIER]: {
          // this will auto keep active for every request.
          maxAge: DEFAULT_TOKE_MAX_AGE,
          ...opts,
        }
      }),

      LifecycleOnInitHook(async (scanNode: ScanNode, next: CallableFunction) => {
        const context: ScanContext = scanNode.context;
        const koa = context.container.get<KoaApplication>(KOA_WEB_SERVER_IDENTIFIER);
        const redis = context.container.get<Commands>(REDIS_IDENTIFIER);

        const config: StepTokenManagerConfigOptions = {
          ...scanNode.context.rootScanNode!.getConfig(STEP_TOKEN_IDENTIFIER),
          ...scanNode.getConfig(STEP_TOKEN_IDENTIFIER),
        };

        const stepDataManager: StepDataManager = {

          createStepData(sessionName:string,  maxAge?: string | number, props?: Record<string, unknown>): StepData {
            const currentMaxAge: string | number = (maxAge ?? config.maxAge ?? DEFAULT_TOKE_MAX_AGE) as string | number;
            return StepDataImpl.create(redis, sessionName, currentMaxAge, props);
          },

          async findStepData(stepToken: string): Promise<StepData | null> {
            return await StepDataImpl.find(redis, stepToken);
          },
          
          async deleteStepData(stepToken: string):Promise<void> {
            await StepDataImpl.delete(redis, stepToken);
          },
        }

        koa.context.stepData = null;

        Object.assign(koa.context, stepDataManager);

        await next();
      })
    ], target);
  }
}

export function KoaStepTokenMiddleware(sessionName: string | string[] | null, sessionStep: string): MethodDecorator {
  return MiddlewareFactory(async () => {
    return async (ctx: KoaContext, next: CallableFunction) => {
      const stepToken:string = (ctx.get('step-token') || (ctx.request.body as Record<string, string>)?.['step_token'] || ctx.request.query?.['step_token'] || '') as string;
      if (!stepToken) {
        logger.warn(`ip: ${ctx.ip} stepToken is required!`);
        ctx.throw(HttpStatus.StatusCodes.FORBIDDEN, 'StepToken is required');
      }

      const stepData = await ctx.findStepData(stepToken);
      if (!stepData) {
        logger.warn(`ip: ${ctx.ip} stepToken is invalid!`);
        ctx.throw(HttpStatus.StatusCodes.FORBIDDEN, 'StepToken is invalid');
      }

      if (sessionName) {
        let isValidSessionName = false;
        if (Array.isArray(sessionName) && sessionName.length > 0 && sessionName.includes(stepData.sessionName)) {
          isValidSessionName = true;
        } else if (typeof sessionName === 'string' && sessionName === stepData.sessionName) {
          isValidSessionName = true;
        }

        if (!isValidSessionName) {
          logger.warn(`ip: ${ctx.ip} sessionName is invalid! expect ${sessionName} received ${stepData.sessionName}`);
          ctx.throw(HttpStatus.StatusCodes.FORBIDDEN, 'SessionName is invalid');
        }
      }

      if (sessionStep) {
        const currentStep = stepData.getCurrentStep();
        if (stepData.getCurrentStep() !== sessionStep) {
          logger.warn(`ip: ${ctx.ip} sessionStep ${currentStep} is invalid! expect ${sessionStep} received ${currentStep}`);
          ctx.throw(HttpStatus.StatusCodes.FORBIDDEN, 'SessionStep is invalid');
        }
      }

      ctx.stepData = stepData;
  
      await next();

      const newStepData = ctx.stepData;
      
      // delete the old one.
      if (!stepData.hasNextStep() || newStepData !== stepData) {
        await ctx.deleteStepData(stepData.token);
      }
    }
  })
}


