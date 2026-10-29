import {
  formatIncompletePhoneNumber,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';

import { ISMSBag } from './@types';

export const validateSMSBag = (data: ISMSBag[]): [ISMSBag[], string[]] => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array of SMS bags.');
  }

  const allIncorrectNumbers: string[] = [];
  const processedData: ISMSBag[] = [];

  for (const item of data) {
    if (
      !item ||
      !Array.isArray(item.numbers) ||
      item.numbers.length === 0 ||
      typeof item.message !== 'string' ||
      item.message.trim() === '' ||
      typeof item.sender !== 'string' ||
      item.sender.trim() === ''
    ) {
      throw new Error(
        'Each SMS bag must have a non-empty numbers array, a non-empty message string, and a non-empty sender string.'
      );
    }

    const correctNumbersForBag: string[] = [];
    const incorrectNumbersForBag: string[] = [];

    for (const num of item.numbers) {
      const formattedNum = formatIncompletePhoneNumber(num);
      const parsedNumber = parsePhoneNumberFromString(formattedNum);
      const normalizedNum = parsedNumber?.isValid()
        ? parsedNumber.format('E.164')
        : formattedNum.startsWith('+')
          ? formattedNum
          : `+${formattedNum}`;

      if (isValidPhoneNumber(normalizedNum)) {
        correctNumbersForBag.push(normalizedNum);
      } else {
        incorrectNumbersForBag.push(num);
      }
    }

    if (correctNumbersForBag.length > 0) {
      processedData.push({
        ...item,
        numbers: correctNumbersForBag,
      });
    }
    allIncorrectNumbers.push(...incorrectNumbersForBag);
  }

  const uniqueIncorrectNumbers = Array.from(new Set(allIncorrectNumbers));
  return [processedData, uniqueIncorrectNumbers];
};
