// Shapes shared between the compiler (scripts/build-content.ts) and the
// runtime content layer. The generated manifest conforms to `Manifest`.

/** A future app artifact the compiler may derive from a document. */
export interface AppDecl {
  name: string;
  kind: string;
}

export interface Document {
  /** Path under content/ without extension — also the command name. */
  slug: string;
  /** Extracted from the first `# Title` line (falls back to the slug). */
  title: string;
  /** The full markdown body. */
  body: string;
  /** Source file path relative to content/. */
  path: string;
  /** Decided by the compiler's analyze() pass. */
  kind: string;
  apps: AppDecl[];
}

export interface Manifest {
  documents: Document[];
  apps: AppDecl[];
}
