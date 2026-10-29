import { ISMSBag, ISMSRequestOptions } from './@types';
export declare const sendSMSAPIRequest: (
  data: ISMSBag[],
  opts: ISMSRequestOptions
) => Promise<Response>;
