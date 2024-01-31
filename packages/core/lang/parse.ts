import { Concept } from '../concept';
import { Token } from './tokens';

export class ConceptParser {
  parse(source: string): Concept[] {
    return [];
  }

  async parseAsync(source: string): Promise<Concept[]> {
    return [];
  }

  *parseEach(source: string): Iterable<Concept> {
    return [];
  }

  async *parseEachAsync(source: string): AsyncIterable<Concept> {}
}

export class ParseContext {
  parent: ParseContext | null = null;
  permutations: Concept[][] = [];

  consumeToken(token: Token) {
    switch (token.type) {
      case 'ATOM':
        return this.consumeAtom(token);
      case 'BRANCH_SEPARATOR':
        return this.consumeBranchSeparator(token);
      case 'PART_SEPARATOR':
        return this.consumePartSeparator(token);
      case 'L_PAREN':
        return this.consumeLeftParen(token);
      case 'R_PAREN':
        return this.consumeRightParen(token);
      case 'L_CURLY':
        return this.consumeLeftCurly(token);
      case 'R_CURLY':
        return this.consumeRightCurly(token);
      case 'L_SQUARE':
        return this.consumeLeftSquare(token);
      case 'R_SQUARE':
        return this.consumeRightSquare(token);
      case 'HEAD_REF':
        return this.consumeHeadRef(token);
      case 'PREV_SEQ_REF':
        return this.consumePrevSeqRef(token);
      case 'SORTED_SET_INIT':
        return this.consumeSortedSetInit(token);
    }
  }

  consumeAtom(token: Token) {
    const concept = new Concept(token.value);

    if (this.permutations.length === 0) {
      this.permutations = [[concept]];
    }

    this.permutations = this.permutations.map(p => [...p, concept]);
  }

  consumeBranchSeparator(token: Token) {}

  consumePartSeparator(token: Token) {}

  consumeLeftParen(token: Token) {}

  consumeRightParen(token: Token) {}

  consumeLeftCurly(token: Token) {}

  consumeRightCurly(token: Token) {}

  consumeLeftSquare(token: Token) {}

  consumeRightSquare(token: Token) {}

  consumeHeadRef(token: Token) {}

  consumePrevSeqRef(token: Token) {}

  consumeSortedSetInit(token: Token) {}
}

export default new ConceptParser();
