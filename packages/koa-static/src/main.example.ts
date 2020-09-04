import { 
  ILogger, 
  boot, 
  GetLogger, 
  Value,
  Module,
  Config
} from '@augejs/module-core';

import {
  KoaWebServer,
  Prefix, 
  RequestMapping,
  RequestParams,
  } from '@augejs/koa';

import { 
  KoaStaticMiddleware,
  KoaFavicon,
} from './main';
  
import { Context } from 'koa';

@Prefix('/module')
@Module()
class Module1 {

  @GetLogger()
  logger!:ILogger;

  @RequestMapping()
  async file(@RequestParams.Context() context: Context) {
    await context.sendFile('test.text');
  }
}

@KoaFavicon()
@KoaWebServer()
@Module({
  subModules: [
    Module1,
  ]
})
class AppModule {
  @GetLogger()
  logger!:ILogger;

  @Value('/')
  globalConfig!:Record<string, any>;

  async onInit() {
    this.logger.info('app on onInit');
  }

  @KoaStaticMiddleware()
  @RequestMapping.Get('/public/:any')
  async public() {
  }

  async onAppWillReady() {
    this.logger.info('app on onAppWillReady');
  }

  async onAppDidReady() {

    const { host, port } = this.globalConfig.webserver;
    
    this.logger.info(`app on onAppDidReady http://${host}:${port}`);
  }
}

async function main() {
  await boot(AppModule);
}

main();
