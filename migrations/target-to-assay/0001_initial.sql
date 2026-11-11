-- V1 schema only; no remote database is created or bound by this migration.
-- Every scientific fact points to evidence; future models remain empty.
CREATE TABLE sources (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  locator TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  verification TEXT NOT NULL CHECK (verification IN ('unverified','reviewed','verified','disputed','retired'))
);
CREATE TABLE targets (
  id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('protein','complex')),
  source_id TEXT NOT NULL REFERENCES sources(id)
);
-- Alias collisions across targets are permitted and resolved as ambiguity.
CREATE TABLE target_aliases (
  target_id TEXT NOT NULL REFERENCES targets(id),
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY (target_id, normalized_alias)
);
CREATE INDEX target_alias_lookup ON target_aliases(normalized_alias);
CREATE TABLE drugs (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  verification TEXT NOT NULL CHECK (verification IN ('unverified','reviewed','verified','disputed','retired')),
  updated_at TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id)
);
CREATE TABLE drug_targets (
  drug_id TEXT NOT NULL REFERENCES drugs(id),
  target_id TEXT NOT NULL REFERENCES targets(id),
  role TEXT NOT NULL DEFAULT 'direct_binding',
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY (drug_id, target_id, role)
);
CREATE INDEX drug_targets_lookup ON drug_targets(target_id, drug_id);
CREATE TABLE approvals (
  id TEXT PRIMARY KEY NOT NULL,
  drug_id TEXT NOT NULL REFERENCES drugs(id),
  agency TEXT NOT NULL CHECK (agency IN ('FDA','EMA','NMPA')),
  identifier TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved','withdrawn','unknown')),
  initial_year INTEGER NOT NULL CHECK (initial_year >= 1900),
  source_id TEXT NOT NULL REFERENCES sources(id),
  UNIQUE (drug_id, agency, identifier)
);
CREATE INDEX approvals_lookup ON approvals(drug_id, agency, status);
CREATE TABLE documents (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id),
  external_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('label','assessment','article','poster','patent')),
  drug_id TEXT REFERENCES drugs(id),
  UNIQUE (source_id, external_id)
);
CREATE TABLE activity_methods (
  id TEXT PRIMARY KEY NOT NULL,
  document_id TEXT NOT NULL REFERENCES documents(id),
  target_id TEXT NOT NULL REFERENCES targets(id),
  kind TEXT NOT NULL CHECK (kind IN ('binding','cell_based')),
  readout TEXT NOT NULL,
  summary TEXT NOT NULL,
  verification TEXT NOT NULL DEFAULT 'unverified' CHECK (verification IN ('unverified','reviewed','verified','disputed','retired')),
  updated_at TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id)
);
CREATE TABLE materials (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('protein','cell')),
  supplier TEXT NOT NULL,
  catalog_number TEXT NOT NULL,
  name TEXT NOT NULL,
  verification TEXT NOT NULL DEFAULT 'unverified' CHECK (verification IN ('unverified','reviewed','verified','disputed','retired')),
  updated_at TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id),
  UNIQUE (supplier, catalog_number)
);
CREATE TABLE method_materials (
  method_id TEXT NOT NULL REFERENCES activity_methods(id),
  material_id TEXT NOT NULL REFERENCES materials(id),
  source_id TEXT NOT NULL REFERENCES sources(id),
  PRIMARY KEY (method_id, material_id)
);
