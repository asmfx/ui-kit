import { useEffect, useState } from "react";
import { getControlValidationErrors } from "../helpers";
import {
  UseDataControllerParameters,
  UseDataControllerReturnValues,
  IAnyValueHandler,
} from "../types";
import { ValidationError } from "joi";
import { EventEmitter } from "./EventEmitter";

const selectProperty = (
  values: any,
  selector: string
): { reference: any; key: string; value: any } => {
  const arr = selector
    .split(/[.\[\]]/g)
    .filter((i) => i !== "" || i !== undefined);
  if (arr.length < 2) {
    return { reference: values, key: selector, value: values?.[selector] };
  }
  const last = arr.splice(arr.length - 1, 1)[0];
  let reference = values;
  for (const key of arr) {
    if (key.includes(":")) {
      const [field, value] = key.split(":");
      reference = reference?.find?.((item: any) => item[field] == value);
    } else {
      const index = key ? parseInt(key) : NaN;
      reference = isNaN(index) ? reference?.[key] : reference?.[index];
    }
  }
  return { reference, key: last, value: reference?.[last] };
};

const duplicateForUpdate = (
  source: any,
  selector: string,
  value: any,
  merge?: boolean
): any => {
  const arr = selector.split(/[.\[\]]/g).filter((i) => i);
  const newValues = { ...source };
  if (arr.length < 2) {
    if (typeof value === "object" && !Array.isArray(value)) {
      newValues[selector] = { ...value };
    } else {
      newValues[selector] = value;
    }
    return newValues;
  }
  const last = arr.splice(arr.length - 1, 1)[0];
  let parent = newValues;
  let parentKey = "";
  let reference = parent;
  for (const key of arr) {
    if (key.includes(":")) {
      const [field, value] = key.split(":");
      parent[parentKey] = parent[parentKey]?.map?.((item: any) =>
        item[field] == value ? { ...item } : item
      );
      parent = reference;
      reference = parent[parentKey]?.find?.(
        (item: any) => item[field] == value
      );
    } else {
      const index = key ? parseInt(key) : NaN;
      if (isNaN(index)) {
        if (Array.isArray(reference[key])) {
          reference[key] = [...(reference[key] || {})];
        } else {
          reference[key] = { ...(reference[key] || {}) };
        }
        parent = reference;
        reference = reference[key];
      } else {
        if (Array.isArray(reference[index])) {
          reference[index] = [...(reference[index] || {})];
        } else {
          reference[index] = { ...(reference[index] || {}) };
        }
        parent = reference;
        reference = reference[index];
      }
    }
  }
  if (merge) {
    reference[last] = { ...(reference[last] || {}), ...value };
  } else {
    if (typeof value === "object" && !Array.isArray(value)) {
      reference[last] = { ...value };
    } else {
      reference[last] = value;
    }
  }
  return newValues;
};

export const convertJOIError = (
  joiError: ValidationError | any | undefined
): any => {
  if (!joiError) {
    return {};
  } else if (!joiError.details) {
    return joiError;
  } else if (!joiError.details.length) {
    return {};
  }
  const entries = joiError.details.map(
    (err: { path: string[]; message: any }) => [
      err.path.map(String).join("."),
      err.message,
    ]
  );
  return Object.fromEntries(entries);
};

export const useDataController = <T extends object>(
  options?: UseDataControllerParameters<T>
): UseDataControllerReturnValues<T> => {
  const { initialValues, validate, onSubmit, onChange, onSuccess, onFailed } =
    options || {};
  const [busy, setBusy] = useState<boolean>(false);
  const [values, _setValues] = useState<Partial<T>>({
    ...(initialValues || {}),
  });
  const [errors, _setErrors] = useState<any>({});
  const [checks, _setChecks] = useState<any>({});
  const [events, _setEvents] = useState<EventEmitter>(new EventEmitter());
  const dependency = JSON.stringify(initialValues);

  const log = (...params: any[]) => {
    if (options?.verbose) {
      console.log("[ui-kit]", ...params);
    }
  };

  const reset = (values?: Partial<T>) => {
    _setValues(values ? { ...values } : { ...(initialValues || {}) });
    _setChecks({});
    _setErrors({});
  };

  const validateAndSet = (values: any, force?: boolean) => {
    if (!validate) {
      return true;
    } else if (typeof validate === "function") {
      const result = validate(values);
      return setErrors(result, force);
    } else {
      const result = validate.validate(values, {
        abortEarly: false,
      });
      return setErrors(result.error, force);
    }
  };

  const updateInternalValues = (
    selector: string | undefined,
    newValues: any,
    triggerOnChange = true,
    onChangeEvent?: string
  ) => {
    const isValid = validateAndSet(newValues);
    _setValues(newValues);
    if (triggerOnChange) {
      log("onChange:", onChange, newValues, { isValid }, onChangeEvent);
      onChange?.(newValues, { isValid, selector });
      if (onChangeEvent) {
        events.emit(onChangeEvent, { selector, values: newValues, isValid });
      }
    }
  };

  const setErrors = (newErrors: any, force?: boolean) => {
    const _newErrors = convertJOIError(newErrors);
    const keys = Object.keys(_newErrors).filter(
      (o) => !["isValid", "validate"].includes(o)
    );
    const findings = keys.flatMap((name) =>
      getControlValidationErrors(_newErrors, name)
    );
    const isValid = findings.length === 0;
    _setChecks({ ..._newErrors, isValid });

    if (errors?.validate || force) {
      _setErrors({ ..._newErrors, isValid, validate: true });
      return isValid;
    }
    return false;
  };

  const setError = (key: string, option?: any) => {
    if (option) {
      if (typeof option === "string") {
        if (!errors[key]?.[option]) {
          setErrors({
            ...errors,
            [key]: { ...(errors[key] || {}), [option]: true },
          });
        }
      } else {
        setErrors({ ...errors, [key]: option || true });
      }
    } else {
      setErrors({ ...errors, [key]: true });
    }
  };

  const clearError = (key: string, option?: string) => {
    if (option) {
      if (errors[key]?.[option]) {
        setErrors({
          ...errors,
          [key]: { ...errors[key], [option]: undefined },
        });
      }
    } else {
      setErrors({ ...errors, [key]: undefined });
    }
  };

  const getValue = (selector?: string) => {
    if (!selector) return values;
    const { value } = selectProperty(values, selector);
    return value;
  };

  const setValue = (
    selector: string | undefined,
    value: any,
    options?: {
      merge?: boolean;
      triggerOnChange?: boolean;
      triggerEvent?: string;
    }
  ) => {
    log("setValue:", selector, value, options);
    if (!selector) {
      const newValues = { ...values, ...value };
      updateInternalValues(
        selector,
        newValues,
        options?.triggerOnChange !== false,
        options?.triggerEvent
      );
      return;
    }
    const newValues = duplicateForUpdate(
      values,
      selector,
      value,
      options?.merge
    );
    updateInternalValues(
      selector,
      newValues,
      options?.triggerOnChange !== false,
      options?.triggerEvent
    );
  };

  const changeHandler = ({ name, selector, value }: IAnyValueHandler) => {
    setValue(selector || name, value);
  };

  const submit = async () => {
    if (!validateAndSet(values, true)) {
      return false;
    }
    if (onSubmit) {
      log("onSubmit:", values);
      try {
        setBusy(true);
        const result = await onSubmit(values);
        if (
          result &&
          typeof result === "object" &&
          result.status !== undefined
        ) {
          if (result.status === 0) {
            onSuccess && (await onSuccess(result, values));
            reset();
            return true;
          } else {
            onFailed && (await onFailed(result, values));
            return false;
          }
        } else if (result !== false) {
          onSuccess && (await onSuccess(result, values));
          reset();
          return true;
        } else {
          onFailed && (await onFailed(result, values));
          return false;
        }
      } catch (err) {
        onFailed && (await onFailed(err, values));
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    reset();
  }, [dependency]);

  useEffect(() => {
    validateAndSet(values);
  }, []);

  return {
    busy,
    values,
    errors,
    checks,
    events,
    reset,
    getValue,
    setValue,
    setErrors,
    setError,
    clearError,
    changeHandler,
    submit,
  };
};
