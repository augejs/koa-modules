
import send, { SendOptions } from 'koa-send';
import Application from 'koa';

import { 
  KOA_WEB_SERVER_IDENTIFIER, 
} from '@augejs/koa';

import {
  IScanNode,
  Metadata,
  LifecycleOnInitHook,
} from '@augejs/module-core';

declare module 'koa' {
  interface Context {
    sendFile(path: string, opts?: SendOptions): Promise<void>;
  }
}

const SEND_FILE_IDENTIFIER = 'sendFile';

export function KoaSend(opts?: SendOptions): ClassDecorator {
  return function(target: Function) {
    Metadata.decorate([
      LifecycleOnInitHook(
        async (scanNode: IScanNode, next: Function) => {
          const koa:Application = scanNode.context.container.get<Application>(KOA_WEB_SERVER_IDENTIFIER);

          const config: any = {
            ...scanNode.context.rootScanNode!.getConfig(SEND_FILE_IDENTIFIER),
            ...scanNode.getConfig(SEND_FILE_IDENTIFIER),
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
