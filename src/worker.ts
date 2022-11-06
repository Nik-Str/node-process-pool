import { ParentMsg } from './types';

const childProcess = process as any;

childProcess.on('message', ({ test, startInterval, endInterval }: ParentMsg) => {
  try {
    // Create write stream and then loop over all possible number combinations and write to document
    // Create worker_thread and split number of cobination between child-process and its thread (2 loops -- ++), use document
    // Test all combination thorwards "something"
    // return right combination'
    let data = null;
    for (let i = startInterval; i < endInterval; i++) {
      if (i === test) {
        console.log(`Childprocess ${childProcess.pid} found a match: ${i}`);
        data = i;
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
