import { ISMSBag, ISMSRequestOptions } from './@types';
import { API_BASE_URL, API_ENDPOINT } from './constants';

export const sendSMSAPIRequest = async (
  data: ISMSBag[],
  opts: ISMSRequestOptions
) => {
  const url = new URL(API_ENDPOINT, API_BASE_URL).toString();
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
