import { makeCUID } from "../helpers";

export interface EventArgs {
  sender: any;
  event: string;
  args?: any;
}

export type EventHandler = (
  e: EventArgs
) => Promise<any> | Promise<void> | any | void;

export interface IEventRegistery {
  [event: string]: {
    id: string;
    handler: EventHandler;
  }[];
}

export interface EventEmitterProps {
  sender?: any;
}

export class EventEmitter {
  registry: IEventRegistery = {};
  constructor(public readonly props?: EventEmitterProps) {}

  addListener(event: string, handler: EventHandler) {
    if (!this.registry[event]) {
      this.registry[event] = [];
    }
    const key = makeCUID();
    this.registry[event].push({
      id: key,
      handler,
    });
    return key;
  }

  removeListener(id: string) {
    const keys = Object.keys(this.registry);
    for (const key of keys) {
      const entry = this.registry[key].find((i) => i.id === id);
      if (entry) {
        this.registry[key] = this.registry[key].filter((i) => i.id !== id);
        return;
      }
    }
  }

  removeAllListener(key: string) {
    delete this.registry[key];
  }

  async emit(event: string, args?: any) {
    if (!this.registry[event]) {
      return;
    }
    for (const eventHandlerItem of this.registry[event]) {
      await eventHandlerItem.handler({
        sender: this.props?.sender || this,
        event,
        args,
      });
    }
  }
}
