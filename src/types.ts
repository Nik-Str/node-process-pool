import { ChildProcess } from 'child_process';

export type ChildMsg = { event: string; data?: any; error?: string };

export interface IPromise {
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}
export type Fork = ChildProcess | undefined;

export type ParentMsg = {
  test: string;
  startInterval: number;
  endInterval: number;
};
