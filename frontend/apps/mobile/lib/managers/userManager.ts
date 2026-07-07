import { BaseUserManager } from "@rockit/shared";

/**
 * Mobile user manager. Queue-type / repeat / profile state comes entirely from
 * the shared BaseUserManager. Language switching stays in the VocabularyProvider.
 */
export class UserManager extends BaseUserManager {}
