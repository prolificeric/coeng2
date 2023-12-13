import { describe, test, expect } from 'bun:test';
import { AstNode } from './ast';
import { tokenize } from './tokens';

describe('AstNode', () => {
  describe('requirePrev', () => {
    test('should return the previous node', () => {
      const prev = new AstNode({ type: 'BRANCH_LIST' });
      const next = new AstNode({ type: 'ATOM' });
      next.prev = prev;
      prev.next = next;
      expect(next.requirePrev('BRANCH_LIST')).toBe(prev);
    });
  });

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

      const ast = AstNode.fromTokens(tokens, node => {
        // console.log(node.type, node.token?.value);
      });

      let node: any = ast;

      do {
        console.log(node.type, node.token?.value);
      } while ((node = node.next));
    });
  });
});
