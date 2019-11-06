export class AccessError extends Error {
  constructor(message, code) {
    message = message || 'Unauthorized';
    code = code || 401;
    super(message);
    this.code = code;
  }
}
