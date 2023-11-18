const __getValue = (obj: any, path: string[]): any => {
  const key = path.shift();
  if (!obj || !key) {
    return obj;
  }
  return __getValue(obj[key], path);
};

export const getValue = (obj: any, path: string) =>
  __getValue(obj, path.split("."));

export const makeCUID = (length: number = 6): string => {
  var result = "";
  var characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const makeCode = (str: string, randomSuffixLength?: number): string => {
  const code = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
  if (randomSuffixLength) {
    return `${code}_${makeCUID(randomSuffixLength)}`;
  }
  return code;
};
