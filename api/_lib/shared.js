/**
 * Re-exports shared-core.js helpers plus the Mother API client, so existing
 * function files can keep doing `import { ... } from "./_lib/shared.js"`.
 * (Split into two files only to avoid a circular import between this file
 * and mother.js, which itself needs getSetting() from shared-core.js.)
 */
export * from "./shared-core.js";
export { Mother } from "./mother.js";
