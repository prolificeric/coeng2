import { Token } from './tokens';
export class AstNode<
  TParent extends AstNode | never = any,
  TChild extends AstNode | never = any,
> {
  token: Token | null = null;
  parent: TParent | null = null;
  children: TChild[] = [];

  constructor(init?: { token?: Token | null }) {
    this.token = init?.token ?? null;
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

export class AtomNode extends AstNode<BranchNode, ParentheticalNode> {}

export class BranchNode extends AstNode<
  BranchingNode,
  AtomNode | BranchingNode
> {}

export class BranchingNode extends AstNode<
  BranchNode,
  BranchNode | ParentheticalNode
> {}

export class RootNode extends BranchingNode {}

export class InlineBranchingNode extends BranchingNode {}

export class CompoundNode extends BranchingNode {}

export class ParentheticalNode extends BranchingNode {}

export class SortedSetInitNode extends AstNode<
  CompoundNode,
  ParentheticalNode
> {}

export class RefNode extends AstNode<BranchNode, ParentheticalNode> {
  start: number | null = null;
  end: number | null = null;

  constructor(start: number | null = null, end: number | null = null) {
    super();
    this.start = start;
    this.end = end ?? start;
  }
}
