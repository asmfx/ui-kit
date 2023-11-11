export const getControlValidationErrors = (
    errors: any,
    name?: string
): string[] => {
    const list: string[] = [];
    if (name && errors && errors[name]) {
        const controlErrors = errors[name];
        if (typeof controlErrors === "object") {
            list.push(
                ...Object.keys(controlErrors).filter((key) => !!controlErrors[key])
            );
        } else {
            return ["validation"];
        }
    }
    return list;
};
