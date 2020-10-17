import { MiddlewareFactory, IKoaContext } from '@augejs/koa';

import {
  IScanNode
} from '@augejs/module-core';

interface IErrorHandleOptions {
  [key: string]: (ctx: IKoaContext, err: any, scanNode: IScanNode)=> Promise<void>
}

export const ConfigName = 'errorHandle'

export function KoaErrorHandleMiddleWare(opts?: IErrorHandleOptions | Function): ClassDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }
  
    const defaultErrorHandleOptions: IErrorHandleOptions = {
      text: async (ctx: IKoaContext, err: any)=>{
        ctx.type = 'text/plain'
        ctx.body = err?.message || '';
      },
      json: async (ctx: IKoaContext, err: any)=>{
        ctx.type = 'application/json';
        ctx.body = {
          error: err?.message,
          stack: (ctx.app.env === 'development' || err?.expose) ? err?.stack : undefined,
        };
      },
    };

    const config: IErrorHandleOptions = {
      ...defaultErrorHandleOptions,
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts,
    };

    const accepts: string[] = Object.keys(config);
    return async (ctx: IKoaContext, next: Function) => {
      try {
        await next();
        if (ctx.response.status === 404 && !ctx.response.body) ctx.throw(404);
      } catch (err) {
        ctx.status = typeof err?.status === 'number' ? err.status : 500;
        // https://inviqa.com/blog/how-build-basic-api-typescript-koa-and-typeorm
        const type: string | boolean = ctx.accepts(accepts);
        if (!!type) {
          const typeHandle: Function | null = config[type as string] || null;
          if (typeHandle) {
            await typeHandle(ctx, err, scanNode);
            return;
          }
        }

        throw err;
      }
    }
  }) 
}

