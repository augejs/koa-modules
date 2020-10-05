
import path from 'path';
import staticCache, { Options } from 'koa-static-cache';

import { 
  IKoaApplication,
  KOA_WEB_SERVER_IDENTIFIER,
} from '@augejs/koa';

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

          const koa  = scanNode.context.container.get<IKoaApplication>(KOA_WEB_SERVER_IDENTIFIER);
          koa.use(staticCache(config));

          await next();
        }
      )
    ], target)
  }
}
