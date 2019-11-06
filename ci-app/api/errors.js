export class AccessError extends Error {
  constructor(message, code) {
    message = message || 'Unauthorized';
    code = code || 401;
    super(message);
    this.code = code;
  }
}

export class ClientError extends Error {
  constructor(message, code) {
    message = message || 'Invalid request';
    code = code || 400;
    super(message);
    this.code = code;
  }
}
