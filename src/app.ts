import { ChildProcess } from 'child_process';
import http, { IncomingMessage, ServerResponse } from 'http';
import { join } from 'path';
import { WritableStream } from 'stream/web';
import ProcessPool from './processPool';
import { ChildMsg, ParentMsg } from './types';

// npm run dev (port) (nr of processes)

// curl -X POST -H "Content-Type: application/json" \
//   -d '{"test": 10}' \
//   http://localhost:8080/

const port = Number(process.argv[2]);
const poolMax = Number(process.argv[3]);
const workerFile = join(__dirname, 'worker.ts');
const pool = new ProcessPool(workerFile, poolMax);
pool.initWorkers();

const invalidRequest = (res: ServerResponse) => {
  res.statusCode = 400;
  return res.end();
};

// prettier-ignore
const handler = (worker: ChildProcess, parentMsg: ParentMsg) => new Promise((resolve, reject) => {
  const onMessage = (childMsg: ChildMsg) => {
    if (childMsg.event === 'end') {
      worker.removeListener('message', onMessage);
      resolve(childMsg.data);
      return pool.release(worker);
    }
    reject(childMsg.error);
  };
  worker.on('message', onMessage);
  worker.send(parentMsg);
});

const initializer = async (test: number, res: ServerResponse) => {
  const nrOfDigits = test.toString().length;
  if (nrOfDigits > 12) return invalidRequest(res);
  const nrOfCombos = 9 ** nrOfDigits; // Stämmer inte, lär beräknas annorlunda, om inte föredelningen bör ske på annat sätt [0, 0, 0]
  // Skriv om logiken för att föredela och beräkna de olika kombinationerna baserat på antal siffror som skickas in

  try {
    const workerPromises = [];
    for (let i = 1; i <= poolMax; i++) {
      workerPromises.push(pool.acquire());
    }
    const workers = (await Promise.all(workerPromises)) as ChildProcess[];

    const handlerPromises = [];
    for (let i = 1; i <= poolMax; i++) {
      const startInterval = i === 1 ? 0 : ((nrOfCombos - 1) / poolMax) * (i - 1); // Stämmer inte
      let endInterval = ((nrOfCombos - 1) / poolMax) * i; // Stämmer inte
      if (i === poolMax) endInterval++; // Stämmer inte
      handlerPromises.push(handler(workers[i - 1], { test, startInterval, endInterval }));
    }
    // Skulle Promiserace fungera?
    const result = await Promise.all(handlerPromises).then((childRes) => childRes.filter((a) => a !== null)[0]);
    console.log(`Respond with result: ${result}`);
    res.end(JSON.stringify({ result }));
  } catch (error: unknown) {
    res.end(JSON.stringify({ error }));
  }
};

http
  .createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') return invalidRequest(res);
    let body = '';

    req.on('data', (chunk: WritableStream) => {
      if (!body) console.log('Request recieved');
      if (body.length > 1e6 || req.headers['content-type'] !== 'application/json') return invalidRequest(res);
      body += chunk;
    });

    req.on('end', () => {
      const { test } = JSON.parse(body);
      console.log(`Request body contains ${test}`);
      initializer(test, res);
    });
  })
  .listen(port, () => console.log(`Server is listening on port: ${port}`));

// Testa hur lång tid det tar för en algo att hitta en matchning, så vi borde skicka tiden i svaret tillbaka, det är de som är intressant här
