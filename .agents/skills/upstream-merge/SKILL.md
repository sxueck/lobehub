---
name: upstream-merge
description: "Controlled upstream synchronization workflow for maintaining sxueck/lobehub from lobehub/lobehub. Use whenever the user asks to merge, pull, rebase, sync, update from upstream, resolve upstream conflicts, force-with-lease push a rebased fork, or verify that a fork is aligned with lobehub/lobehub. This skill protects downstream commit intent, handles dirty-worktree preservation, and requires asking the user when upstream changes conflict with intentional local removals or custom behavior."
---

# Upstream Merge Governance

## Purpose

Use this skill to bring updates from `lobehub/lobehub` into `sxueck/lobehub` without accidentally erasing the downstream repository's own product decisions, removals, custom patches, or commit intent.

The key rule is: treat both upstream and downstream histories as intentional until evidence says otherwise. A clean Git merge is not enough; verify whether the resulting behavior still preserves the downstream intent.

## Repository Roles

- **Upstream**: `lobehub/lobehub`
- **Downstream fork**: `sxueck/lobehub`
- **Protected intent**: Any downstream commit, repeated local patch, deleted upstream feature, disabled integration, changed default, custom branding, environment behavior, or security/privacy adjustment.

## Trigger Examples

Use this skill for requests like:

- "sync my fork with upstream"
- "merge upstream canary into my branch"
- "pull latest lobehub/lobehub updates"
- "resolve conflicts from upstream"
- "rebase my fork on upstream"
- "上游更新了，帮我合并"

## Operating Principles

1. Preserve downstream intent over mechanical conflict resolution.
2. Prefer small, explicit Git operations that can be inspected and reversed by normal review.
3. Never assume upstream is correct just because it is newer.
4. Never assume downstream is correct when upstream fixes a bug or security issue; compare intent and impact.
5. Ask the user when product intent conflicts, even if Git can auto-merge the files.
6. Keep unrelated dirty working tree changes untouched.
7. Treat push and post-push verification as part of the sync, because a successful local rebase is not enough if the fork remote still points at old history.

## Command Safety Notes

- If the user explicitly says not to use a command wrapper for `git fetch` (for example, no `rtk`), run the raw `git fetch upstream` command.
- Use `--force-with-lease`, not plain `--force`, when pushing a rebased branch and only after the user explicitly approves rewriting the fork remote.
- Avoid destructive cleanup commands. If Git cleanup is blocked by untracked files, stash them with `git stash push --include-untracked` rather than deleting or restoring them.
- If local policy blocks `git rebase`, report the exact blocker and wait for the user to unlock or run the command manually.

## Required Preflight

Before fetching or merging upstream changes:

1. Inspect remotes:

```bash
git remote -v
```

2. Confirm the upstream remote points to `lobehub/lobehub`. If missing or wrong, ask before changing remotes.

3. Inspect current branch and worktree:

```bash
git status --short --branch
git log --oneline --decorate -20
```

4. If there are uncommitted changes, identify whether they are related to the merge task. Do not stash, discard, or modify unrelated changes without user approval.

5. Identify the base branch and upstream branch. Default to the current branch and its upstream counterpart only when the user did not specify a target.

6. Capture the before-sync divergence so the user can see how far behind/ahead the fork is:

```bash
git rev-list --left-right --count upstream/<branch>...HEAD
git log --oneline --decorate --left-right --cherry-pick upstream/<branch>...HEAD
```

Interpret `A B` from `rev-list --left-right --count upstream/<branch>...HEAD` as: `A` commits only on upstream, `B` commits only on the current branch.

## Gather Intent Before Merging

Build a concise picture of downstream-only intent before resolving changes:

```bash
git fetch upstream
git log --oneline upstream/<branch>..HEAD
git diff --stat upstream/<branch>...HEAD
git diff upstream/<branch>...HEAD -- <high-risk-paths>
```

If the worktree is dirty and the user wants you to proceed, protect the exact staged/unstaged/untracked state before rebasing:

```bash
git stash push --include-untracked -m "pre-upstream-rebase-$(date +%Y%m%d-%H%M%S)"
```

After the rebase finishes, run `git stash pop` to restore the protected worktree. If `stash pop` reports that files already exist or cannot be restored, verify `git status --short --branch`; if the worktree is clean and the files are already present through the rebased commits, keep the stash as a backup and tell the user.

Look especially for downstream changes that indicate intentional divergence:

- Removal or disabling of ads, telemetry, tracking, analytics, sponsored content, or commercial prompts
- Branding, copy, default settings, provider lists, model availability, feature flags, or environment variable behavior
- Auth, billing, quota, cloud-only behavior, deployment, Docker, or desktop-specific changes
- Security, privacy, licensing, or data retention changes
- Deleted files or code paths that upstream later reintroduces
- Local patches repeated across multiple previous upstream syncs

When intent is unclear, inspect the downstream commits that introduced the change:

```bash
git log --oneline -- <path>
git show <commit> -- <path>
```

## Merge Strategy

Use the least surprising strategy for the user's branch model:

- If the user asks for merge, use `git merge upstream/<branch>`.
- If the user asks for rebase, use `git rebase upstream/<branch>`.
- If the user does not specify, prefer merge for a long-lived fork because it preserves the explicit upstream sync point.

For a user-requested rebase, use this loop:

```bash
git rebase upstream/<branch>
git diff --name-only --diff-filter=U
git diff --check
git add <resolved-files>
git rebase --continue
```

Repeat until Git reports that the rebase completed. After completion, verify the branch relationship:

```bash
git rev-list --left-right --count upstream/<branch>...HEAD
git merge-base --is-ancestor upstream/<branch> HEAD
```

The expected successful rebase shape is `0 N`: no missing upstream commits, with `N` downstream-only commits left on top.

After Git applies changes, inspect both explicit conflicts and silent semantic conflicts:

```bash
git status --short
git diff --name-only --diff-filter=U
git diff
```

For non-conflicting files that touch protected intent areas, compare upstream and downstream behavior manually instead of trusting the auto-merge.

## Decision Policy

Use this policy for every conflict or semantic collision:

| Situation | Default action |
| --- | --- |
| Upstream bug fix clearly compatible with downstream intent | Keep upstream fix and preserve downstream customization |
| Upstream refactor moves code that downstream customized | Port downstream intent onto the new structure |
| Upstream reintroduces code that downstream intentionally removed | Ask the user before keeping or dropping it |
| Upstream changes behavior around ads, telemetry, billing, branding, auth, privacy, or feature flags | Ask the user if downstream intent is not obvious from commits |
| Both sides implement different product behavior | Ask the user which intent should win |
| Conflict is purely mechanical formatting/import drift | Resolve mechanically, then verify behavior |
| Upstream security fix conflicts with downstream removal/customization | Explain the security impact and ask the user how to proceed |

## When To Ask The User

Use the available user-question tool (`ask`, `question`, or the environment's equivalent) when intent conflicts. Do not continue by guessing.

Ask in a compact multiple-choice form with:

- The affected file or feature
- The upstream intent
- The downstream intent
- The practical impact of each choice
- A recommended option only when evidence strongly supports it

Example:

```text
Upstream reintroduced an ad placement in <file>, while downstream previously deleted this ad path.

Choose how to resolve it:
1. Keep downstream intent: continue removing the ad code
2. Accept upstream intent: restore the new upstream ad implementation
3. Hybrid: keep upstream structural changes but leave the ad feature disabled
```

Ask whenever any of these signals appear:

- A deleted downstream feature appears again in upstream
- A downstream-disabled behavior becomes enabled again
- A local default changes back to upstream's default
- A conflict involves product policy rather than code mechanics
- The commit history suggests the downstream change was deliberate, but the desired current behavior is unknown
- The model would need to choose between two valid product directions

## Conflict Resolution Workflow

1. Classify each conflict as mechanical, behavioral, or intent conflict.
2. Resolve mechanical conflicts directly when low risk.
3. For behavioral conflicts, inspect both sides and the downstream commit history.
4. For intent conflicts, ask the user before editing.
5. Apply the chosen resolution with minimal edits.
6. Re-run focused checks for touched areas.
7. Review the final diff for accidental upstream reintroduction of removed behavior.

## Rebase Conflict Patterns From `canary` Sync

Use these examples as reusable patterns, not as hard-coded resolutions:

- **Downstream deletion vs upstream reintroduction**: When a downstream commit is explicitly named like `fix: 删除多余广告`, preserve removed ad/promotion/example entries unless the user says otherwise. Example resolutions include keeping `Jimeng` video starter removed and keeping mobile business/download cells removed.
- **Upstream refactor plus downstream feature gate**: When upstream changes file structure but downstream adds a feature flag, keep the new upstream structure and port the downstream gate into it. Example: keep grouped mobile settings categories while applying `showProvider` to the Provider entry.
- **Parallel feature additions**: When both sides add different entries to the same UI group, keep both when compatible. Example: keep upstream task navigation while preserving downstream `enableMessageChannels` channel gating.
- **Bug fix parameter preservation**: When a downstream bug fix passes a missing runtime parameter, verify whether upstream already fixed it. If not, keep the downstream parameter while preserving upstream's new imports/logic. Example: keep `contextWindowTokens` in `compressionConfig.maxWindowToken` while keeping upstream desktop notification/task code.

## Verification Checklist

After resolving the merge:

- Run targeted tests for touched packages/features when available.
- Run type-check or lint only if the touched scope justifies it and the repository convention supports it.
- Search the final diff for known protected categories: `ad`, `ads`, `sponsor`, `telemetry`, `analytics`, `tracking`, `billing`, `quota`, `cloud`, `auth`, `featureFlag`.
- Check that generated files, lockfiles, migrations, and locale files are either intentionally updated or intentionally untouched.
- Use `git diff --check` to catch whitespace conflict artifacts.
- Inspect `git status --short` and report remaining unmerged or untracked files.
- Confirm upstream ancestry with `git merge-base --is-ancestor upstream/<branch> HEAD`.
- Confirm final upstream divergence with `git rev-list --left-right --count upstream/<branch>...HEAD`; successful alignment should show `0 N`.

## Push And Remote Verification

If the user asks to push the rebased result to `sxueck/lobehub`:

1. Try a normal push first:

```bash
git push origin <branch>
```

2. If Git rejects with `non-fast-forward`, explain that the rebase rewrote local history and ask for explicit approval before running:

```bash
git push --force-with-lease origin <branch>
```

3. After push, verify the local branch and fork remote point to the same commit:

```bash
git rev-parse <branch> origin/<branch>
git rev-list --left-right --count origin/<branch>...<branch>
```

The expected remote-sync shape is `0 0`.

4. Also verify upstream alignment after the push:

```bash
git merge-base --is-ancestor upstream/<branch> <branch>
git rev-list --left-right --count upstream/<branch>...<branch>
```

The expected upstream-sync shape is `0 N`, where `N` is the number of downstream-only commits intentionally retained.

## Post-Rebase Cleanup Hazards

After a force-with-lease push or interrupted command, check for local Git state drift:

```bash
git status --short --branch
git branch -vv
git rev-parse HEAD <branch> origin/<branch> upstream/<branch>
```

If `git status` shows detached `HEAD` or `rebase in progress` even though `<branch>` and `origin/<branch>` are correct, clean the local rebase state carefully:

1. Try `git rebase --abort` only when the user approves cleanup.
2. If abort is blocked because untracked files would be overwritten, protect them first:

```bash
git stash push --include-untracked -m "protect-untracked-before-rebase-abort-$(date +%Y%m%d-%H%M%S)"
git rebase --abort
git stash pop
```

3. If `stash pop` says files already exist and leaves the stash in place, do not drop it automatically. Confirm `git status --short --branch` is clean, report the remaining stash, and ask before deleting it.

## Final Report

When finished, summarize in Chinese for the user:

- Which upstream branch was merged or rebased
- The before/after upstream divergence counts, especially whether final state is `0 N`
- Which downstream intents were preserved
- Which user decisions were requested and what was chosen
- Important files changed
- Verification commands run and their results
- Whether `origin/<branch>` was pushed and verified as `0 0` against the local branch
- Any remaining stash entries or cleanup artifacts
- Any remaining risks or follow-up work

Do not create a commit unless the user explicitly asks for it.
