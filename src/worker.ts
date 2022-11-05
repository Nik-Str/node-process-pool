const childProcess = process as any;

childProcess.on('message', (msg: number) => {
  try {
    // Create write stream and then loop over all possible number combinations and write to document
    // Create worker_thread and split number of cobination between child-process and its thread (2 loops -- ++), use document
    // Test all combination thorwards "something"
    // return right combination'
    const data = msg + 4;
    childProcess.send({ event: 'end', data });
  } catch (err: unknown) {
    console.error(err);
    childProcess.send({ event: 'error', error: 'Unknow server error' });
    childProcess.exit(0);
  }
});

childProcess.send({ event: 'ready' });
