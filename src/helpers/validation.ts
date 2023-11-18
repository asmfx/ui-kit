export const RegexValidation = {
  email: (value?: string) =>
    value && /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value),
  containsUpper: (value?: string) => value && /[A-Z]+/.test(value),
  containsLower: (value?: string) => value && /[a-z]+/.test(value),
  containsNumeric: (value?: string) => value && /[0-9]+/.test(value),
};
