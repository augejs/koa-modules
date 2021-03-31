import path from 'path';
import send, { SendOptions} from 'koa-send';
import { KOA_WEB_SERVER_IDENTIFIER, IKoaApplication } from '@augejs/koa';

import {
  Config, 
  IScanNode,
  Metadata,
  LifecycleOnInitHook,

} from '@augejs/core';

// https://github.com/koajs/send

const ConfigName = 'favicon';

type FaviconOption = {
  url?: string,
  path?: string,
  staticOpts?: SendOptions
}

export function KoaFavicon(opts?: FaviconOption): ClassDecorator {
  return function(target: NewableFunction) {
    Metadata.decorate([
      Config({
        [ConfigName]: {
          url: '/favicon.ico',
          path: path.join(__dirname, './assets/favicon.ico'),
          staticOpts: null,
        }
      }),
      LifecycleOnInitHook(
        async (scanNode: IScanNode, next: CallableFunction) => {
          const rootScanNodConfig = scanNode.context.rootScanNode!.getConfig(ConfigName);
          const scanNodConfig = scanNode.getConfig(ConfigName);
          const config = {
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
