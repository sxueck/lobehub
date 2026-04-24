---
name: upstream-merge
description: "Controlled upstream synchronization workflow for maintaining sxueck/lobehub from lobehub/lobehub. Use whenever the user asks to merge, pull, rebase, sync, update from upstream, resolve upstream conflicts, or keep a fork aligned with lobehub/lobehub. This skill protects downstream commit intent and requires asking the user when upstream changes conflict with local intentional removals or custom behavior."
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

## Gather Intent Before Merging

Build a concise picture of downstream-only intent before resolving changes:

```bash
git fetch upstream
git log --oneline upstream/<branch>..HEAD
git diff --stat upstream/<branch>...HEAD
git diff upstream/<branch>...HEAD -- <high-risk-paths>
```

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

## Verification Checklist

After resolving the merge:

- Run targeted tests for touched packages/features when available.
- Run type-check or lint only if the touched scope justifies it and the repository convention supports it.
- Search the final diff for known protected categories: `ad`, `ads`, `sponsor`, `telemetry`, `analytics`, `tracking`, `billing`, `quota`, `cloud`, `auth`, `featureFlag`.
- Check that generated files, lockfiles, migrations, and locale files are either intentionally updated or intentionally untouched.
- Use `git diff --check` to catch whitespace conflict artifacts.
- Inspect `git status --short` and report remaining unmerged or untracked files.

## Final Report

When finished, summarize in Chinese for the user:

- Which upstream branch was merged or rebased
- Which downstream intents were preserved
- Which user decisions were requested and what was chosen
- Important files changed
- Verification commands run and their results
- Any remaining risks or follow-up work

Do not create a commit unless the user explicitly asks for it.
