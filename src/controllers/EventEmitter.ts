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
    key: string;
    handler: EventHandler;
  }[];
}

export interface EventEmitterProps {
  sender?: any;
}

export class EventEmitter {
  registery: IEventRegistery = {};
  constructor(public readonly props?: EventEmitterProps) {}

  addListener(event: string, handler: EventHandler) {
    if (!this.registery[event]) {
      this.registery[event] = [];
    }
    const key = makeCUID();
    this.registery[event].push({
      key,
      handler,
    });
    return key;
  }

  removeListener(key: string) {
    const keys = Object.keys(this.registery);
    for (const key of keys) {
      const entry = this.registery[key].find((i) => i.key === key);
      if (entry) {
        this.registery[key] = this.registery[key].filter((i) => i.key !== key);
        return;
      }
    }
  }

  removeAllListener(key: string) {
    delete this.registery[key];
  }

  emit(event: string, args: any) {
    if (!this.registery[event]) {
      return;
    }
    for (const eventHandlerItem of this.registery[event]) {
      eventHandlerItem.handler({
        sender: this.props?.sender || this,
        event,
        args,
      });
    }
  }
}
