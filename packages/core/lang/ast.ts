import { Token, TokenType } from './tokens';

export type AstNodeType =
  | 'BRANCH_LIST'
  | 'BRANCH'
  | 'COMPOUND'
  | 'ATOM'
  | 'INLINE_BRANCHING'
  | 'PARENTHETICAL';

export type AstNodeInit = {
  type: AstNodeType;
  children?: AstNode[];
  parent?: AstNode;
  prev?: AstNode;
  next?: AstNode;
  token?: Token;
};

export type Predicate = string | ((node: AstNode) => boolean);

export class AstNode {
  type: AstNodeType;
  children: AstNode[];
  parent: AstNode | null;
  prev: AstNode | null;
  next: AstNode | null;
  token: Token | null;

  constructor(init: AstNodeInit) {
    this.type = init.type;
    this.children = init.children || [];
    this.parent = init.parent || null;
    this.prev = init.prev || null;
    this.next = init.next || null;
    this.token = init.token || null;
  }

  static parse(tokens: Token[]): AstNode {
    const root = new AstNode({ type: 'BRANCH_LIST' });
    let cursor = root.createChild({ type: 'BRANCH' });

    for (const token of tokens) {
      const handler = astTokenHandlers[token.type];

      if (!handler) {
        throw new Error(`No handler for token type ${token.type}`);
      }

      cursor = handler(token, cursor);
    }

    return root;
  }

  get parentOrSelf(): AstNode {
    return this.parent || this;
  }

  insertBefore(node: AstNode): AstNode {
    node.insertAfter(this);
    return this;
  }

  insertAfter(node: AstNode): AstNode {
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

  createChild(init: AstNodeInit): AstNode {
    const child = new AstNode({
      ...init,
      parent: this,
    });

    this.children.push(child);

    return child;
  }

  requireParent(): AstNode {
    if (this.parent) {
      return this.parent;
    }

    throw new Error('Node has no parent');
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
      'Could not find next node',
    );
  }

  requireNext(predicate: Predicate): AstNode {
    return this.traverseOrThrow(
      node => node.parent,
      predicate,
      'Could not find next node',
    );
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
    let node: AstNode | null = this;

    if (typeof predicate === 'string') {
      const type = predicate;
      predicate = node => node.type === type;
    }

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
  (token: Token, cursor: AstNode) => AstNode
> = {
  ATOM(token, cursor) {
    throw new Error('Function not implemented.');
  },

  BRANCH_SEPARATOR(token, cursor) {
    throw new Error('Function not implemented.');
  },

  PART_SEPARATOR(token, cursor) {
    throw new Error('Function not implemented.');
  },

  L_PAREN(token, cursor) {
    throw new Error('Function not implemented.');
  },

  R_PAREN(token, cursor) {
    throw new Error('Function not implemented.');
  },

  L_CURLY(token, cursor) {
    throw new Error('Function not implemented.');
  },

  R_CURLY(token, cursor) {
    throw new Error('Function not implemented.');
  },

  L_SQUARE(token, cursor) {
    throw new Error('Function not implemented.');
  },

  R_SQUARE(token, cursor) {
    throw new Error('Function not implemented.');
  },

  HEAD_REF(token, cursor) {
    throw new Error('Function not implemented.');
  },

  PREV_REF(token, cursor) {
    throw new Error('Function not implemented.');
  },

  SORTED_SET_INIT(token, cursor) {
    throw new Error('Function not implemented.');
  },
};
