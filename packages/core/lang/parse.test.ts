import { describe, test, expect } from 'bun:test';
import { parseConcepts } from './parse';
import { Concept } from '../concept';

describe('parseConcepts', () => {
  test('parses atoms', () => {
    const concepts = parseConcepts('foo');
    expect(concepts).toMatchObject([new Concept('foo')]);
  });

  test('parses compounds', () => {
    const concepts = parseConcepts('foo bar');
    expect(concepts).toMatchObject([
      Concept.fromParts([new Concept('foo'), new Concept('bar')]),
    ]);
  });

  test('parses branches', () => {
    const concepts = parseConcepts('foo, bar');
    expect(concepts).toMatchObject([
      Concept.fromParts([new Concept('foo')]),
      Concept.fromParts([new Concept('bar')]),
    ]);
  });

  test('parses parenthetical branches', () => {
    const concepts = parseConcepts('foo (bar, baz)');

    expect(concepts).toMatchObject([
      Concept.fromParts([new Concept('foo'), new Concept('bar')]),
      Concept.fromParts([new Concept('foo'), new Concept('baz')]),
      new Concept('foo'),
    ]);
  });

  test('parses inline branches', () => {
    const concepts = parseConcepts('foo {bar, baz}');

    expect(concepts).toMatchObject([
      Concept.fromParts([new Concept('foo'), new Concept('bar')]),
      Concept.fromParts([new Concept('foo'), new Concept('baz')]),
    ]);
  });

  test('parses nested branches', () => {
    const concepts = parseConcepts('foo [bar {baz, qux}]');

    expect(concepts).toMatchObject([
      Concept.fromParts([
        new Concept('foo'),
        Concept.fromParts([new Concept('bar'), new Concept('baz')]),
      ]),
      Concept.fromParts([
        new Concept('foo'),
        Concept.fromParts([new Concept('bar'), new Concept('qux')]),
      ]),
    ]);
  });

  test('parses complex sources', () => {
    const source = `
      eric {
        knows {
          javascript
          typescript
        } (programming-language)
        (
          hello world
          foo bar biz baz
        )
        [a b] c {(1) d, e}
      }
    `;

    const concepts = parseConcepts(source);

    console.log(concepts.map(c => c.serialize()));
  });
});
