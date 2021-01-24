import { MiddlewareFactory, IKoaContext } from '@augejs/koa';
import { Validator } from '@augejs/koa';

const { ValidationError } = Validator;

import {
  IScanNode
} from '@augejs/core';

interface IErrorHandleOptions {
  [key: string]: (ctx: IKoaContext, err: any, scanNode: IScanNode)=> Promise<void>
}

export const ConfigName = 'errorHandle'

const defaultErrorHandle = async (ctx: IKoaContext, err: any)=>{
  ctx.type = 'text/plain'
  ctx.body = err?.message || '';
};

export function KoaErrorHandleMiddleWare(opts?: IErrorHandleOptions | Function): ClassDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }
  
    const defaultErrorHandleOptions: IErrorHandleOptions = {
      json: async (ctx: IKoaContext, err: any) => {
        ctx.type = 'application/json';
        
        if (Array.isArray(err) &&
          err.length > 0 &&
          err[0] instanceof ValidationError) {
          ctx.body = {
            error: err,
          };
          return;
        }

        ctx.body = {
          error: err?.message,
          stack: (ctx.app.env === 'development' || err?.expose) ? err?.stack : undefined,
        };
      },
      default: defaultErrorHandle,
    };

    const config: IErrorHandleOptions = {
      ...defaultErrorHandleOptions,
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts,
    };

    const accepts: string[] = Object.keys(config).filter(key => !!config[key]);
    return async (ctx: IKoaContext, next: Function) => {
      try {
        await next();
        if (ctx.response.status === 404 && !ctx.response.body) ctx.throw(404);
      } catch (err) {
        ctx.status = typeof err?.status === 'number' ? err.status : 500;
        // https://inviqa.com/blog/how-build-basic-api-typescript-koa-and-typeorm
        const type: string | boolean = ctx.accepts(accepts);
        const typeErrorHandle: Function = !!type ? 
          (config[type as string] || config['default'] || defaultErrorHandle) : 
          defaultErrorHandle;
        await typeErrorHandle(ctx, err, scanNode);
      }
    }
  }) 
}

