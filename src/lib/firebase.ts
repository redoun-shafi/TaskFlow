// Firebase has been completely removed in favor of 100% Free, Private In-Browser Database (storageDb).
// No Firebase configuration, no Google Cloud billing, no credit card required!

export const db = null as any;
export const auth = null as any;
export const storage = null as any;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: any, _op: any, _path: any) {
  throw error;
}
