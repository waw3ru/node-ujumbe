export const isNil = (e: unknown) => e === null || e === undefined;

export const isEmpty = (e: unknown) =>
  e === null || e === undefined || (typeof e === 'string' && e.length === 0);

export const objectHasItems = (e: unknown) =>
  e !== null &&
  e !== undefined &&
  typeof e === 'object' &&
  Object.keys(e as Record<string, unknown>).length > 0;
