import { CustomError } from '../errors';
import { Token } from './tokens';

export class UnexpectedTokenError extends CustomError.define<Token>(
  token =>
    `Unexpected token: ${token.type} at ${token.loc.start.line}:${token.loc.start.column}`,
) {}
