import { ChildProcess } from 'child_process';
import http, { IncomingMessage, ServerResponse } from 'http';
import { join } from 'path';
import { WritableStream } from 'stream/web';
import ProcessPool from './processPool';
import { ChildMsg } from './types';

// npm run dev (port) (nr of processes)

// curl -X POST -H "Content-Type: application/json" \
//   -d '{"name": "linuxize", "email": "linuxize@example.com"}' \
//   http://localhost:8080/

const port = process.argv[2];
const workerFile = join(__dirname, 'worker.ts');
const pool = new ProcessPool(workerFile, Number(process.argv[3]));
pool.initWorkers();

const invalidRequest = (res: ServerResponse) => {
  res.statusCode = 400;
  return res.end();
};

// prettier-ignore
const handler = (worker: ChildProcess, data: number) => new Promise((resolve, reject) => {
  const onMessage = (msg: ChildMsg) => {
    if (msg.event === 'end') {
      worker.removeListener('message', onMessage);
      pool.release(worker);
      resolve(msg.data);
    }
    reject(msg.error);
  };
  worker.on('message', onMessage);
  worker.send(data);
});

http
  .createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') return invalidRequest(res);
    let body = '';

    req.on('data', (chunk: WritableStream) => {
      if (!body) console.log('Request recieved');
      if (body.length > 1e6 || req.headers['content-type'] !== 'application/json') return invalidRequest(res);
      body += chunk;
    });

    req.on('end', async () => {
      const { data } = JSON.parse(body);
      console.log(`Request body contains ${data}`);
      const worker = (await pool.acquire()) as ChildProcess;
      try {
        const result = await handler(worker, data);
        console.log(`Respond with result: ${result}`);
        res.end(JSON.stringify({ result }));
      } catch (error: unknown) {
        res.end(JSON.stringify({ error }));
      }
    });
  })
  .listen(port, () => console.log(`Server is listening on port: ${port}`));
