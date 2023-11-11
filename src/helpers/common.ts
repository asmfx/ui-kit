const __getValue = (obj: any, path: string[]): any => {
    const key = path.shift();
    if (!obj || !key) {
        return obj;
    }
    return __getValue(obj[key], path);
};

export const getValue = (obj: any, path: string) => __getValue(obj, path.split("."));
