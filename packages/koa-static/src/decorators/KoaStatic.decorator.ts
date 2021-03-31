
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
        async (scanNode: IScanNode, next: CallableFunction) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const config: any = {
            ...scanNode.context.rootScanNode!.getConfig(ConfigName),
            ...scanNode.getConfig(ConfigName),
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
