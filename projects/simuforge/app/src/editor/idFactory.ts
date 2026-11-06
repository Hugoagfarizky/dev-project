export type IdFactory = () => string;

export function createIdFactory(factory?: IdFactory): IdFactory {
  if (factory) {
    return factory;
  }
  return () => crypto.randomUUID();
}
