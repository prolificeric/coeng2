import { Concept } from '../concept';
import {
  AstNode,
  AtomNode,
  BranchNode,
  InlineBranchingNode,
  ParentheticalNode,
  RootNode,
} from './ast2';

import { Token, TokenType, tokenize } from './tokens';

export type TokenHandler = (context: ParsingContext) => AstNode;

export type ParsingContext = {
  token: Token;
  branch: BranchNode;
  results: Concept[];
  permutations: PermutationsMap;
};

export type PermutationsMap = Map<AstNode, Concept[][]>;

export const parseConcepts = (source: string): Concept[] => {
  const results: Concept[] = [];
  const tokens = tokenize(source);
  const root = new RootNode();
  const permutations: PermutationsMap = new Map();
  let branch = new BranchNode().appendTo(root);

  tokens.forEach(token => {
    const handler = tokenHandlers[token.type];

    if (!handler) {
      throw new Error(`No handler for token type "${token.type}"`);
    }

    const context: ParsingContext = {
      token,
      branch: branch,
      results,
      permutations,
    };

    branch = handler(context);
  });

  return results;
};

const tokenHandlers: Record<TokenType, TokenHandler> = {
  ATOM(ctx) {
    const atom = new AtomNode(ctx).appendTo(ctx.branch);
    ctx.permutations.set(atom, [[new Concept(ctx.token.value)]]);
    return ctx.branch;
  },

  BRANCH_SEPARATOR(ctx) {
    return new BranchNode(ctx).appendTo(ctx.branch.parent!);
  },

  PART_SEPARATOR(ctx) {
    return ctx.branch;
  },

  L_PAREN(ctx) {
    const branching = new ParentheticalNode(ctx).appendTo(ctx.branch);
    return new BranchNode().appendTo(branching);
  },

  R_PAREN(ctx) {
    if (ctx.branch.parent instanceof ParentheticalNode) {
      ctx.branch.parent.children.forEach((branch: BranchNode) => {});
    }

    return ctx.branch.parent!.parent;
  },

  L_CURLY(ctx) {
    const branching = new InlineBranchingNode(ctx).appendTo(ctx.branch);
    return new BranchNode().appendTo(branching);
  },

  R_CURLY(ctx) {
    throw new Error('Function not implemented.');
  },

  L_SQUARE(ctx) {
    throw new Error('Function not implemented.');
  },

  R_SQUARE(ctx) {
    throw new Error('Function not implemented.');
  },

  HEAD_REF(ctx) {
    throw new Error('Function not implemented.');
  },

  PREV_SEQ_REF(ctx) {
    throw new Error('Function not implemented.');
  },

  SORTED_SET_INIT(ctx) {
    throw new Error('Function not implemented.');
  },
};
