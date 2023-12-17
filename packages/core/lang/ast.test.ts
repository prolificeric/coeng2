import { describe, test, expect } from 'bun:test';
import { AstNode } from './ast';
import { tokenize } from './tokens';

describe('AstNode', () => {
  describe('fromTokens', () => {
    test('should return a root node with correct hierarchy', () => {
      const tokens = tokenize(`
        eric (person) {
          knows {
            typescript
            javascript ([...] since 1999)
          } (programming-language)
        }
      `);

      const ast = AstNode.fromTokens(tokens);

      console.dir(ast, { depth: null });
    });
  });
});
