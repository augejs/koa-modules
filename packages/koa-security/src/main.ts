
import KoaHelmet from 'koa-helmet';
import helmet from 'helmet';
import cors from '@koa/cors';

import { 
  LifecycleOnInitHook,
  Metadata,
  ScanNode
} from '@augejs/core';

import { KoaApplication, KOA_WEB_SERVER_IDENTIFIER } from '@augejs/koa';

export const ConfigName = 'security';

type HelmetOptions = Required<Parameters<typeof helmet>>[0];
type CorsOptions = {
  cors?: cors.Options
}

type SecurityOptions = HelmetOptions & CorsOptions

export function KoaSecurity(opts?: SecurityOptions | CallableFunction): ClassDecorator {
  return function(target: NewableFunction) {
    Metadata.decorate([
      LifecycleOnInitHook(
        async (scanNode: ScanNode, next: CallableFunction) => {
          const config = {
            ...scanNode.context.rootScanNode!.getConfig(ConfigName),
            ...scanNode.getConfig(ConfigName),
            ...opts,
          }

          const koa  = scanNode.context.container.get<KoaApplication>(KOA_WEB_SERVER_IDENTIFIER);
          
          if (config.cors) {
            koa.use(cors(config.cors));
          }

          koa.use(KoaHelmet(config));

          await next();
        }
      )
    ], target)
  }
}
