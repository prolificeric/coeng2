import { Token, TokenType } from './tokens';

export type AstNodeType =
  | 'BRANCH_LIST'
  | 'BRANCH'
  | 'COMPOUND'
  | 'ATOM'
  | 'INLINE_BRANCHING'
  | 'PARENTHETICAL'
  | 'END_BLOCK'
  | 'HEAD_REF'
  | 'PREV_SEQ_REF'
  | 'SORTED_SET_INIT';

export type AstNodeInit = {
  type: AstNodeType;
  children?: AstNode[];
  parent?: AstNode;
  prev?: AstNode;
  next?: AstNode;
  token?: Token;
};

export type Predicate = string | string[] | ((node: AstNode) => boolean);

export type AstParseEventHandler = (node: AstNode) => void;

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

export class AstNode {
  type: AstNodeType;
  children: AstNode[];
  parent: AstNode | null;
  prev: AstNode | null;
  next: AstNode | null;
  token: Token | null;
  computed: Record<string, any>;

  constructor(init: AstNodeInit) {
    this.type = init.type;
    this.children = init.children || [];
    this.parent = init.parent || null;
    this.prev = init.prev || null;
    this.next = init.next || null;
    this.token = init.token || null;
    this.computed = {};
  }

  static fromTokens(
    tokens: Token[],
    onNodeComplete?: (node: AstNode) => void,
  ): AstNode {
    const root = new AstNode({ type: 'BRANCH_LIST' });
    let cursor = root.createChild({ type: 'BRANCH' }, { insertNext: true });

    for (const token of tokens) {
      const handler = astTokenHandlers[token.type];

      if (!handler) {
        throw new Error(`No handler for token type ${token.type}`);
      }

      const next = handler(token, cursor, onNodeComplete);
      cursor.insertNext(next);
      cursor = next;
    }

    if (onNodeComplete) {
      let parent: AstNode | null = cursor;

      while ((parent = parent.parent)) {
        onNodeComplete(cursor);
      }
    }

    return root;
  }

  get parentOrSelf(): AstNode {
    return this.parent || this;
  }

  insertAfter(node: AstNode): AstNode {
    node.insertNext(this);
    return this;
  }

  insertNext(node: AstNode): AstNode {
    if (node.prev) {
      node.prev.next = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    }

    this.next = node;
    node.prev = this;

    return this;
  }

  createChild(
    init: AstNodeInit,
    options?: {
      insertNext: boolean;
    },
  ): AstNode {
    const { insertNext = false } = options || {};

    const child = new AstNode({
      ...init,
      parent: this,
    });

    this.children.push(child);

    if (insertNext) {
      this.insertNext(child);
    }

    return child;
  }

  requireParent(): AstNode {
    if (this.parent) {
      return this.parent;
    }

    throw new Error('Node has no parent');
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

  requirePrev(predicate: Predicate): AstNode {
    return this.traverseOrThrow(
      node => node.prev,
      predicate,
      'Could not find previous node',
    );
  }

  requireNext(predicate: Predicate): AstNode {
    return this.traverseOrThrow(
      node => node.parent,
      predicate,
      'Could not find next node',
    );
  }

  findClosest(predicate: Predicate) {
    predicate = normalizePredicate(predicate);
    return predicate(this) ? this : this.findAncestor(predicate);
  }

  findAncestor(predicate: Predicate): AstNode | null {
    return this.traverse(node => node.parent, predicate);
  }

  findPrev(predicate: Predicate) {
    return this.traverse(node => node.prev, predicate);
  }

  findNext(predicate: Predicate) {
    return this.traverse(node => node.next, predicate);
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

export const astTokenHandlers: Record<
  TokenType,
  (
    token: Token,
    cursor: AstNode,
    onNodeComplete?: (node: AstNode) => void,
  ) => AstNode
> = {
  ATOM(token, cursor, onNodeComplete) {
    const node = cursor
      .requireClosest('BRANCH')
      .createChild({ token, type: 'ATOM' })
      .insertAfter(cursor);

    return node;
  },

  BRANCH_SEPARATOR(token, cursor, onNodeComplete) {
    const node = cursor
      .requireClosest('BRANCH_LIST')
      .createChild({ token, type: 'BRANCH' })
      .insertAfter(cursor);

    onNodeComplete?.(cursor);

    return node;
  },

  PART_SEPARATOR(_token, cursor) {
    return cursor;
  },

  L_PAREN(token, cursor) {
    return cursor
      .createChild({ token, type: 'PARENTHETICAL' }, { insertNext: true })
      .createChild({ type: 'BRANCH_LIST' }, { insertNext: true })
      .createChild({ type: 'BRANCH' }, { insertNext: true });
  },

  R_PAREN(_token, cursor, onNodeComplete) {
    const parenthetical = cursor.requireClosest('PARENTHETICAL');

    if (!parenthetical) {
      return cursor;
    }

    const next = cursor
      .createChild({ type: 'END_BLOCK' })
      .insertAfter(parenthetical);

    if (onNodeComplete) {
      [
        cursor.requireClosest('BRANCH'),
        cursor.requireClosest('BRANCH_LIST'),
        cursor.requireClosest('PARENTHETICAL'),
      ].forEach(onNodeComplete);
    }

    return next;
  },

  L_CURLY(token, cursor) {
    return cursor
      .createChild({ token, type: 'INLINE_BRANCHING' }, { insertNext: true })
      .createChild({ type: 'BRANCH_LIST' }, { insertNext: true })
      .createChild({ type: 'BRANCH' }, { insertNext: true });
  },

  R_CURLY(_token, cursor, onNodeComplete) {
    if (onNodeComplete) {
      [
        cursor.requireClosest('BRANCH'),
        cursor.requireClosest('INLINE_BRANCHING'),
      ].forEach(onNodeComplete);
    }

    return (
      cursor.requireClosest('INLINE_BRANCHING').prev ||
      cursor.requireClosest('BRANCH')
    );
  },

  L_SQUARE(token, cursor) {
    return cursor
      .createChild({ token, type: 'COMPOUND' }, { insertNext: true })
      .createChild({ type: 'BRANCH_LIST' }, { insertNext: true })
      .createChild({ type: 'BRANCH' }, { insertNext: true });
  },

  R_SQUARE(_token, cursor, onNodeComplete) {
    const node =
      cursor.requireClosest('COMPOUND').prev || cursor.requireClosest('BRANCH');

    onNodeComplete?.(node);

    return node;
  },

  HEAD_REF(token, cursor) {
    return cursor
      .requireClosest('BRANCH')
      .createChild({ token, type: 'HEAD_REF' })
      .insertAfter(cursor);
  },

  PREV_SEQ_REF(token, cursor) {
    return cursor
      .requireClosest('BRANCH')
      .createChild({ token, type: 'PREV_SEQ_REF' })
      .insertAfter(cursor);
  },

  SORTED_SET_INIT(token, cursor) {
    return cursor
      .requireClosest('BRANCH')
      .createChild({ token, type: 'SORTED_SET_INIT' })
      .insertAfter(cursor);
  },
};
