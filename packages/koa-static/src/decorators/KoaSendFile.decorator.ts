
import send, { SendOptions } from 'koa-send';

import { 
  KOA_WEB_SERVER_IDENTIFIER, 
  IKoaApplication
} from '@augejs/koa';

import {
  IScanNode,
  Metadata,
  LifecycleOnInitHook,
} from '@augejs/core';

declare module 'koa' {
  interface Context {
    sendFile(path: string, opts?: SendOptions): Promise<void>;
  }
}

const ConfigName = 'sendFile';

export function KoaSend(opts?: SendOptions): ClassDecorator {
  return function(target: Function) {
    Metadata.decorate([
      LifecycleOnInitHook(
        async (scanNode: IScanNode, next: Function) => {
          const koa:IKoaApplication = scanNode.context.container.get<IKoaApplication>(KOA_WEB_SERVER_IDENTIFIER);

          const config: any = {
            ...scanNode.context.rootScanNode!.getConfig(ConfigName),
            ...scanNode.getConfig(ConfigName),
            ...opts,
          };

          koa.context.sendFile = async function(path: string, opts?: SendOptions) {
            await send(this as any, path, {
              ...config,
              ...opts
            });
          };

          await next();
        }
      )
    ], target);
  }
}
