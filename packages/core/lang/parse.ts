import { Token, TokenType, tokenize } from './tokens';
import { Concept } from '../concept';

import {
  AstNode,
  AtomNode,
  BranchNode,
  CompoundNode,
  InlineBranchingNode,
  ParentheticalNode,
  RootNode,
} from './ast';

export type TokenHandler = (context: ConceptParsingContext) => AstNode;

export const parseConcepts = (source: string): Concept[] => {
  const tokens = tokenize(source);
  const root = new RootNode();

  const context = new ConceptParsingContext({
    root,
    branch: new BranchNode().appendTo(root),
    token: tokens[0],
  });

  for (const token of tokenize(source)) {
    const handler = tokenHandlers[token.type];

    if (!handler) {
      throw new Error(`No handler for token type "${token.type}"`);
    }

    context.token = token;
    context.branch = handler(context);
  }

  context.close();

  root.children.forEach(child => {
    context.results.push(
      ...(context.getPermutations(child) || []).map(Concept.fromParts),
    );
  });

  return context.results;
};

export const combinePermutations = (
  ...[leftPermutations, rightPermutations, ...rest]: Concept[][][]
): Concept[][] => {
  const combinedPermutations: Concept[][] = [];

  if (!rightPermutations?.length) {
    return leftPermutations;
  }

  if (!leftPermutations?.length) {
    return rightPermutations;
  }

  leftPermutations.forEach(left => {
    rightPermutations.forEach(right => {
      combinedPermutations.push([...left, ...right]);
    });
  });

  if (rest.length === 0) {
    return combinedPermutations;
  }

  return combinePermutations(combinedPermutations, ...rest);
};

export const tokenHandlers: Record<TokenType, TokenHandler> = {
  ATOM(ctx) {
    const atom = new AtomNode(ctx).appendTo(ctx.branch);
    ctx.setPermutations(atom, [[new Concept(ctx.token.value)]]);
    return ctx.branch;
  },

  BRANCH_SEPARATOR(ctx) {
    ctx.close();
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
    const parentheticalNode = ctx.branch.parent;

    if (!parentheticalNode?.is(ParentheticalNode)) {
      throw new Error(
        `Unexpected R_PAREN at line ${ctx.token.loc.start.line}, column ${ctx.token.loc.start.column}`,
      );
    }

    ctx.close();

    const prefixNode = parentheticalNode.prevSibling(
      node => !node.is(ParentheticalNode),
    );

    const leftPermutations =
      (prefixNode && ctx.getPermutations(prefixNode)) || [];

    parentheticalNode.children
      .filter(child => !child.is(ParentheticalNode))
      .forEach(child => {
        const rightPermutations = ctx.getPermutations(child) || [];

        const combinedPermutations = combinePermutations(
          leftPermutations,
          rightPermutations,
        );

        ctx.results.push(
          ...combinedPermutations.map(permutation =>
            Concept.fromParts(permutation),
          ),
        );
      });

    return ctx.branch.parent?.parent || ctx.root.children.at(-1)!;
  },

  L_CURLY(ctx) {
    const branching = new InlineBranchingNode(ctx).appendTo(ctx.branch);
    return new BranchNode().appendTo(branching);
  },

  R_CURLY(ctx) {
    const inlineBranchingNode = ctx.branch.parent;

    if (!inlineBranchingNode?.is(InlineBranchingNode)) {
      throw new Error(
        `Unexpected R_CURLY at line ${ctx.token.loc.start.line}, column ${ctx.token.loc.start.column}`,
      );
    }

    ctx.close();

    ctx.setPermutations(
      inlineBranchingNode,
      inlineBranchingNode.children
        .filter(child => !child.is(ParentheticalNode))
        .map(child => ctx.getPermutations(child) || [])
        .reduce(
          (agg, branchPermutations) => agg.concat(branchPermutations),
          [],
        ),
    );

    return ctx.branch.parent?.parent || ctx.root.children.at(-1)!;
  },

  L_SQUARE(ctx) {
    const branching = new CompoundNode(ctx).appendTo(ctx.branch);
    return new BranchNode().appendTo(branching);
  },

  R_SQUARE(ctx) {
    const compoundBranchingNode = ctx.branch.parent;

    if (!compoundBranchingNode?.is(CompoundNode)) {
      throw new Error(
        `Unexpected R_SQUARE at line ${ctx.token.loc.start.line}, column ${ctx.token.loc.start.column}`,
      );
    }

    ctx.close();

    ctx.setPermutations(
      compoundBranchingNode,
      compoundBranchingNode.children
        .map(child => ctx.getPermutations(child) || [])
        .flat(1)
        .map(permutation => {
          const concept = Concept.fromParts(permutation);
          return [concept];
        }),
    );

    return ctx.branch.parent?.parent || ctx.root.children.at(-1)!;
  },

  HEAD_REF(ctx) {
    throw new Error('Function not implemented.');
    // const branches: BranchNode[] = ctx.branch.collect(
    //   node => node.parent.parent,
    //   node => node.is(BranchNode),
    // );

    // const topBranch = branches.at(-1) || ctx.branch;

    // const headNode = topBranch.children.find(
    //   child => !child.is(ParentheticalNode),
    // );

    // if (headNode) {
    //   // This is a reference to a node that already exists.
    //   // We don't use insert, because we don't want to remove it from its original location.
    //   ctx.branch.children.push(headNode);
    // }

    // return ctx.branch;
  },

  PREV_SEQ_REF(ctx) {
    throw new Error('Function not implemented.');
  },

  SORTED_SET_INIT(ctx) {
    throw new Error('Function not implemented.');
  },
};

export type PermutationsMap = Map<AstNode, Concept[][]>;

export class ConceptParsingContext {
  token: Token;
  branch: BranchNode;
  root: RootNode;
  results: Concept[];

  constructor(init: {
    token: Token;
    branch: BranchNode;
    root: RootNode;
    results?: Concept[];
  }) {
    this.token = init.token;
    this.branch = init.branch;
    this.root = init.root;
    this.results = init.results || [];
  }

  #permutationCache: PermutationsMap = new Map();

  getPermutations(node: AstNode): Concept[][] | null {
    return this.#permutationCache.get(node) || null;
  }

  setPermutations(node: AstNode, permutations: Concept[][]) {
    this.#permutationCache.set(node, permutations);
  }

  #metaCache: PermutationsMap = new Map();

  getPermutations(node: AstNode): Concept[][] | null {
    return this.#permutationCache.get(node) || null;
  }

  setPermutations(node: AstNode, permutations: Concept[][]) {
    this.#permutationCache.set(node, permutations);
  }

  close() {
    let combinedPermutations: Concept[][] = [];

    this.branch.children
      .reduce((left: Concept[][], child: AstNode) => {
        const right = this.getPermutations(child) || [];
        return combinePermutations(left, right);
      }, [])
      .forEach(permutation => {
        combinedPermutations.push(permutation);
      });

    this.setPermutations(this.branch, combinedPermutations);

    return combinedPermutations;
  }
}
