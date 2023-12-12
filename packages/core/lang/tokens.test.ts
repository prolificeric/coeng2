import { describe, test, expect } from 'bun:test';
import { RegExpParser, tokenize } from './tokens';

describe('parse', () => {
  describe('RegExpParser', () => {
    test('should return null if no match', () => {
      const parser = RegExpParser(/^foo/);
      expect(parser('bar')).toBeNull();
    });

    test('should return the matched string', () => {
      const parser = RegExpParser(/^foo/);
      expect(parser('foobar')).toBe('foo');
    });
  });

  describe('tokenize', () => {
    test('should return an empty array if the input is empty', () => {
      expect(tokenize('')).toEqual([]);
    });

    test('should return an empty array if the input is whitespace', () => {
      expect(tokenize(' ')).toEqual([]);
      expect(tokenize('\n')).toEqual([]);
      expect(tokenize('\t')).toEqual([]);
      expect(tokenize('\n\n')).toEqual([]);
      expect(tokenize('\n\n\n\n\n\n\n\n')).toEqual([]);
    });

    test('works on complex input', () => {
      const tokens = tokenize(`
        eric-weber {
          knows {
            typescript
            javascript
            [... excel (spreadsheet-app)] since 1999
          } (programming-language)
    
          named     <<Eric Weber>>
    
          described-as <<a person
          
          
          who writes code>>

          john knows &
        }
    
        [eric knows javascript] since 1999

        [: Hi I'm a sorted set!]
      `);

      expect(tokens).toMatchSnapshot();
    });
  });
});
