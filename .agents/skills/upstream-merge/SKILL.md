---
name: upstream-merge
description: 'Controlled upstream synchronization workflow for maintaining sxueck/lobehub from lobehub/lobehub. Use whenever the user asks to merge, pull, rebase, sync, selectively update from upstream, review upstream commits, resolve upstream conflicts, force-with-lease push a rebased fork, or verify that a fork is aligned with lobehub/lobehub. This skill first classifies upstream commits into selectable categories, asks the user which categories to merge, protects downstream commit intent, handles dirty-worktree preservation, inspects conflict-side commits before resolving, and requires asking the user when upstream changes conflict with intentional local removals or custom behavior.'
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
- "selectively update from upstream"
- "classify recent upstream commits before merging"
- "帮我选择性合并上游"
- "先检查上游提交再决定合并哪些"
- "上游更新了，帮我合并"

## Operating Principles

1. Preserve downstream intent over mechanical conflict resolution.
2. Prefer small, explicit Git operations that can be inspected and reversed by normal review.
3. Never assume upstream is correct just because it is newer.
4. Never assume downstream is correct when upstream fixes a bug or security issue; compare intent and impact.
5. Ask the user before resolving any explicit conflict marker. Include commit evidence and intent analysis in the question; never choose between valid product directions silently.
6. Keep unrelated dirty working tree changes untouched.
7. Treat push and post-push verification as part of the sync, because a successful local rebase is not enough if the fork remote still points at old history.
8. Treat every conflict marker as a request to identify both the code diff and the commit intent that produced it before editing.
9. Default to selective update for upstream sync requests: classify candidate commits first, ask the user which categories to merge, then apply only the selected scope. Skip this gate only when the user explicitly asks for a full sync or a specific commit/PR.

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
git rev-list --left-right --count upstream/ < branch > ...HEAD
git log --oneline --decorate --left-right --cherry-pick upstream/ < branch > ...HEAD
```

Interpret `A B` from `rev-list --left-right --count upstream/<branch>...HEAD` as: `A` commits only on upstream, `B` commits only on the current branch.

## Selective Update Gate

Use this gate before every upstream merge/rebase by default. The goal is to reduce incompatibilities from high-frequency upstream commits by making the merge scope explicit. Skip the gate only when the user explicitly asks for a full sync or names exact commits/PRs to apply.

1. Fetch and list candidate upstream commits without applying them:

```bash
git fetch upstream
git log --format='%h%x09%ad%x09%an%x09%ae%x09%s' --date=short HEAD..upstream/<branch>
git show --stat --format='commit %h%nAuthor: %an <%ae>%nSubject: %s%n' <candidate-commits>
```

2. Classify commits by practical impact, not only by commit prefix. A `style` or `docs` commit may still be high-risk if it deletes settings, rewrites routes, or changes runtime behavior.

3. Group commits into these categories:

| Category | Default recommendation | Typical signals |
| --- | --- | --- |
| Critical fixes | Merge soon | Security, data loss, runtime errors, provider protocol fixes, build blockers |
| Runtime/model compatibility | Merge soon | `agent-runtime`, `model-runtime`, `context-engine`, provider SDK behavior, tool-call schema fixes |
| Self-hosting and deployment | Case-by-case | Docker, env vars, auth, server config, database, cloud-only behavior |
| Agent/task/bot architecture | Ask before merging | `agentSignal`, task lifecycle, QStash, bot routing, heterogeneous agent, workflow execution |
| Product/UI behavior | Optional | conversation UX, command menu, settings UI, navigation, scroll state |
| Provider/model catalog | Optional unless used | model cards, pricing, provider names, discount metadata |
| Docs/chore/style | Usually defer | docs, comments, formatting, package version sync, visual-only style changes |
| Conflict-prone downstream areas | Ask before merging | ads/promotions, examples, feature gates, branding, auth defaults, provider enablement, admin settings |

4. Produce a short category report before applying changes. Include:

- Category name and merge recommendation
- Commit count and representative commit hashes
- Why it matters for this fork
- Expected conflict risk: low / medium / high
- Known downstream intents that may be touched

5. Ask the user to choose categories before merging. Use a compact multiple-choice question where possible:

```text
Upstream has <N> candidate commits. I grouped them by merge value and conflict risk.

Choose what to merge now:
1. Critical fixes + runtime/model compatibility only (recommended for stability)
2. Add self-hosting/deployment changes too
3. Add agent/task/bot architecture changes too
4. Full upstream sync
5. Do not merge yet; only report the classification
```

6. If the user chooses a subset, prefer cherry-picking mergeable commits or merge/rebase only an explicit integration branch that contains the chosen commits. Do not silently include unrelated upstream categories.

7. If a chosen commit depends on deferred commits, explain the dependency and ask whether to include the dependency category, skip the commit, or do a full sync. Do not guess.

8. If the requested subset is too intertwined to cherry-pick safely, propose a safer batch boundary such as "all runtime/model fixes from this date range" or "everything up to PR #<id> except docs/style".

## Selective Merge Execution

After the user chooses categories:

1. Create or identify an integration path that keeps selection reviewable:

```bash
git switch -c sync/<branch>-selective-<date>
```

Use the existing branch only if the user explicitly asked to apply directly there.

2. Apply chosen commits in chronological order when cherry-picking:

```bash
git cherry-pick <oldest-chosen-commit> ... <newest-chosen-commit>
```

3. Stop on the first conflict and follow the conflict resolution workflow. For subset updates, inspect whether the conflict comes from a deferred dependency before editing.

4. After a successful subset update, report both selected and deferred categories so the user knows what was intentionally left behind.

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

For conflicts, also inspect side-specific commit history instead of relying only on the merged worktree:

```bash
git log --oneline --left-right --cherry-pick upstream/<branch>...HEAD -- <path>
git log --oneline -- <path>
git show <candidate-downstream-commit> -- <path>
git show <candidate-upstream-commit> -- <path>
```

The goal is to summarize the intent behind each side in plain language, not just describe the text differences.

## Merge Strategy

Use the least surprising strategy for the user's branch model:

- If the user asks for selective update, category-based merging, commit review before merging, or a generic upstream merge, run the Selective Update Gate first and do not apply upstream changes until the user chooses categories.
- If the user explicitly asks for full merge, use `git merge upstream/<branch>`.
- If the user explicitly asks for full rebase, use `git rebase upstream/<branch>`.
- If the user asks for full sync but does not specify merge or rebase, prefer merge for a long-lived fork because it preserves the explicit upstream sync point.
- If the user only says upstream has new commits or asks whether to keep following upstream, treat it as selective update, not full sync.

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
git rev-list --left-right --count upstream/ < branch > ...HEAD
git merge-base --is-ancestor upstream/ < branch > HEAD
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

| Situation                                                                                           | Default action                                                |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Upstream bug fix clearly compatible with downstream intent                                          | Keep upstream fix and preserve downstream customization       |
| Upstream refactor moves code that downstream customized                                             | Port downstream intent onto the new structure                 |
| Upstream reintroduces code that downstream intentionally removed                                    | Ask the user before keeping or dropping it                    |
| Upstream changes behavior around ads, telemetry, billing, branding, auth, privacy, or feature flags | Ask the user if downstream intent is not obvious from commits |
| Both sides implement different product behavior                                                     | Ask the user which intent should win                          |
| Conflict is purely mechanical formatting/import drift                                               | Resolve mechanically, then verify behavior                    |
| Upstream security fix conflicts with downstream removal/customization                               | Explain the security impact and ask the user how to proceed   |

## When To Ask The User

Use the available user-question tool (`ask`, `question`, or the environment's equivalent) before resolving any explicit conflict marker. Do not continue by guessing. Purely mechanical conflicts may be grouped into one question only when they share the same cause, same affected intent, and same proposed resolution.

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

Ask whenever any of these signals appear, and also ask for every explicit conflict even if the likely resolution looks mechanical:

- A deleted downstream feature appears again in upstream
- A downstream-disabled behavior becomes enabled again
- A local default changes back to upstream's default
- A conflict involves product policy rather than code mechanics
- The commit history suggests the downstream change was deliberate, but the desired current behavior is unknown
- The model would need to choose between two valid product directions
- A conflict is tied to a downstream commit with an explicit intent-bearing message such as deleting ads, disabling examples, changing feature gates, branding, auth, billing, privacy, or default behavior
- A conflict appears mechanical but the related commits have product-facing messages or touch product-facing files

For each conflict question, include the relevant commit evidence and your intent judgment:

```text
Conflict in <file>:
- Upstream side: <commit short sha + subject>; practical effect: <what changes>
- Downstream side: <commit short sha + subject>; practical effect: <what changes>
- Intent judgment: <mechanical / behavioral / downstream protected intent / upstream bugfix / unclear>
- Risk: <what could break or be reintroduced>

Choose how to resolve it:
1. Preserve downstream intent: <effect>
2. Accept upstream intent: <effect>
3. Hybrid: <effect>
```

## Conflict Resolution Workflow

Use tools in this order so conflict handling is repeatable and reviewable:

1. List all unresolved files:

```bash
git diff --name-only --diff-filter=U
```

2. For each unresolved file, inspect the three Git index stages before deciding:

```bash
git show :1:<path>   # merge base
git show :2:<path>   # ours / current downstream branch
git show :3:<path>   # theirs / upstream side
```

3. Inspect the worktree conflict context with a file read and search for conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`). Do not edit before understanding the surrounding function or component.

4. Identify likely intent-bearing commits for both sides:

```bash
git log --oneline --left-right --cherry-pick upstream/<branch>...HEAD -- <path>
git log --oneline -- <path>
git show <commit> -- <path>
```

5. Classify each conflict as mechanical, behavioral, or intent conflict:
   - Mechanical: imports, formatting, renamed files, moved code with no behavior change.
   - Behavioral: execution path, feature visibility, defaults, routing, model/provider availability, auth, billing, privacy, telemetry, ads, examples, or generated user-facing content.
   - Intent conflict: either side's commit message or diff shows a deliberate product choice.

6. Ask the user with commit evidence and intent judgment before editing any conflict. Do this even when the recommended option is obvious; the user's choice is the authority for preserving downstream intent. If several conflict hunks are purely mechanical and have the same cause, ask once with the grouped file list and shared commit evidence.

7. Apply the chosen resolution with the smallest manual edit. Use `apply_patch` for hand edits. Avoid whole-file rewrites unless the file is tiny and the final content has been inspected. Never use broad text replacement across conflict markers.

8. After editing each file, verify it locally:

```bash
git diff --check
git diff --name-only --diff-filter=U
```

Also search the resolved file for conflict markers. If markers remain, do not stage the file.

9. Stage only resolved files:

```bash
git add <resolved-files>
```

10. Review the final staged diff for accidental upstream reintroduction of removed behavior before continuing the merge or rebase.

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

- If selective update was used, which categories were selected and which categories were deferred
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
