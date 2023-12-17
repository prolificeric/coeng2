import { Token, TokenType } from './tokens';

export type AstNodeType =
  | 'ROOT'
  | 'BRANCH'
  | 'COMPOUND'
  | 'ATOM'
  | 'INLINE_BRANCHING'
  | 'PARENTHETICAL'
  | 'HEAD_REF'
  | 'PREV_SEQ_REF'
  | 'SORTED_SET_INIT';

export type Predicate = string | string[] | ((node: AstNode) => boolean);

export type AstParseEventHandler = (node: AstNode) => void;

export type AstNodeInit = {
  type: AstNodeType;
  children?: AstNode[];
  parent?: AstNode;
  token?: Token;
};

export class AstNode {
  type: AstNodeType;
  children: AstNode[];
  parent: AstNode | null;
  token: Token | null;

  // When parsing, we can store arbitrary data on the node.
  _cache: Record<string, any>;

  constructor(init: AstNodeInit) {
    this.type = init.type;
    this.children = init.children || [];
    this.parent = init.parent || null;
    this.token = init.token || null;
    this._cache = {};
  }

  static parseTokens(
    tokens: Token[],
    onNodeComplete: (node: AstNode) => void = () => {},
  ): AstNode {
    const root = new AstNode({ type: 'ROOT' });
    let cursor = root.createChild({ type: 'BRANCH' });

    for (const token of tokens) {
      const handler = astTokenHandlers[token.type];

      if (!handler) {
        throw new Error(`No handler for token type ${token.type}`);
      }

      cursor = handler(token, cursor, onNodeComplete);
    }

    // Close any open nodes
    const closableNodes: AstNodeType[] = [
      'ROOT',
      'BRANCH',
      'COMPOUND',
      'INLINE_BRANCHING',
      'PARENTHETICAL',
    ];

    let bubble = cursor.findClosest(closableNodes);

    while (bubble) {
      onNodeComplete(bubble);

      if (bubble.type === 'PARENTHETICAL') {
        // Direct parents of parentheticals are always already closed.
        bubble = bubble.findAncestor('BRANCH');
      } else {
        // Close the next closable node
        bubble = bubble.findAncestor(closableNodes);
      }
    }

    return root;
  }

  get parentOrSelf(): AstNode {
    return this.parent || this;
  }

  createChild(init: AstNode | AstNodeInit): AstNode {
    const child = init instanceof AstNode ? init : new AstNode(init);
    child.parent = this;
    this.children.push(child);
    return child;
  }

  requireClosestBefore(
    predicate: Predicate,
    antipredicate: Predicate,
  ): AstNode {
    const node = this.findClosestBefore(predicate, antipredicate);

    if (!node) {
      throw new Error('Could not find closest node before antipredicate');
    }

    return node;
  }

  requireParent(): AstNode {
    if (this.parent) {
      return this.parent;
    }

    throw new Error('Node has no parent');
  }

  requireFarthest(predicate: Predicate): AstNode {
    const node = this.findFarthest(predicate);

    if (!node) {
      throw new Error('Could not find farthest node');
    }

    return node;
  }

  requireClosest(predicate: Predicate): AstNode {
    predicate = normalizePredicate(predicate);

    if (predicate(this)) {
      return this;
    }

    return this.traverseOrThrow(
      node => node.parent,
      predicate,
      'Could not find closest node',
    );
  }

  requireAncestor(predicate: Predicate): AstNode {
    return this.traverseOrThrow(
      node => node.parent,
      predicate,
      'Could not find ancestor',
    );
  }

  findFarthest(predicate: Predicate): AstNode | null {
    predicate = normalizePredicate(predicate);
    return (
      this.parent?.findFarthest(predicate) || (predicate(this) ? this : null)
    );
  }

  findClosest(predicate: Predicate) {
    predicate = normalizePredicate(predicate);
    return predicate(this) ? this : this.findAncestor(predicate);
  }

  findClosestBefore(
    predicate: Predicate,
    antipredicate: Predicate,
  ): AstNode | null {
    predicate = normalizePredicate(predicate);
    antipredicate = normalizePredicate(antipredicate);

    if (predicate(this)) {
      return this;
    }

    if (antipredicate(this)) {
      return null;
    }

    return this.parent?.findClosestBefore(predicate, antipredicate) || null;
  }

  findAncestor(predicate: Predicate): AstNode | null {
    return this.traverse(node => node.parent, predicate);
  }

  traverse(selector: (node: AstNode) => AstNode | null, predicate: Predicate) {
    predicate = normalizePredicate(predicate);

    let node: AstNode | null = this;

    while ((node = selector(node))) {
      if (predicate(node)) {
        return node;
      }
    }

    return null;
  }

  traverseOrThrow(
    selector: (node: AstNode) => AstNode | null,
    predicate: Predicate,
    errorMessage: string,
  ) {
    const node = this.traverse(selector, predicate);

    if (!node) {
      throw new Error(errorMessage);
    }

    return node;
  }
}

const applyCallback = <T>(value: T, callback?: (value: T) => void) => {
  callback?.(value);
  return value;
};

export const astTokenHandlers: Record<
  TokenType,
  (
    token: Token,
    cursor: AstNode,
    onNodeComplete: (node: AstNode) => void,
  ) => AstNode
> = {
  ATOM(token, cursor, onNodeComplete) {
    return applyCallback(
      cursor.requireClosest('BRANCH').createChild({ type: 'ATOM', token }),
      onNodeComplete,
    );
  },

  HEAD_REF(token, cursor, onNodeComplete) {
    return applyCallback(
      cursor.requireClosest('BRANCH').createChild({ type: 'HEAD_REF', token }),
      onNodeComplete,
    );
  },

  PREV_SEQ_REF(token, cursor, onNodeComplete) {
    return applyCallback(
      cursor
        .requireClosest('BRANCH')
        .createChild({ type: 'PREV_SEQ_REF', token }),
      onNodeComplete,
    );
  },

  SORTED_SET_INIT(token, cursor, onNodeComplete) {
    return cursor
      .requireClosest('BRANCH')
      .createChild({ type: 'SORTED_SET_INIT', token });
  },

  BRANCH_SEPARATOR(token, cursor, onNodeComplete) {
    const nextBranch = cursor
      .requireClosest(['INLINE_BRANCHING', 'PARENTHETICAL', 'COMPOUND'])
      .createChild({ type: 'BRANCH', token });

    applyCallback(cursor.requireClosest('BRANCH'), onNodeComplete);

    return nextBranch;
  },

  PART_SEPARATOR(token, cursor, onNodeComplete) {
    return cursor;
  },

  L_PAREN(token, cursor, onNodeComplete) {
    return cursor
      .createChild({
        type: 'PARENTHETICAL',
        token,
      })
      .createChild({
        type: 'BRANCH',
      });
  },

  R_PAREN(
    _token: Token,
    cursor: AstNode,
    onNodeComplete?: (node: AstNode) => void,
  ): AstNode {
    const parenthetical = cursor.requireClosestBefore('PARENTHETICAL', [
      'INLINE_BRANCHING',
      'COMPOUND',
    ]);

    // Tolerate stray closing parens
    if (!parenthetical) {
      return cursor;
    }

    applyCallback(parenthetical, onNodeComplete);

    // Return the parent of the parenthetical so we can continue in the
    // previous parsing context.
    return parenthetical.requireParent();
  },

  L_CURLY(token: Token, cursor: AstNode): AstNode {
    return cursor
      .createChild({
        type: 'INLINE_BRANCHING',
        token,
      })
      .createChild({
        type: 'BRANCH',
      });
  },

  R_CURLY(
    _token: Token,
    cursor: AstNode,
    onNodeComplete?: (node: AstNode) => void,
  ): AstNode {
    const inlineBranching = cursor.requireClosestBefore('INLINE_BRANCHING', [
      'PARENTHETICAL',
      'COMPOUND',
    ]);

    return inlineBranching
      ? applyCallback(inlineBranching, onNodeComplete)
      : cursor;
  },

  L_SQUARE(token: Token, cursor: AstNode): AstNode {
    return cursor
      .createChild({
        type: 'COMPOUND',
        token,
      })
      .createChild({
        type: 'BRANCH',
      });
  },

  R_SQUARE(
    _token: Token,
    cursor: AstNode,
    onNodeComplete?: (node: AstNode) => void,
  ): AstNode {
    const compound = cursor.requireClosestBefore('COMPOUND', [
      'PARENTHETICAL',
      'INLINE_BRANCHING',
    ]);

    return compound ? applyCallback(compound, onNodeComplete) : cursor;
  },
};

export const normalizePredicate = (
  predicate: Predicate,
): ((node: AstNode) => boolean) => {
  if (typeof predicate === 'string') {
    predicate = [predicate];
  }

  if (Array.isArray(predicate)) {
    const types = predicate;
    return node => types.includes(node.type);
  }

  return predicate;
};
