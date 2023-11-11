import { IAnyValueHandler, ValidReturnTypes } from "../types";

export const simpleForm = ({
    values,
    onChange,
}: {
    values?: any;
    onChange: (args: IAnyValueHandler) => ValidReturnTypes;
}) => {
    return {
        values,
        errors: {},
        checks: {},
        busy: false,
        reset: () => { },
        setValues: (values: any) => { },
        setObject: (values: any) => { },
        setValue: (name: string, value?: any) => { },

        setErrors: (values: any, force?: boolean) => { },
        setError: (key: string, option?: any) => { },
        clearError: (key: string, option?: string) => { },

        submitHandler: () => { },
        changeHandler: onChange,
    };
};