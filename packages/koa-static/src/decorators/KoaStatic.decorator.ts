
import path from 'path';
import staticCache, { Options } from 'koa-static-cache';

import { 
  MiddlewareFactory,
  KOA_ROUTER_IDENTIFIER,
} from '@augejs/koa';

import Router from '@koa/router';

import {
  Config,
  IScanNode,
  LifecycleOnInitHook,
  Metadata,
} from '@augejs/module-core';

const STATIC_IDENTIFIER = 'static';

// https://github.com/koajs/static-cache
export function KoaStatic(opts?: Options): ClassDecorator {
  return function(target: Function) {
    Metadata.decorate([
      Config({
        [STATIC_IDENTIFIER]: {
          dir: path.join(process.cwd(), 'public'),
        }
      }),
      LifecycleOnInitHook(
        async (scanNode: IScanNode, next: Function) => {
          const config: any = {
            ...scanNode.context.rootScanNode!.getConfig(STATIC_IDENTIFIER),
            ...scanNode.getConfig(STATIC_IDENTIFIER),
            ...opts,
          }

          const prefix: string = config?.prefix || '/';
          const router: Router = scanNode.context.container.get(KOA_ROUTER_IDENTIFIER);
          router.get(prefix, {
            ...config,
            prefix: '',
          })

          await next();
        }
      )
    ], target)
  }
}


export function KoaStaticMiddleware(opts?: Options | Function): MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return staticCache({
      dir: path.join(process.cwd(), 'public'),
      ...scanNode.context.rootScanNode!.getConfig(STATIC_IDENTIFIER),
      ...scanNode.getConfig(STATIC_IDENTIFIER),
      ...opts,
      // here is a middleware the prefix will define in route. not here.
      prefix: '',
    });
  });
}

