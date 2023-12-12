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
  | 'PREV_REF'
  | 'SORTED_SET_INIT';

export type Token = {
  type: TokenType;
  value: string;
  loc: {
    start: Cursor;
    end: Cursor;
  };
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

export const RegExpParser = (regexp: RegExp): TokenParser['parse'] => {
  return (input: string) => {
    return regexp.exec(input)?.[0] ?? null;
  };
};

export const defaultTokenParsers: TokenParser[] = [
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
    type: 'SORTED_SET_INIT',
    parse: RegExpParser(/^:/),
  },
  {
    type: 'HEAD_REF',
    parse: RegExpParser(/^&/),
  },
  {
    type: 'PREV_REF',
    parse: RegExpParser(/^\.{3}[^.]/),
  },
  {
    type: 'ATOM',
    parse: RegExpParser(/^<<(.|\n)*?>>/),
  },
  {
    type: 'ATOM',
    parse: RegExpParser(/^[^ ,\n\(\)\{\}\[\]]+/),
  },
];

export const tokenize = (
  input: string,
  tokenParsers: TokenParser[] = defaultTokenParsers,
): Token[] => {
  const trimmedLeft = input.trimStart();

  const trimmedRight = trimmedLeft.trimEnd();

  if (!trimmedRight) {
    return [];
  }

  const trimmedLines = input.slice(0, trimmedLeft.length).split('\n');

  let start: Cursor = {
    offset: input.length - trimmedLeft.length,
    line: trimmedLines.length,
    column: trimmedLines.at(-1)!.length + 1,
  };

  const tokens: Token[] = [];

  input = trimmedRight;

  inputLoop: while (input) {
    tokenParserLoop: for (const { type, parse } of tokenParsers) {
      const value = parse(input);

      if (!value) {
        continue tokenParserLoop;
      }

      const lines = value.split('\n');

      const end: Cursor = {
        offset: start.offset + value.length,
        line: start.line + lines.length,
        column:
          lines.length > 1
            ? lines[lines.length - 1].length + 1
            : start.column + value.length,
      };

      const token: Token = {
        type,
        value,
        loc: { start, end },
      };

      tokens.push(token);

      input = input.slice(value.length);
      start = end;

      continue inputLoop;
    }

    throw new Error(
      `Unexpected token at line ${start.line}, column ${
        start.column
      }: ${JSON.stringify(input.slice(0, 10))}`,
    );
  }

  return tokens;
};
