import { useEffect, useState } from "react";
import { getControlValidationErrors } from "../helpers";
import {
  UseDataControllerParameters,
  UseDataControllerReturnValues,
  IAnyValueHandler,
} from "../types";
import { ValidationError, ref } from "joi";
import { EventEmitter } from "./EventEmitter";

const selectProperty = (
  values: any,
  selector: string,
  createIfNotExists?: boolean
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
    let parentRef = reference;
    if (key.includes(":")) {
      const [field, value] = key.split(":");
      reference = reference?.find?.((item: any) => item[field] == value);
    } else {
      const index = key ? parseInt(key) : NaN;
      if (isNaN(index)) {
        if (createIfNotExists && reference?.[key] === undefined) {
          parentRef[key] = {};
        }
        reference = reference?.[key];
      } else {
        if (
          createIfNotExists &&
          index === 0 &&
          reference?.[index] === undefined
        ) {
          parentRef.push({});
        }
        reference = reference?.[index];
      }
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
  const [version, _setVersion] = useState(0);
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
    _setVersion(version + 1);
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

  const updateInternalValues = async (
    selector: string | undefined,
    newValues: any,
    triggerOnChange = true,
    onChangeEvent?: string
  ) => {
    const isValid = validateAndSet(newValues);
    _setValues(newValues);
    _setVersion(version + 1);

    if (triggerOnChange) {
      log("onChange:", { onChange, newValues, options: { isValid, selector } });
      onChange?.(newValues, { isValid, selector });
    }
    if (onChangeEvent) {
      log("onChangeEvent:", {
        onChangeEvent,
        args: {
          selector,
          values: newValues,
          isValid,
        },
      });
      await events.emit(onChangeEvent, {
        selector,
        values: newValues,
        isValid,
      });
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

  const deleteValue = async (
    selector: string,
    options?: {
      triggerOnChange?: boolean;
      triggerEvent?: string;
    }
  ) => {
    log("deleteValue:", { selector, options });
    const arrSelector = selector.split(".");
    const intKey = parseInt(arrSelector.pop() || "N/A");
    const clone = structuredClone(values);

    if (isNaN(intKey)) {
      const { reference, key } = selectProperty(clone, selector);
      delete reference[key];
    } else {
      selector = arrSelector.join(".");
      const { reference, key } = selectProperty(clone, selector);
      reference[key].splice(intKey, 1);
    }
    updateInternalValues(
      selector,
      clone,
      options?.triggerOnChange !== false,
      options?.triggerEvent
    );
  };

  const move = async (
    from: string,
    to: string,
    options?: {
      triggerOnChange?: boolean;
      triggerEvent?: string;
    }
  ) => {
    const clone = structuredClone(values);
    const fromArr = from.split(".");
    const toArr = to.split(".");
    const fromIndex = parseInt(fromArr.pop() || "N/A");
    const toIndex = parseInt(toArr.pop() || "N/A");
    const fromParent = fromArr.join(".") as string;
    const toParent = toArr.join(".") as string;
    const { value: item } = selectProperty(clone, from);

    if (
      from === to || // if same key
      to.startsWith(from) // inner move
    ) {
      log("move", "cancel");
      return;
    }
    log("move", { from, to, fromParent, toParent, fromIndex, toIndex, item });

    if (!isNaN(fromIndex) && !isNaN(toIndex)) {
      const { reference: fromRef, key: fromKey } = selectProperty(
        clone,
        fromParent
      );
      const {
        reference: toRef,
        key: toKey,
        value: toValue,
      } = selectProperty(clone, toParent, true);

      if (toRef[toKey] === undefined && toIndex === 0) {
        toRef[toKey] = [];
      }
      // Array move
      log("move", "array_move");
      if (fromParent === toParent && fromIndex > toIndex) {
        // action: arr_delete
        fromRef[fromKey].splice(fromIndex, 1);
        // action: arr_inject

        toRef[toKey].splice(toIndex, 0, item);
      } else {
        // action:arr_inject
        toRef[toKey].splice(toIndex, 0, item);
        // action:arr_delete
        fromRef[fromKey].splice(fromIndex, 1);
      }
    } else {
      log("move", "non_array_move");

      if (!isNaN(toIndex)) {
        // action:arr_inject
        const { reference: toRef, key: toKey } = selectProperty(
          clone,
          toParent
        );
        toRef[toKey].splice(toIndex, 0, item);
      } else {
        // action:inject
        const { reference: toRef, key: toKey } = selectProperty(clone, to);
        toRef[toKey] = item;
      }
      if (!isNaN(fromIndex)) {
        // action:arr_delete
        const { reference: fromRef, key: fromKey } = selectProperty(
          clone,
          fromParent
        );
        fromRef[fromKey].splice(fromIndex, 1);
      } else {
        // action:delete
        const { reference: fromRef, key: fromKey } = selectProperty(
          clone,
          from
        );
        delete fromRef[fromKey];
      }
    }

    return updateInternalValues(
      to,
      clone,
      options?.triggerOnChange !== false,
      options?.triggerEvent
    );
  };

  const setValue = async (
    selector: string | undefined,
    value: any,
    options?: {
      merge?: boolean;
      triggerOnChange?: boolean;
      triggerEvent?: string;
    }
  ) => {
    log("setValue:", { selector, value, options });
    if (!selector) {
      const newValues = !!options?.merge
        ? { ...(values || {}), ...value }
        : value;
      return updateInternalValues(
        selector,
        newValues,
        options?.triggerOnChange !== false,
        options?.triggerEvent
      );
    }
    const newValues = duplicateForUpdate(
      values,
      selector,
      value,
      options?.merge
    );
    return updateInternalValues(
      selector,
      newValues,
      options?.triggerOnChange !== false,
      options?.triggerEvent
    );
  };

  const injectToArray = async (
    selector: string,
    value: any,
    options?: {
      merge?: boolean;
      triggerOnChange?: boolean;
      triggerEvent?: string;
    }
  ) => {
    log("injectToArray:", { selector, value, options });
    const arrSelector = selector.split(".");
    const intKey = parseInt(arrSelector.pop() || "N/A");
    if (isNaN(intKey)) {
      return;
    }
    selector = arrSelector.join(".");

    const newValues = structuredClone(values);
    const { reference, key } = selectProperty(newValues, selector);
    reference[key].splice(intKey, 0, value);
    return updateInternalValues(
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
            setBusy(false);
            return true;
          } else {
            onFailed && (await onFailed(result, values));
            setBusy(false);
            return false;
          }
        } else if (result !== false) {
          onSuccess && (await onSuccess(result, values));
          reset();
          setBusy(false);
          return true;
        } else {
          onFailed && (await onFailed(result, values));
          setBusy(false);
          return false;
        }
      } catch (err) {
        onFailed && (await onFailed(err, values));
        setBusy(false);
        return false;
      }
    }
    setBusy(false);
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
    version,
    reset,
    getValue,
    setValue,
    injectToArray,
    move,
    deleteValue,
    setErrors,
    setError,
    clearError,
    changeHandler,
    submit,
  };
};
