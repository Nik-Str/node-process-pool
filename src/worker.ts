const childProcess = process as any;

childProcess.on('message', (msg: number) => {
  try {
    const data = msg + 4;
    childProcess.send({ event: 'end', data });
  } catch (err: unknown) {
    console.error(err);
    childProcess.send({ event: 'error', error: 'Unknow server error' });
  }
});

childProcess.send({ event: 'ready' });
