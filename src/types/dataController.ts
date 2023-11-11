import { ValidReturnTypes } from "./common";

export interface UseDataControllerParameters<T> {
    initialValues?: Partial<T>;
    validate?: ((values: Partial<T>) => any) | any;
    onChange?: (values: Partial<T>, checks: any) => ValidReturnTypes;
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

export interface IDataController extends UseDataControllerReturnValues<any> { }

export interface UseDataControllerReturnValues<T> {
    values: Partial<T>;
    errors: any;
    checks: any;
    busy: boolean;

    getValue: (selector?: string) => any;
    setValue: (selector: string | undefined, value: any, merge?: boolean) => ValidReturnTypes;

    setErrors: (values: any, force?: boolean) => ValidReturnTypes;
    setError: (key: string, option?: any) => ValidReturnTypes;
    clearError: (key: string, option?: string) => ValidReturnTypes;

    changeHandler: (arg: IAnyValueHandler) => ValidReturnTypes;
    submit: () => ValidReturnTypes;
    reset: () => ValidReturnTypes;
}
