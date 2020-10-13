
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
  __appRootDirName
} from '@augejs/module-core';

const ConfigName = 'static';

// https://github.com/koajs/static-cache
export function KoaStatic(opts?: Options): ClassDecorator {
  return function(target: Function) {
    Metadata.decorate([
      Config({
        [ConfigName]: {
          dir: path.join(__appRootDirName, 'public'),
        }
      }),
      LifecycleOnInitHook(
        async (scanNode: IScanNode, next: Function) => {
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
