import { Token, TokenType } from './tokens';

export type AstNodeType =
  | 'BRANCH_LIST'
  | 'BRANCH'
  | 'COMPOUND'
  | 'ATOM'
  | 'PARENTHESIS';

export class AstParseCursor {
  branch: AstNode;
  prev: AstNode;

  constructor(init: { branch: AstNode; prev: AstNode }) {
    this.branch = init.branch;
    this.prev = init.prev;
  }
  
  createBranchChild(init: AstNodeInit) {
    this.prev = this.branch.createChild(init);
  }
}

export type AstNodeInit = {
  type: AstNodeType;
  children?: AstNode[];
  properties?: Record<string, any>;
  token?: Token;
};

export class AstNode {
  type: AstNodeType;
  children: AstNode[];
  token?: Token;
  parent?: AstNode;

  constructor(init: AstNodeInit) {
    this.type = init.type;
    this.children = init.children || [];
    this.token = init.token;
    this.parent = init.parent;
  }

  requireParent() {
    if (!this.parent) {
      throw new Error('No parent');
    }

    return this.parent;
  }

  getLastChild() {
    return this.children?.at(-1) || null;
  }

  createChild(init: AstNodeInit): AstNode {
    const child = new AstNode({
      ...init,
      parent: this,
    });
    this.children.push(child);
    return child;
  }
}

export const parseAst = (tokens: Token[]): AstNode => {
  const root = new AstNode({ type: 'BRANCH_LIST' });

  const cursor = new AstParseCursor({
    prev: root,
    branch: root.createChild({ type: 'BRANCH' }),
  });

  for (const token of tokens) {
    const handler = astTokenHandlers[token.type];

    if (!handler) {
      throw new Error(`No handler for token type ${token.type}`);
    }

    handler(token, cursor);
  }

  return root;
};

export const astTokenHandlers: Record<
  TokenType,
  (token: Token, cursor: AstParseCursor) => void
> = {
  ATOM(token, cursor) {
    cursor.branch.createChild({ type: 'ATOM', token });
  },

  BRANCH_SEPARATOR(token, cursor) {
    cursor.branch = cursor.branch
      .requireParent()
      .createChild({ type: 'BRANCH' });
  },

  PART_SEPARATOR() {
    // No-op
  },

  L_PAREN(token, cursor) {
    const 
  },

  R_PAREN(token) {
    throw new Error('Function not implemented.');
  },

  L_CURLY(token) {
    throw new Error('Function not implemented.');
  },

  R_CURLY(token) {
    throw new Error('Function not implemented.');
  },

  L_SQUARE(token) {
    throw new Error('Function not implemented.');
  },

  R_SQUARE(token) {
    throw new Error('Function not implemented.');
  },

  HEAD_REF(token) {
    throw new Error('Function not implemented.');
  },

  PREV_REF(token) {
    throw new Error('Function not implemented.');
  },

  SORTED_SET_INIT(token) {
    throw new Error('Function not implemented.');
  },
};
