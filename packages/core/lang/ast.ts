import { Token } from './tokens';

export abstract class AstNode<
  TChild extends AstNode = AstNode<any, any>,
  TParent extends AstNode = AstNode<any, any>,
> extends EventTarget {
  root: RootNode | null;
  token: Token | null;
  parent: TParent | null;
  children: TChild[];

  constructor(
    init: {
      root?: RootNode | null;
      token?: Token | null;
      parent?: TParent | null;
      children?: TChild[];
    } = {},
  ) {
    super();
    this.root = init.root ?? null;
    this.token = init.token ?? null;
    this.parent = init.parent ?? null;
    this.children = init.children ?? [];
  }

  addEventListener(...args: Parameters<EventTarget['addEventListener']>) {
    throw new Error(`${this.constructor.name} does not emit events.`);
  }

  consumeToken(token: Token): AstNode {
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

  consumeAtom(token: Token): AstNode {
    return this;
  }

  consumeBranchSeparator(token: Token): AstNode {
    return this;
  }

  consumePartSeparator(token: Token): AstNode {
    return this;
  }

  consumeLeftParen(token: Token): AstNode {
    return this;
  }

  consumeRightParen(token: Token): AstNode {
    return this;
  }

  consumeLeftCurly(token: Token): AstNode {
    return this;
  }

  consumeRightCurly(token: Token): AstNode {
    return this;
  }

  consumeLeftSquare(token: Token): AstNode {
    return this;
  }

  consumeRightSquare(token: Token): AstNode {
    return this;
  }

  consumeHeadRef(token: Token): AstNode {
    return this;
  }

  consumePrevSeqRef(token: Token): AstNode {
    return this;
  }

  consumeSortedSetInit(token: Token): AstNode {
    return this;
  }

  append(child: TChild) {
    this.remove(child);
    this.children.push(child);
    child.parent = this;
    return this;
  }

  prepend(child: TChild) {
    this.remove(child);
    this.children.unshift(child);
    child.parent = this;
    return this;
  }

  remove(child: TChild) {
    const index = this.children.indexOf(child);

    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }

    return this;
  }

  appendTo(parent: TParent) {
    this.parent?.remove(this);
    parent.append(this);
    return this;
  }

  prependTo(parent: TParent) {
    this.parent?.remove(this);
    parent.prepend(this);
    return this;
  }
}

export class RootNode extends AstNode<BranchNode, RootNode> {
  parent = this;
}

export class BranchingNode extends AstNode<BranchNode, BranchNode> {}

export class AtomNode extends AstNode<never, BranchNode> {}

export class NestedBranchingNode extends BranchingNode {}

export class InlineBranchingNode extends BranchingNode {}

export class ParentheticalBranchingNode extends BranchingNode {}

export type EventListenerCallback<
  TEventProperties extends Record<string, any> = {},
> = (event: Event & TEventProperties) => void | {
  handleEvent: (event: Event & TEventProperties) => void;
} | null;

export class BranchNode extends AstNode<
  AtomNode | BranchingNode,
  BranchingNode | RootNode
> {
  addEventListener(type: 'close', callback: EventListenerCallback) {
    super.addEventListener(type, callback);
  }

  consumeAtom(token: Token) {
    return this.append(
      new AtomNode({
        token,
        parent: this,
      }),
    );
  }

  consumeBranchSeparator(token: Token) {
    if (!this.children.length) {
      this.parent?.remove(this);
    }

    const nextBranch = new BranchNode({ token });

    this.parent?.append(nextBranch);

    return nextBranch;
  }

  consumeLeftSquare(token: Token) {
    return this.consumeBranchOpeningToken(NestedBranchingNode, token);
  }

  consumeRightSquare(token: Token) {
    return this.consumeBranchClosingToken(NestedBranchingNode, token);
  }

  consumeLeftCurly(token: Token) {
    return this.consumeBranchOpeningToken(InlineBranchingNode, token);
  }

  consumeRightCurly(token: Token) {
    return this.consumeBranchClosingToken(InlineBranchingNode, token);
  }

  consumeLeftParen(token: Token) {
    return this.consumeBranchOpeningToken(ParentheticalBranchingNode, token);
  }

  consumeRightParen(token: Token) {
    return this.consumeBranchClosingToken(ParentheticalBranchingNode, token);
  }

  protected consumeBranchOpeningToken(
    NodeType: typeof BranchingNode,
    token: Token,
  ) {
    return new BranchNode().append(new NodeType({ token }).appendTo(this));
  }

  protected consumeBranchClosingToken(
    NodeType: typeof BranchingNode,
    token: Token,
  ) {
    if (this.parent instanceof NodeType === false) {
      throw new UnexpectedTokenError(token);
    }

    const parentBranch = this.parent.parent;

    if (!parentBranch) {
      throw new UnexpectedTokenError(token);
    }

    return parentBranch;
  }
}

export class UnexpectedTokenError extends Error {
  constructor(token: Token) {
    super(
      `Unexpected ${token.type} at ${token.loc.start.line}:${token.loc.start.column}`,
    );
  }
}
