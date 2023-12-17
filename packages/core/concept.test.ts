import { describe, test, expect } from 'bun:test';
import { Concept } from './concept';

describe('Concept', () => {
  describe('parseAll', () => {
    test('should parse a single atom', () => {
      const concepts = Concept.parseAll('foo');
      expect(concepts).toMatchObject([{ key: 'foo' }]);
    });
  });
});
