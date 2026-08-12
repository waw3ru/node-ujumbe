import type { ISMSBag, ISMSRequestOptions, ISMSResponse } from "./@types";
export declare const sendSMS: (data: ISMSBag[], opts: ISMSRequestOptions) => Promise<[ISMSResponse | undefined, Error | unknown]>;
