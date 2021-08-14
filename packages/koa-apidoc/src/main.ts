
import path from 'path';
import apidocCore from 'apidoc-core';
import markdownIt from 'markdown-it';

import { 
  KoaApplication,
  KOA_WEB_SERVER_IDENTIFIER,
} from '@augejs/koa';

import {
  Config,
  ScanNode,
  LifecycleOnInitHook,
  Metadata,
} from '@augejs/core';
import staticCache from 'koa-static-cache';
import { Context } from 'koa';

const ConfigName = 'apidoc';


interface Options {
  title: string
  version: string
  url?: string
  description?: string
  useHostUrlAsSampleUrl?: boolean
  sampleUrl?: string
  header?: string
  footer?: string
  order?: string[]
  template?: {
    forceLanguage?: 'ca' | 'cs' | 'de' | 'es' | 'fr' | 'it' | 'nl' | 'pl' | 'pl_br' | 'ro' | 'ru' | 'tr' | 'vi' | 'zh' | 'zh_cn'
    withCompare?: boolean
    jQueryAjaxSetup?: Record<string, any>
    aloneDisplay?: boolean
  }
}

// https://apidocjs.com
export function KoaApidoc(opts?: Options): ClassDecorator {
  return function(target: NewableFunction) {
    Metadata.decorate([
      Config({
        [ConfigName]: {
          url: '/apidoc'
        }
      }),
      LifecycleOnInitHook(
        async (scanNode: ScanNode, next: CallableFunction) => {
          const config = {
            ...scanNode.context.rootScanNode!.getConfig(ConfigName),
            ...scanNode.getConfig(ConfigName),
            ...opts,
          } as Options;

          const md = markdownIt();

          let header: null | {content: string } = null;
          if (config.header) {
            header = {
              content: md.renderInline(config.header)
            }
          }

          let footer: null | {content: string } = null;

          if (config.footer) {
            footer = {
              content: md.renderInline(config.footer)
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-empty-function
          function mockLog() {}
          apidocCore.setLogger({
            debug: mockLog,
            verbose: mockLog,
            info: mockLog,
            warn: mockLog,
            error: mockLog,
          });

          const contents = Metadata.getMetadata(Apidoc, Apidoc) as (string[] | undefined | null);
          const apiResults: unknown[] = Array.isArray(contents) ?
            contents.map(content => {
              const parsedResults = apidocCore.parseSource(Buffer.from(content));
              if (Array.isArray(parsedResults)) {
                const apiResult = parsedResults[0];
                if (apiResult && apiResult.local) {
                  apiResults.push(apiResult);
                }
              }
            }) : [];

          const koa  = scanNode.context.container.get<KoaApplication>(KOA_WEB_SERVER_IDENTIFIER);

          const apiDataPath = path.join('/', config.url + '', 'api_data.js');
          const apiProjectPath = path.join('/', config.url + '', 'api_project.js');

          koa.use(async (ctx: Context, next: CallableFunction)=>{
            if (ctx.url.startsWith(apiDataPath)) {
              ctx.type = 'application/javascript';
              ctx.body = `define({"api": ${JSON.stringify(apiResults)}})`;
            } else if (ctx.url.startsWith(apiProjectPath)) {
              ctx.type = 'application/javascript';
              ctx.body = `define(${JSON.stringify({
                name: config.title ?? 'apidoc',
                version: config.version ?? '0.0.1',
                description: config.description ?? '',
                template: config.template,
                header: header || undefined,
                footer: footer || undefined,
                order: config.order,
              })})`;
            }
            await next();
          })

          koa.use(staticCache({
            maxAge: 60 * 60 * 24 * 30,
            prefix: config.url,
            dir: path.join(__dirname, 'apidoc')
          }));

          await next();
        }
      )
    ], target)
  }
}

export function Apidoc(content: string): MethodDecorator {
  return () => {
    Metadata.defineInsertEndArrayMetadata(Apidoc, [ content ], Apidoc);
  }
}




