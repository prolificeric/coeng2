export const cached = <T>(getter: () => T) => {
  let value: T;
  let cached = false;

  return function (): T {
    if (!cached) {
      value = getter();
      cached = true;
    }

    return value;
  };
};
