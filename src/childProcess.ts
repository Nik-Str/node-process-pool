// eslint-disable-next-line object-curly-newline
import { ParentMsg } from './types';

const childProcess = process as any;

childProcess.on('message', ({ test, startInterval, endInterval }: ParentMsg) => {
  try {
    let data: string | null = null;
    console.log(startInterval, endInterval);

    const makeEqual = (a: number, b: string) => {
      let value = '';
      const diff = a - b.length;
      for (let j = 0; j < diff; j++) {
        value += 0;
      }
      value += b;
      return value;
    };

    let j = 0;
    for (let i = startInterval; i <= endInterval; i++) {
      const asc = makeEqual(test.length, i.toString());

      const desc = makeEqual(test.length, (endInterval - j).toString());
      console.log(`${childProcess.pid}: ${asc}`);
      console.log(`${childProcess.pid}: ${desc}`);

      if (asc === test || desc === test) {
        console.log(`Childprocess ${childProcess.pid} found a match: ${i}`);
        data = asc === test ? asc : desc;
        break;
      }

      if (i + 1 === endInterval - j || i === endInterval - j) break;
      j++;
    }

    return childProcess.send({ event: 'end', data });
  } catch (err: unknown) {
    console.error(err);
    childProcess.send({ event: 'error', error: 'Unknow thread error' });
    childProcess.exit(0);
  }
});

childProcess.send({ event: 'ready' });
