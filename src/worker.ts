import { ParentMsg } from './types';

const childProcess = process as any;

childProcess.on('message', ({ test, startInterval, endInterval }: ParentMsg) => {
  try {
    let data = null;

    console.log(startInterval, endInterval);

    for (let i = startInterval; i <= endInterval; i++) {
      console.log(i);

      let match = '';
      const diff = test.length - i.toString().length;
      for (let j = 0; j < diff; j++) {
        match += 0;
      }
      match += i;

      if (match === test) {
        console.log(`Childprocess ${childProcess.pid} found a match: ${i}`);
        data = match;
        break;
      }
    }

    return childProcess.send({ event: 'end', data });
  } catch (err: unknown) {
    console.error(err);
    childProcess.send({ event: 'error', error: 'Unknow server error' });
    childProcess.exit(0);
  }
});

childProcess.send({ event: 'ready' });
