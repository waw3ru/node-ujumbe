import type { ISMSBag, ISMSRequestOptions, ISMSResponse } from './@types';
import { useAsync, validateSMSBag } from './utils';

const sendSMSAPIRequest = async (data: ISMSBag[], opts: ISMSRequestOptions) => {
  const url = new URL('/api/messaging', 'http://ujumbesms.co.ke');
  const headers = new Headers({
    email: opts.email,
    'x-Authorization': opts.apiKey,
    'Content-Type': 'application/json',
  });
  const body = JSON.stringify({
    data: data.map(item => ({
      message_bag: {
        numbers: item.numbers.join(','),
        message: item.message,
        sender: item.sender,
      },
    })),
  });
  return fetch(url, {
    method: 'POST',
    headers,
    body,
  });
};

export const sendSMS = async (data: ISMSBag[], opts: ISMSRequestOptions) => {
  let processedData: ISMSBag[];
  let incorrectNumbers: string[];
  try {
    const [_processedData, _incorrectNumbers] = validateSMSBag(data);
    processedData = _processedData;
    incorrectNumbers = _incorrectNumbers;
  } catch (e: Error | unknown) {
    return [undefined, e];
  }

  if (processedData.length === 0) {
    return [
      undefined,
      new Error(
        'No valid phone numbers found in any SMS bag after validation.'
      ),
    ];
  }

  const [response, error] = await useAsync(() =>
    sendSMSAPIRequest(processedData, opts)
  );
  if (error) {
    return [undefined, error];
  }
  if (!response || !response?.ok) {
    switch (response?.status) {
      case 404:
        return [
          undefined,
          new Error(
            'API endpoint not found. Please check the URL and try again.'
          ),
        ];
      case 401:
        return [
          undefined,
          new Error('Unauthorized. Please check your API key and email.'),
        ];
      case 403:
        return [
          undefined,
          new Error(
            'Forbidden. You do not have permission to access this resource.'
          ),
        ];
      case 400:
        return [
          undefined,
          new Error(
            'Bad request. Please check the request payload and try again.'
          ),
        ];
      case 500:
        return [
          undefined,
          new Error('Internal server error. Please try again later.'),
        ];
      default:
        return [
          undefined,
          new Error('An unknown error occurred. Please try again later.'),
        ];
    }
  }
  const res = await useAsync<ISMSResponse>(
    () => response.json() as Promise<ISMSResponse>
  );

  return {
    invalidPhoneNumbers: incorrectNumbers,
    res,
  };
};
