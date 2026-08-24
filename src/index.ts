import type { ISMSBag, ISMSRequestOptions, ISMSResponse } from './@types';
import { sendSMSAPIRequest } from './api-request';
import { useAsync } from './hooks';
import { validateSMSBag } from './validate';

export const sendSMS = async (
  data: ISMSBag[],
  opts: ISMSRequestOptions
): Promise<
  [
    ISMSResponse | undefined,
    Error | { error: Error | unknown; incorrectNumbers: string[] } | any,
  ]
> => {
  let processedData: ISMSBag[], uniqueIncorrectNumbers: string[];

  try {
    [processedData, uniqueIncorrectNumbers] = validateSMSBag(data);
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

  const [payload, payloadError] = await useAsync<ISMSResponse>(
    () => response.json() as Promise<ISMSResponse>
  );

  if (payloadError) {
    return [
      undefined,
      { error: payloadError, incorrectNumbers: uniqueIncorrectNumbers },
    ];
  }

  return [
    payload,
    { error: undefined, incorrectNumbers: uniqueIncorrectNumbers },
  ];
};
