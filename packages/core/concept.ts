import { cached } from './utils';
import { TriggerDirective } from './trigger';

export type SerializedConcept = {
  key: string;
  parts: SerializedConcept[];
};

export type ConceptTag =
  | 'ATOM'
  | 'LITERAL'
  | 'VARIABLE'
  | 'DIRECTIVE'
  | 'COMMAND_NAME'
  | 'COMMAND'
  | 'COMPOUND'
  | 'PATTERN'
  | 'TRIGGER_CLAUSE'
  | 'TRIGGER_NAME'
  | 'TRIGGER';

export class Concept {
  key: string;
  parts: Concept[];
  context?: Concept;

  constructor(key: string, parts: Concept[] = []) {
    this.key = key;
    this.parts = parts;
  }

  static fromParts(parts: Concept[]) {
    if (parts.length === 0) {
      return new Concept('');
    }

    if (parts.length === 1) {
      return parts[0];
    }

    return new Concept(Concept.joinKeys(parts), parts);
  }

  get size(): number {
    return this.parts.length;
  }

  static deserialize(serialized: SerializedConcept): Concept {
    return new Concept(
      serialized.key,
      serialized.parts.map(Concept.deserialize),
    );
  }

  serialize(): SerializedConcept {
    return {
      key: this.key,
      parts: this.parts.map(part => part.serialize()),
    };
  }

  is(tag: ConceptTag): boolean {
    return this.getTagSet().has(tag);
  }

  toMask = cached<Concept>((): Concept => {
    if (this.is('LITERAL')) {
      return this;
    }

    if (this.is('VARIABLE')) {
      return new Concept('$');
    }

    return new Concept(
      this.key,
      this.parts.map(part => part.toMask()),
    );
  });

  getTagSet = cached<Set<ConceptTag>>(() => {
    const set: Set<ConceptTag> = new Set();

    if (this.parts.length === 0) {
      set.add('ATOM');

      if (this.key.startsWith('$')) {
        set.add('VARIABLE');
      } else if (this.key.startsWith('@')) {
        set.add('DIRECTIVE');
      } else if (this.key.toUpperCase() === this.key) {
        set.add('COMMAND_NAME');
      } else {
        set.add('LITERAL');
      }
    } else {
      set.add('COMPOUND');

      const partTags = new Set<ConceptTag>();

      this.parts.forEach(part => {
        part.getTagSet().forEach(tag => partTags.add(tag));
      });

      if (this.parts[0].is('COMMAND_NAME')) {
        set.add('COMMAND');
      } else if (partTags.has('PATTERN') || partTags.has('VARIABLE')) {
        set.add('PATTERN');
      } else if (
        partTags.has('TRIGGER_NAME') ||
        partTags.has('TRIGGER_CLAUSE')
      ) {
        set.add('TRIGGER');
      } else if (
        this.parts.length === 3 &&
        Object.values(TriggerDirective).includes(this.parts[2].key as any)
      ) {
        set.add('TRIGGER_CLAUSE');
      } else {
        set.add('LITERAL');
      }
    }

    return set;
  });

  static joinKeys(parts: Concept[]): string {
    if (parts.length === 0) {
      return '';
    }

    if (parts.length === 1) {
      return parts[0].key;
    }

    return parts
      .map(part => (part.parts.length ? `[${part.key}]` : part.key))
      .join(' ');
  }
}
