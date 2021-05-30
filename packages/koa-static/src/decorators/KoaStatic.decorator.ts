
import path from 'path';
import staticCache, { Options } from 'koa-static-cache';

import { 
  KoaApplication,
  KOA_WEB_SERVER_IDENTIFIER,
} from '@augejs/koa';

import {
  Config,
  ScanNode,
  LifecycleOnInitHook,
  Metadata,
  __appRootDir
} from '@augejs/core';

const ConfigName = 'static';

// https://github.com/koajs/static-cache
export function KoaStatic(opts?: Options): ClassDecorator {
  return function(target: NewableFunction) {
    Metadata.decorate([
      Config({
        [ConfigName]: {
          dir: path.join(__appRootDir, 'public'),
        }
      }),
      LifecycleOnInitHook(
        async (scanNode: ScanNode, next: CallableFunction) => {
          const config = {
            ...scanNode.context.rootScanNode!.getConfig(ConfigName),
            ...scanNode.getConfig(ConfigName),
            ...opts,
          }

          const koa  = scanNode.context.container.get<KoaApplication>(KOA_WEB_SERVER_IDENTIFIER);
          koa.use(staticCache(config));

          await next();
        }
      )
    ], target)
  }
}
