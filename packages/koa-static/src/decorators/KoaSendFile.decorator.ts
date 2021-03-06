
import send, { SendOptions } from 'koa-send';

import { 
  KOA_WEB_SERVER_IDENTIFIER, 
  KoaApplication
} from '@augejs/koa';

import {
  ScanNode,
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
  return function(target: NewableFunction) {
    Metadata.decorate([
      LifecycleOnInitHook(
        async (scanNode: ScanNode, next: CallableFunction) => {
          const koa = scanNode.context.container.get<KoaApplication>(KOA_WEB_SERVER_IDENTIFIER);

          const config = {
            ...scanNode.context.rootScanNode!.getConfig(ConfigName),
            ...scanNode.getConfig(ConfigName),
            ...opts,
          };

          koa.context.sendFile = async function(path: string, opts?: SendOptions) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
