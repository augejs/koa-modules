
import HttpProxy, { ServerOptions } from 'http-proxy';
import { KoaApplication, KoaContext, KOA_WEB_SERVER_IDENTIFIER } from '@augejs/koa';
import { LifecycleOnAppWillCloseHook, LifecycleOnInitHook, Metadata, ScanNode } from '@augejs/core';

export const ConfigName = 'httpProxy';
export const HTTP_PROXY_IDENTIFIER = Symbol.for(ConfigName);

declare module 'koa' {
  interface Context {
    webProxy(requestOpts: ServerOptions): Promise<void>;
  }
}

export function KoaHttpProxy(opts?: ServerOptions): ClassDecorator {
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

          const proxyServer = HttpProxy.createProxyServer(config);
          scanNode.context.container.bind(HTTP_PROXY_IDENTIFIER).toConstantValue(proxyServer);
  
          const webProxy = async function(this: KoaContext, opts?: ServerOptions): Promise<void> {
            return new Promise((resolve, reject) => {
              proxyServer.web(this.req, this.res, opts, (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                this.body = this.res;
                resolve();
              })
            })
          };

          koa.context.webProxy = webProxy;
          await next();
        }
      ),

      LifecycleOnAppWillCloseHook(
        async (scanNode: ScanNode, next: CallableFunction) => {
          if (!scanNode.context.container.isBound(HTTP_PROXY_IDENTIFIER)) {
            await next();
            return;
          }
          
          await new Promise<void>((resolve) => {
            const proxyServer = scanNode.context.container.get<HttpProxy>(HTTP_PROXY_IDENTIFIER);
            proxyServer.close(() => {
              resolve();
            });
          })

          await next();
        }
      ),
     ], target);     
  }
}
