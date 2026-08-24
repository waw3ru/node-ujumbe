export interface ISMSBag {
  numbers: string[];
  message: string;
  sender: Uppercase<string> | string;
}
export interface ISMSResponseStatus {
  code: string;
  type: string;
  description: string;
}
export interface ISMSResponseDatetime {
  date: string;
  timezone_type: number;
  timezone: `${string}/${string}` | string;
}
export interface ISMSResponseMetadata {
  recipients: number;
  credits_deducted: number;
  available_credits: string;
  user: string;
  date_time: ISMSResponseDatetime;
}
export interface ISMSResponse {
  status: ISMSResponseStatus;
  meta: ISMSResponseMetadata;
}
export interface ISMSRequestOptions {
  email: string;
  apiKey: string;
}
