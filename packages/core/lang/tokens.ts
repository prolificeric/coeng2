export type TokenType =
  | 'ATOM'
  | 'BRANCH_SEPARATOR'
  | 'PART_SEPARATOR'
  | 'L_PAREN'
  | 'R_PAREN'
  | 'L_CURLY'
  | 'R_CURLY'
  | 'L_SQUARE'
  | 'R_SQUARE'
  | 'HEAD_REF'
  | 'PREV_SEQ_REF'
  | 'SORTED_SET_INIT';

export type Token = {
  type: TokenType;
  value: string;
  loc: CursorRange;
};

export type CursorRange = {
  start: Cursor;
  end: Cursor;
};

export type Cursor = {
  offset: number;
  line: number;
  column: number;
};

export type TokenParser = {
  type: TokenType;
  parse: (input: string) => string | null;
};

export const RegExpParser = (
  regexp: RegExp,
  mod?: (match: string[]) => string,
): TokenParser['parse'] => {
  return (input: string) => {
    const match = regexp.exec(input) ?? null;
    return match ? (mod ? mod(match) : match[0]) : null;
  };
};

export const tokenParsers: TokenParser[] = [
  {
    type: 'BRANCH_SEPARATOR',
    parse: RegExpParser(/^[,\n][, \t\n]*/),
  },
  {
    type: 'PART_SEPARATOR',
    parse: RegExpParser(/^[\t ]*/),
  },
  {
    type: 'L_PAREN',
    parse: RegExpParser(/^\([\n\t, ]*/),
  },
  {
    type: 'R_PAREN',
    parse: RegExpParser(/^[\n\t, ]*\)/),
  },
  {
    type: 'L_CURLY',
    parse: RegExpParser(/^\{[\n\t, ]*/),
  },
  {
    type: 'R_CURLY',
    parse: RegExpParser(/^[\n\t, ]*\}/),
  },
  {
    type: 'L_SQUARE',
    parse: RegExpParser(/^\[[\n\t, ]*/),
  },
  {
    type: 'R_SQUARE',
    parse: RegExpParser(/^[\n\t, ]*\]/),
  },
  {
    // [: z b a c] -> [:a b c z]
    type: 'SORTED_SET_INIT',
    parse: RegExpParser(/^:/),
  },
  {
    // john { knows mary (knows &) } -> john knows mary, mary knows john
    type: 'HEAD_REF',
    parse: RegExpParser(/^&/),
  },
  {
    // john knows {max, mary ([...] since 2000)} -> john knows max, [john knows mary] since 2000
    type: 'PREV_SEQ_REF',
    parse: RegExpParser(/^\.{3}(?!\.)/),
  },
  {
    // x..y
    type: 'PREV_SEQ_REF',
    parse: RegExpParser(/^[0-9]+\.{2}[0-9]+/),
  },
  {
    // ..y
    type: 'PREV_SEQ_REF',
    parse: RegExpParser(/^[0-9]+\.{2}(?!\.)/),
  },
  {
    // x..
    type: 'PREV_SEQ_REF',
    parse: RegExpParser(/^\.{2}[0-9]+/),
  },
  {
    // <<arbitrary string goes here>>
    type: 'ATOM',
    parse: RegExpParser(/^<<(.|\n)*?>>/),
  },
  {
    type: 'ATOM',
    parse: RegExpParser(/^[^ ,\n\(\)\{\}\[\]]+/),
  },
];

const CURSOR_INIT: Cursor = {
  offset: 0,
  line: 1,
  column: 1,
};

export function tokenize(source: string): Token[];

export function tokenize(source: AsyncIterable<string>): Promise<Token[]>;

export function tokenize(
  source: string | AsyncIterable<string>,
): Token[] | Promise<Token[]> {
  return typeof source === 'string'
    ? Array.from(generateTokens(source))
    : Array.fromAsync(generateTokens(source));
}

export function generateTokens(source: string): Iterable<Token>;

export function generateTokens(
  source: AsyncIterable<string>,
): AsyncIterable<Token>;

export function* generateTokens(
  source: string | AsyncIterable<string>,
): Iterable<Token> | AsyncIterable<Token> {
  // Sync handling
  if (typeof source === 'string') {
    // Test for useless source
    if (/^[\n\t ,\[\]\{\}\(\)]*$/.test(source)) {
      return;
    }

    const state = {
      remainingSource: source,
      cursor: CURSOR_INIT,
    };

    while (state.remainingSource) {
      for (const { type, parse } of tokenParsers) {
        const value = parse(state.remainingSource);

        if (!value) {
          continue;
        }

        const lines = value.split('\n');

        const token: Token = {
          type,
          value,
          loc: {
            start: state.cursor,
            end: {
              offset: state.cursor.offset + value.length,
              line: state.cursor.line + lines.length - 1,
              column: state.cursor.column + lines.at(-1)!.length,
            },
          },
        };

        state.remainingSource = state.remainingSource.slice(value.length);
        state.cursor = token.loc.end;

        yield token;

        break;
      }
    }

    return;
  }

  // Async handling
  async function* handleAsync() {
    const state = {
      lastToken: null as Token | null,
    };

    for await (const chunk of source) {
      const prependedChunk = (state.lastToken?.value || '') + chunk;

      for (const token of generateTokens(prependedChunk)) {
        const isLastToken = token.loc.end.offset === chunk.length;

        // Adjust token location
        if (state.lastToken) {
          token.loc.start.offset += state.lastToken.loc.end.offset;
          token.loc.start.line += state.lastToken.loc.start.line;
          token.loc.start.column += state.lastToken.loc.start.column;
          token.loc.end.offset += state.lastToken.loc.end.offset;
          token.loc.end.line += state.lastToken.loc.start.line;
          token.loc.end.column += state.lastToken.loc.start.column;
        }

        if (!isLastToken) {
          yield token;
        } else {
          state.lastToken = token;
        }
      }
    }

    if (state.lastToken) {
      yield state.lastToken;
    }
  }

  return handleAsync();
}
