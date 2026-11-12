/**
 * UI-only view model, not a backend or authorization contract. A future adapter
 * must supply only data the server authorizes and an explicit visibility policy.
 */
export interface TribalPlayerView {
  readonly id: string;
  readonly name?: string | null;
  readonly avatar?: { readonly src: string } | null;
  readonly points?: number | null;
  readonly rank?: number | string | null;
}

export type TribalPlayerField = 'name' | 'avatar' | 'points' | 'rank';
export type TribalVisibility = Partial<Readonly<Record<TribalPlayerField, boolean>>>;

/** Labels and nesting are display data; there are no fixed organization types or depths. */
export interface TribalUnitView {
  readonly id: string;
  readonly label: string;
  readonly players?: readonly TribalPlayerView[];
  readonly children?: readonly TribalUnitView[];
}

export interface TribalOverviewView {
  readonly units: readonly TribalUnitView[];
  /** Missing and false fields are both hidden, even when a player has a value. */
  readonly visibility?: TribalVisibility;
}

/** Typed presentation boundary; it does not describe or call a backend API. */
export interface TribalOverviewProps {
  readonly view: TribalOverviewView | null;
  readonly language: import('../i18n/locale').Language;
}
