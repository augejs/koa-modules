
import path from 'path';

import * as swagger from 'swagger2';
import { ui } from 'swagger2-koa';
import jsonValidator from 'is-my-json-valid';
import schemaJson from 'swagger2/dist/schema.json';

import { 
  KoaApplication,
  KOA_WEB_SERVER_IDENTIFIER,
} from '@augejs/koa';

import {
  Config,
  ScanNode,
  LifecycleOnInitHook,
  Metadata,
  __appRootDir
} from '@augejs/core';

type Options = {
  path?: string,
  url?: string,
  skipUrls?: string[],
}

const ConfigName = 'swagger';

// https://github.com/carlansley/swagger2-koa
export function KoaSwagger(opts?: Options): ClassDecorator {
  return function(target: NewableFunction) {
    Metadata.decorate([
      Config({
        [ConfigName]: {
          verbose: false,
          path: path.join(__appRootDir, 'swagger.yml'),
          url: "/swagger",
        }
      }),
      LifecycleOnInitHook(
        async (scanNode: ScanNode, next: CallableFunction) => {
          const config = {
            ...scanNode.context.rootScanNode!.getConfig(ConfigName),
            ...scanNode.getConfig(ConfigName),
            ...opts,
          } as Options;

          const documentPath = config.path ?? path.join(__appRootDir, 'swagger.yml');
          const document = swagger.loadDocumentSync(documentPath) as swagger.Document;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const schemaValidator = jsonValidator(schemaJson as any, {
            verbose: true,
          });

          if (!schemaValidator(document)) {
            const error = schemaValidator.errors.map(error => {
              return `${error.field} ${error.message}`;
            }).join('\n');
            throw Error(`document: ${config.path} does not conform to the Swagger 2.0 schema \n ${error}`);
          }

          const koa = scanNode.context.container.get<KoaApplication>(KOA_WEB_SERVER_IDENTIFIER);
          const url = opts?.url ?? "/swagger";
          koa.use(ui(document, url, opts?.skipUrls));

          await next();
        }
      )
    ], target)
  }
}
