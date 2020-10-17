
import path from 'path';
import send, { SendOptions} from 'koa-send';
import { KOA_WEB_SERVER_IDENTIFIER, IKoaApplication } from '@augejs/koa';

import {
  Config, 
  IScanNode,
  Metadata,
  LifecycleOnInitHook,

} from '@augejs/module-core';

// https://github.com/koajs/send

const ConfigName = 'favicon';

export function KoaFavicon(opts?: any): ClassDecorator {
  return function(target: Function) {
    Metadata.decorate([
      Config({
        [ConfigName]: {
          url: '/favicon.ico',
          path: path.join(__dirname, './assets/favicon.ico'),
          staticOpts: null,
        }
      }),
      LifecycleOnInitHook(
        async (scanNode: IScanNode, next: Function) => {
          const rootScanNodConfig: any = scanNode.context.rootScanNode!.getConfig(ConfigName);
          const scanNodConfig: any = scanNode.getConfig(ConfigName);
          const config: any = {
            ...rootScanNodConfig,
            ...scanNodConfig,
            ...opts,
          }

          const faviconFilePath: string = config.path; 
          const faviconDir: string = path.dirname(faviconFilePath);
          const faviconFileName = path.basename(faviconFilePath);

          const staticOpts: SendOptions = config.staticOpts;

          const koa: IKoaApplication = scanNode.context.container.get<IKoaApplication>(KOA_WEB_SERVER_IDENTIFIER);
          koa.router.get(config.url, async (context) => {
            await send(context, faviconFileName, {
              root: faviconDir,
              ...staticOpts,
            });
          });

          await next();
        }
      )
    ], target);
  }
}
