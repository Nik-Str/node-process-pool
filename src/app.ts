import { ChildProcess } from 'child_process';
import http, { IncomingMessage, ServerResponse } from 'http';
import { join } from 'path';
import { WritableStream } from 'stream/web';
import os from 'os';
import ProcessPool from './processPool';
import { ChildMsg, ParentMsg } from './types';

// npm run dev (port) (nr of processes)

// curl -X POST -H "Content-Type: application/json" \
//   -d "{"test": "10"}" \
//   http://localhost:8080/

const port = Number(process.argv[2]);
const poolMax = Number(process.argv[3] ? process.argv[3] : os.cpus().length / 2);
const workerFile = join(__dirname, 'childProcess.ts');
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

const initializer = async (test: string, res: ServerResponse) => {
  const start = Date.now();

  const nrOfDigits = test.length;
  if (nrOfDigits > 12) return invalidRequest(res);
  let lengthOfCombos = '';
  for (let i = 0; i < nrOfDigits; i++) {
    lengthOfCombos += '9';
  }
  const nrOfCombos = Number(lengthOfCombos);

  try {
    // Hämta workers i handler istället så att det går att queue uppdrag
    const workerPromises = [];
    for (let i = 1; i <= poolMax; i++) {
      workerPromises.push(pool.acquire());
    }
    const workers = (await Promise.all(workerPromises)) as ChildProcess[];

    const handlerPromises = [];
    const isDivisible = nrOfCombos % poolMax === 0;
    for (let i = 0; i < poolMax; i++) {
      let startInterval;
      let endInterval;

      if (!isDivisible) {
        startInterval = i === 0 ? 0 : ((nrOfCombos - 1) / poolMax) * i;
        endInterval = ((nrOfCombos - 1) / poolMax) * (i + 1);
        if (i + 1 === poolMax) endInterval++;
      } else {
        startInterval = i === 0 ? 0 : (nrOfCombos / poolMax) * i;
        endInterval = (nrOfCombos / poolMax) * (i + 1);
      }

      handlerPromises.push(
        handler(workers[i], {
          test,
          startInterval,
          endInterval,
        })
      );
    }
    // Skulle Promiserace fungera?
    const result = await Promise.all(handlerPromises).then((childRes) => childRes.filter((a) => a !== null)[0]);
    console.log(`Respond with result: ${result}`);
    res.end(JSON.stringify({ result, time: Date.now() - start }));
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
      console.log(test);
      if (typeof test !== 'string') return invalidRequest(res);
      console.log(`Request body contains ${test}`);
      initializer(test, res);
    });
  })
  .listen(port, () => console.log(`Server is listening on port: ${port}`));

// Testa hur lång tid det tar för en algo att hitta en matchning, så vi borde skicka tiden i svaret tillbaka, det är de som är intressant här
// Fundera hur vi kan avbryta övriga workers om en match hittas i en utav dem

// på en mmatch loopa igenom alla workers och skicak ett meddelande. I Worker ska vara meddelande innehåell en type variable som ska kontrolleras. om det är exit typ ska process göra exit.
// Bygg så varje process har en worker som jobbar motpools i loopen

// Gör så process kör exit på match
// Skicka exit kod 123 och gör om pool till extend eventemitter. emit event
// i handler lyssna på denna emit, och avsluta på den (promise.all kommer då resolva)
