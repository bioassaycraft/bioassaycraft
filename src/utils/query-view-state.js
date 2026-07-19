export const readQueryViewState = (value, allowedValues, defaultValue) => {
  if (value === undefined) return { value: defaultValue, isInvalid: false };

  if (typeof value === "string" && allowedValues.includes(value)) {
    return { value, isInvalid: false };
  }

  return { value: defaultValue, isInvalid: true };
};
