export type Factory<T> = (container: Container) => T | Promise<T>;

export type Resolver<T> = () => Promise<T>;

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

export interface ContainerOptions {
  parent?: Container;
}

export class Container {
  private readonly registrations = new Map<string, Registration<unknown>>();
  private readonly parent?: Container;

  constructor(options?: ContainerOptions) {
    this.parent = options?.parent;
  }

  register<T>(name: string, factory: Factory<T>, singleton = true): void {
    this.registrations.set(name, { factory, singleton });
  }

  registerInstance<T>(name: string, instance: T): void {
    this.registrations.set(name, {
      factory: () => instance,
      instance,
      singleton: true,
    });
  }

  has(name: string): boolean {
    return this.registrations.has(name) || (this.parent?.has(name) ?? false);
  }

  async resolve<T>(name: string): Promise<T> {
    const reg = this.registrations.get(name);

    if (!reg) {
      if (this.parent) {
        return this.parent.resolve<T>(name);
      }
      throw new Error(`Service not registered: ${name}`);
    }

    if (reg.singleton) {
      if (!reg.instance) {
        reg.instance = await reg.factory(this);
      }
      return reg.instance as T;
    }

    return reg.factory(this) as Promise<T>;
  }

  createChild(): Container {
    return new Container({ parent: this });
  }

  clear(): void {
    this.registrations.clear();
  }
}
