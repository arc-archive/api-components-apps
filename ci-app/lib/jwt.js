import jwt from 'jsonwebtoken';
import config from '../config';

export const scopes = [
  'all',
  'create-test',
  'delete-test',
  'create-message',
  'delete-message',
  'schedule-component-build'
];
const tokenIssuer = 'urn:arc-ci';

/**
 * Generates a new JWT.
 * @param {Object} user Session user object
 * @param {Object} createInfo Create options:
 * - scopes: {Array<String>} List of scopes, required.
 * - expiresIn: {String} Describes when the token expires, optional.
 * @return {String} Generated token.
 */
export function generateToken(user, createInfo) {
  const secret = config.get('SECRET');
  const data = {
    uid: user.id,
    scopes: createInfo.scopes
  };
  const opts = {
    issuer: tokenIssuer
  };
  if (createInfo.expiresIn) {
    opts.expiresIn = createInfo.expiresIn;
  }
  return jwt.sign(data, secret, opts);
}

export function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.get('SECRET'), function(err, decoded) {
      if (err) {
        let msg;
        switch (err.message) {
          case 'invalid audience':
            msg = 'Token audinece is invalid';
            break;
          case 'invalid issuer':
            msg = 'Token issuer (source) is invalid';
            break;
          case 'jwt expired':
            msg = `Token expored at ${err.expiredAt}`;
            break;
          case 'jwt signature is required':
          case 'invalid signature':
            msg = 'Singature is invalid';
            break;
          case 'jwt malformed':
            msg = 'Malformed token';
            break;
          case 'invalid jwt id':
          case 'invalid subject':
          case 'jwt signature is required':
            msg = 'Token is invalid';
            break;
          default:
            msg = 'Unknown token error';
        }
        reject(new Error(msg));
      } else if (!decoded) {
        reject(new Error('Token is invalid'));
      } else {
        resolve(decoded);
      }
    });
  });
}

export function verifyTokenSync(token) {
  return jwt.verify(token, config.get('SECRET'));
}

export function hasScope(token, required) {
  const scopes = token.scopes || [];
  return scopes.indexOf(required) !== -1;
}

export function isValidScope(scope) {
  return scopes.indexOf(scope) !== -1;
}

export function areScopesValid(userScopes) {
  const missing = userScopes.some((scope) => scopes.indexOf(scope) === -1);
  return !missing;
}

export function isTokenExpired(token) {
  const now = Date.now() / 1000;
  return token.expires <= now;
}
