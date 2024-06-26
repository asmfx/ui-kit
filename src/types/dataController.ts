import { ObjectSchema, Schema, ValidationError } from "joi";
import { ValidReturnTypes } from "./common";
import { EventEmitter } from "../controllers/EventEmitter";

export interface UseDataControllerParameters<T> {
  initialValues?: Partial<T>;
  verbose?: boolean;
  validate?:
    | ((values: Partial<T>) => ValidationError | undefined)
    | Schema
    | ObjectSchema<any>
    | any;
  onChange?: (values: Partial<T>, options: any) => ValidReturnTypes;
  onSubmit?: (values: Partial<T>) => any;
  onSuccess?: (result: any, values: Partial<T>) => any;
  onFailed?: (error: any, values: Partial<T>) => any;
}

export interface IAnyValueHandler {
  name: string;
  selector?: string;
  value: any;
  autoSave?: boolean;
  partial?: boolean;
}

export interface IDataController extends UseDataControllerReturnValues<any> {}

export interface UseDataControllerReturnValues<T> {
  values: Partial<T>;
  errors: any;
  checks: any;
  busy: boolean;
  events: EventEmitter;
  version: number;

  getValue: (selector?: string) => any;
  setValue: (
    selector: string | undefined,
    value: any,
    options?: {
      merge?: boolean;
      triggerOnChange?: boolean;
      triggerEvent?: string;
    }
  ) => ValidReturnTypes;
  injectToArray: (
    selector: string,
    value: any,
    options?: {
      merge?: boolean;
      triggerOnChange?: boolean;
      triggerEvent?: string;
    }
  ) => ValidReturnTypes;
  deleteValue: (
    selector: string,
    options?: {
      triggerOnChange?: boolean;
      triggerEvent?: string;
    }
  ) => ValidReturnTypes;

  move: (from: string, to: string) => ValidReturnTypes;

  setErrors: (values: any, force?: boolean) => ValidReturnTypes;
  setError: (key: string, option?: any) => ValidReturnTypes;
  clearError: (key: string, option?: string) => ValidReturnTypes;

  changeHandler: (arg: IAnyValueHandler) => ValidReturnTypes;
  submit: () => ValidReturnTypes;
  reset: () => ValidReturnTypes;
}
