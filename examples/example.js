/**
 * @author: waw3ru <waweruj00@gmail.com>
 * @description: Example usage of UjumbeSMS
 */

import { sendSMS } from 'ujumbesms';

const [data, err] = await sendSMS([
  {
    message: 'Hello, this is a test message from UjumbeSMS!',
    to: '+1234567890',
    from: 'UjumbeSMS',
  },
]);

console.log(data, err);
