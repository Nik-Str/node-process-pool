import { fork, ChildProcess } from 'child_process';
import { ChildMsg, IPromise, Fork } from './types';

export default class ProcessPool {
  private file: any;
  private poolMax: number;
  private pool: Fork[];
  private active: Fork[];
  private waiting: IPromise[];

  constructor(file: any, poolMax: number) {
    this.file = file;
    this.poolMax = poolMax;
    this.pool = [];
    this.active = [];
    this.waiting = [];
  }

  public async initWorkers() {
    const pool = [];
    for (let i = 0; i < this.poolMax; i++) {
      pool.push(this.start());
    }

    try {
      return await Promise.all(pool).then(() => console.log('Pool is active'));
    } catch (err: unknown) {
      console.error(err);
    }
  }

  private start() {
    return new Promise((resolve, reject) => {
      const worker = fork(this.file);

      worker.once('message', (msg: ChildMsg) => {
        if (msg.event === 'ready') {
          console.log(`Process is running: ${worker.pid}`);
          resolve(this.pool.push(worker));
        }
      });

      worker.once('error', (err) => {
        console.log(`Process ${worker.pid} error: ${err.message}`);
        worker.kill();
        reject(err);
      });
    });
  }

  public acquire() {
    return new Promise((resolve, reject) => {
      if (this.pool.length > 0) {
        const worker = this.pool.pop() as ChildProcess;
        console.log(`Process active: ${worker.pid}`);
        this.active.push(worker);
        return resolve(worker);
      }
      return this.waiting.push({ resolve, reject });
    });
  }

  public release(worker: ChildProcess) {
    if (this.waiting.length > 0) {
      const { resolve } = this.waiting.shift() as IPromise;
      return resolve(worker);
    }
    console.log(`Process released: ${worker.pid}`);
    this.reset(worker);
  }

  private reset(worker: Fork) {
    this.active = this.active.filter((w) => w !== worker);
    this.pool.push(worker);
  }
}
