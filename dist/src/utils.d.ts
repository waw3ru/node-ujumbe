import { ISMSBag } from './@types';
export declare const isNil: (e: unknown) => e is null | undefined;
export declare const isEmpty: (e: unknown) => boolean;
export declare const objectHasItems: (e: unknown) => boolean;
export declare const useAsync: <T = unknown>(input: Promise<T> | (() => Promise<T>)) => Promise<[T, undefined] | [undefined, unknown]>;
export declare const useAsyncWithRetry: <T = unknown>(input: () => Promise<T>, retries?: number) => Promise<[T, undefined] | [undefined, unknown]>;
export declare const validateSMSBag: (data: ISMSBag[]) => [ISMSBag[], string[]];
