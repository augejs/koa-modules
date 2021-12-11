import { Document, Info, Schemes, Tag, ExternalDocumentation, Operation } from "swagger2/dist/schema";
import { JSONSchema4 } from "json-schema";

const swaggerDocument = {
  swagger: '2.0',
  info: {},
  paths: {},
  definitions: {},
  tags: [],
};

// eslint-disable-next-line @typescript-eslint/ban-types
type ConstructorFunction = Function;

// eslint-disable-next-line @typescript-eslint/ban-types
type InstanceTarget = object;

// eslint-disable-next-line @typescript-eslint/ban-types
type DefinitionCallback = (document: Document, target: ConstructorFunction | InstanceTarget, propertyKey?: string | symbol) => void 

type DecoratorReturnType = ClassDecorator & MethodDecorator;

interface SecurityDefinition {
  type: 'basic' | 'apiKey' | 'oauth2'
  description?: string
  name: string
  in?: 'header' | 'query'
  flow?: 'implicit' | 'password' | 'application' | 'accessCode' 
  authorizationUrl?: string
  tokenUrl?: string
  scopes?: Record<string, string>
}

export function SwaggerDocumentDefinition(callback: DefinitionCallback): DecoratorReturnType {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: object | Function, propertyKey?: string | symbol) => {
    callback(swaggerDocument as unknown as Document, target, propertyKey);
  }
}

// https://swagger.io/specification/v2

export function SwaggerInfo(info: Info): DecoratorReturnType {
  return SwaggerDocumentDefinition((document: Document) => {
    document.info = info;
  });
}

export function SwaggerHost(host: string): DecoratorReturnType {
  return SwaggerDocumentDefinition((document: Document) => {
    document.host = host;
  });
}

export function SwaggerBasePath(basePath: string): DecoratorReturnType {
  return SwaggerDocumentDefinition((document: Document) => {
    document.basePath = basePath;
  });
}

export function SwaggerSchemes(schemes: Schemes[]): DecoratorReturnType {
  return SwaggerDocumentDefinition((document: Document) => {
    document.schemes = schemes;
  });
}

export function SwaggerConsumes(consumes: string[]): DecoratorReturnType{
  return SwaggerDocumentDefinition((document: Document) => {
    document.consumes = consumes;
  });
}

export function SwaggerProduces(produces: string[]): DecoratorReturnType {
  return SwaggerDocumentDefinition((document: Document) => {
    document.produces = produces;
  });
}

export function SwaggerDefinition(definition: JSONSchema4, name?: string): ClassDecorator {
  return SwaggerDocumentDefinition((document: Document, target: ConstructorFunction | InstanceTarget) => {
    if (!document.definitions) return;

    const targetConstructorFunction = target as ConstructorFunction;
    document.definitions[name ?? targetConstructorFunction.name] = definition;
  });
}

export function SwaggerSecurityDefinition(name:string, securityDefinition: SecurityDefinition): ClassDecorator {
  return SwaggerDocumentDefinition((document: Document) => {
    if (!document.securityDefinitions) return;

    document.securityDefinitions[name] = securityDefinition;
  });
}

export function SwaggerTag(tag: Tag): ClassDecorator {
  return SwaggerDocumentDefinition((document: Document) => {
    if (!document.tags) return;

    const tags = document.tags as unknown as Tag[];
    tags.push(tag);
  });
}

export function SwaggerExternalDocs(externalDocumentation: ExternalDocumentation): ClassDecorator {
  return SwaggerDocumentDefinition((document: Document) => {
    document.externalDocs = externalDocumentation;
  });
}

export function SwaggerAPI(path: string, method: string, operation: Operation): MethodDecorator {
  return SwaggerDocumentDefinition((document: Document, target: ConstructorFunction | InstanceTarget) => {
    if (!document.paths) return;
    // todo do it automatically from router
    // const instanceTarget = target as InstanceTarget;
    let pathObject = document.paths[path];
    if (!pathObject) {
      pathObject = {};
      document.paths[path] = pathObject;
    }
    pathObject[method] = operation;
  });
}

export function getSwaggerDocument(): Document {
  return swaggerDocument as unknown as Document;
}











