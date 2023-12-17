import { EventEmitter } from 'events';
import { Token } from './tokens';

export abstract class AstNode<
  TParent extends AstNode | never = any,
  TChild extends AstNode | never = any,
> extends EventEmitter {
  token: Token | null = null;
  parent: TParent | null = null;
  children: TChild[] = [];

  abstract consumeToken(token: Token): AstNode;

  setToken(token: Token | null) {
    this.token = token;
    return this;
  }

  appendChild(child: TChild) {
    child.parent?.removeChild(child);
    child.parent = this;
    this.children.push(child);
    return this;
  }

  appendTo(parent: TParent) {
    parent.appendChild(this);
    return this;
  }

  insertChild(child: TChild, after: TChild) {
    const index = this.children.indexOf(after);

    if (index === -1) {
      throw new Error('Cannot insert child after non-child.');
    }

    child.parent?.removeChild(child);
    child.parent = this;
    this.children.splice(index + 1, 0, child);
    return this;
  }

  removeChild(child: TChild) {
    const index = this.children.indexOf(child);

    if (index !== -1) {
      this.children.splice(index, 1);
    }

    return this;
  }

  *traverse(select: (node: AstNode) => AstNode | null) {
    let node: AstNode | null = this;

    while ((node = select(node))) {
      yield node;
    }
  }
}

export class AtomNode extends AstNode<BranchNode, ParentheticalNode> {
  consumeToken(token: Token) {
    switch (token.type) {
      case 'ATOM':
      default:
        throw new Error(`Unexpected token: ${token.type}`);
    }

    return this;
  }
}

export class BranchNode extends AstNode<
  BranchingNode,
  AtomNode | BranchingNode
> {
  consumeToken() {
    return this;
  }
}

export class BranchingNode extends AstNode<
  BranchNode,
  BranchNode | ParentheticalNode
> {
  consumeToken() {
    return this;
  }

  branch(): BranchNode {
    return new BranchNode().appendTo(this);
  }
}

export class CompoundNode extends BranchingNode {}

export class ParentheticalNode extends BranchingNode {}

export class SortedSetInitNode extends AstNode<
  CompoundNode,
  ParentheticalNode
> {}

export class HeadRef extends AstNode<BranchNode, ParentheticalNode> {}

export class RangeRef extends AstNode<BranchNode, ParentheticalNode> {}
