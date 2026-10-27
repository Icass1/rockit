// Reactive store primitives now live in the shared package so web and mobile
// use the same nanostores wrappers. This file is a thin re-export shim kept for
// the existing `@/lib/store` import sites.
export * from "@rockit/shared/lib/store";
