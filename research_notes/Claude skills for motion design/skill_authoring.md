# Authoring a High-Quality "Taste" Skill (SKILL.md) for Motion Design

Research date: 2026-10-19. Primary sources: Anthropic docs (platform.claude.com, code.claude.com), the anthropics/skills and anthropics/claude-code repos (read directly from git, including commit history), the Agent Skills spec repo, Remotion's skills repo (commit 1441a11, 2026-10-16), Emil Kowalski's skills repo (commit 2d22863, 2026-10-11), and LottieFiles' motion-design-skill (commit f9a8a04, 2026-05-18).

Source key (the URLs cited below):
- BP = [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- CC = [Claude Code: Extend Claude with skills](https://code.claude.com/docs/en/skills)
- SPEC = [Agent Skills specification](https://agentskills.io/specification) (read from [the spec repo](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx) because agentskills.io did not resolve from this environment)
- ENG = [Anthropic Engineering: Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) (Oct 16, 2025)
- FD = [anthropics/skills frontend-design SKILL.md](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) (identical to the [claude-code plugin copy](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md) as of 2026-10-19)
- SC = [anthropics/skills skill-creator SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)

---

## 1. Official structure: frontmatter, progressive disclosure, locations, size limits, triggering

### Takeaway
A skill is a folder with a `SKILL.md` (YAML frontmatter plus a markdown body) and optional `scripts/`, `references/` and `assets/`. Only `name` and `description` are always in context, so the description is the trigger. Anthropic and the spec both say to keep the SKILL.md body under 500 lines (the spec adds "< 5000 tokens") and to push detail into reference files one level deep. In Claude Code, skills live in `.claude/skills/` (project, committed), `~/.claude/skills/` (personal), plugins, or enterprise managed settings. Claude Code adds many optional frontmatter fields (`allowed-tools`, `disable-model-invocation`, `context: fork`, `paths`, `hooks`, etc.).

### Cited Findings

**What a skill is**
- Skills are "organized folders of instructions, scripts, and resources that agents can discover and load dynamically", and "A skill is a directory containing a SKILL.md file." ENG adds: "Building a skill for an agent is like putting together an onboarding guide for a new hire." — [ENG](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- Anthropic published Agent Skills as an open standard (update dated Dec 18, 2025) "for cross-platform portability." — [ENG](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills); [Claude blog, Dec 18 2025](https://claude.com/blog/organization-skills-and-directory)

**Frontmatter fields (cross-platform spec)**
- SPEC field table:
  - `name` (required): "Max 64 characters. Lowercase letters, numbers, and hyphens only. Must not start or end with a hyphen."
  - `description` (required): "Max 1024 characters. Non-empty. Describes what the skill does and when to use it."
  - `license` (optional).
  - `compatibility` (optional): "Max 500 characters. Indicates environment requirements", for example "Requires Python 3.14+ and uv". The spec also notes "Most skills do not need the `compatibility` field."
  - `metadata` (optional): an arbitrary string-to-string map.
  - `allowed-tools` (optional): "Space-separated string of pre-approved tools the skill may use. (Experimental)."
  - [SPEC](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx)
- BP adds Anthropic-specific constraints. `name` "Cannot contain XML tags" and "Cannot contain reserved words: 'anthropic', 'claude'". `description` must also contain no XML tags. — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- BP on naming: "Consider using **gerund form**", for example `processing-pdfs`. Noun phrases (`pdf-processing`) are acceptable. Avoid vague names like `helper` and `utils`. — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**Frontmatter fields (Claude Code extensions)**
- CC lists `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `background`, `paths` (for example `"src/api/**"`, to "Limit automatic loading to matching files"), `shell` and `hooks`. Also: "All fields are optional. Only `description` is recommended. Unrecognized fields are ignored without an error, so check spelling." — [CC](https://code.claude.com/docs/en/skills)
- Invocation control:
  - `disable-model-invocation: true` means only the user can invoke the skill, and its description is not loaded into context.
  - `user-invocable: false` means only Claude can invoke it.
  - CC: "Use `disable-model-invocation: true` for side-effecting workflows like deploys. Use `user-invocable: false` for background knowledge."
  - [CC](https://code.claude.com/docs/en/skills)
- String substitutions include `$ARGUMENTS`, `$0`/`$1`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}` and `${CLAUDE_PLUGIN_ROOT}`. CC's example pre-approves a bundled script: `allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/render.sh *)`. — [CC](https://code.claude.com/docs/en/skills)
- Dynamic context injection: `` !`<command>` `` "runs a shell command before Claude sees the skill, and the output replaces the placeholder." A non-zero exit "fails the whole skill", so CC advises appending `|| true` to commands that may legitimately exit non-zero. — [CC](https://code.claude.com/docs/en/skills)

**Progressive disclosure (three levels)**
- SPEC:
  1. "Metadata (~100 tokens): The `name` and `description` fields are loaded at startup for all skills."
  2. "Instructions (< 5000 tokens recommended): The full `SKILL.md` body is loaded when the skill is activated."
  3. "Resources (as needed)."
  - SPEC also says: "Keep your main `SKILL.md` under 500 lines."
  - [SPEC](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx)
- BP: "Keep SKILL.md body under 500 lines for optimal performance". It also says "Keep references one level deep from SKILL.md". On nested references, Claude "might use commands like `head -100` to preview content rather than reading entire files." For reference files over 100 lines, "include a table of contents at the top." — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- BP: scripts "can be executed through bash without loading their full contents into context. Only the script's output consumes tokens." Reference files, data or docs "don't consume context tokens until actually read". — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- BP pattern "Domain-specific organization": `reference/finance.md`, `reference/sales.md` and so on, so Claude loads only the relevant domain. — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- SC's version of the levels: "Metadata (name + description) - Always in context (~100 words)", "SKILL.md body - In context whenever skill triggers (<500 lines ideal)", "Bundled resources - As needed (unlimited, scripts can execute without loading)". — [SC](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)

**Context lifecycle in Claude Code (relevant to long motion sessions)**
- Once loaded, the skill stays in context. CC: "Once a skill loads, its content stays in context across turns" and "Claude Code does not re-read the skill file on later turns, so write guidance that should apply throughout a task as standing instructions rather than one-time steps." — [CC](https://code.claude.com/docs/en/skills)
- After auto-compaction, Claude Code re-attaches each invoked skill but keeps "the first 5,000 tokens of each", within "a combined budget of 25,000 tokens". The advice: "put the most important instructions near the top of `SKILL.md`." — [CC](https://code.claude.com/docs/en/skills)
- For a rule that must always hold: "move the rule into a hook". It can live in the skill's `hooks` frontmatter. — [CC](https://code.claude.com/docs/en/skills)

**Where skills live (Claude Code)**
- Enterprise: managed settings directory. Personal: `~/.claude/skills/<name>/SKILL.md`, which applies to "All your projects on this machine". Project: `.claude/skills/<name>/SKILL.md`, which applies to "Sessions in this repository. Commit it so your team gets it too". Plugin: `<plugin>/skills/<name>/SKILL.md`, invoked as `/plugin-name:skill-name`. Precedence: "Enterprise over personal, and personal over project". Nested `.claude/skills/` directories in subdirectories load on demand. — [CC](https://code.claude.com/docs/en/skills)
- Claude Code watches skill directories and "picks up the change within the current session, without a restart". Use `/reload-skills` for a newly created top-level skills directory. — [CC](https://code.claude.com/docs/en/skills)
- Skills synced from claude.ai are downloaded into a separate `synced` subfolder of `~/.claude/skills/`. — [CC](https://code.claude.com/docs/en/skills)

**How descriptions drive triggering**
- BP: "At startup, only the metadata (name and description) from all Skills is pre-loaded." Claude "uses it to choose the right Skill from potentially 100+ available Skills." BP's rule: "Always write in third person. The description is injected into the system prompt, and inconsistent point-of-view can cause discovery problems." A description should state "both what the Skill does and when to use it." — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- CC: "the combined `description` and `when_to_use` text is truncated at 1,536 characters in the skill listing". With many skills, "Claude Code drops some descriptions to fit the listing's character budget", and "The budget scales at 1% of the model's context window", dropping the least-invoked skills first. The budget is configurable via `skillListingBudgetFraction` or `SLASH_COMMAND_TOOL_CHAR_BUDGET`. — [CC](https://code.claude.com/docs/en/skills)
- SC: "currently Claude has a tendency to 'undertrigger' skills -- to not use them when they'd be useful. To combat this, please make the skill descriptions a little bit 'pushy'." Its example adds "Make sure to use this skill whenever the user mentions dashboards, ... even if they don't explicitly ask for a 'dashboard.'" — [SC](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- SC: "Claude only consults skills for tasks it can't easily handle on its own — simple, one-step queries ... may not trigger a skill even if the description matches perfectly." — [SC](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- CC troubleshooting:
  - Not triggering: "Check the description includes keywords users would naturally say".
  - Malformed YAML: the body loads "with empty metadata", so Claude cannot match the description. Find such files with `claude plugin validate .claude/skills`.
  - Triggering too often: "Make the description more specific", or add `disable-model-invocation: true`.
  - [CC](https://code.claude.com/docs/en/skills)

### Inferences
- A motion skill's description should name the formats and tools the team uses (Remotion, After Effects/Lottie, CSS/Framer Motion/GSAP, "promo video", "logo sting", "social reel", "transition", "easing") and say "even if the user doesn't say 'motion'". Keep the key use case in the first ~200 characters because of truncation.
- Use `paths:` to auto-load the skill only inside the motion/video directory. Put non-negotiable rules (brand colors, safe areas) near the top so they survive compaction. Rules that must never be broken (for example "always render stills before declaring done") can be backed by a `hooks` entry rather than prose alone.

### Gaps
- I could not load agentskills.io directly (DNS failure in this environment). I used the spec's GitHub source, which may lag the website slightly.
- I found no official hard limit on total skill folder size for Claude Code. Upload size limits for claude.ai and the API were not verified in this pass.

---

## 2. Anthropic's "Skill authoring best practices": conciseness, degrees of freedom, examples, checklists, feedback loops, evals, skill-creator

### Takeaway
Anthropic's guidance has six main threads:
- Assume Claude is already smart and add only what it lacks.
- Match "degrees of freedom" to how fragile the task is.
- Use examples, templates and copyable checklists.
- Build validator→fix→repeat feedback loops, including visual analysis of rendered output.
- Write evaluations before the documentation.
- Iterate with a "Claude A writes / Claude B tests" loop.

The skill-creator skill turns this into tooling: parallel with-skill and baseline runs, assertions, a human review viewer, blind A/B comparison, and description-trigger optimization.

### Cited Findings

**Conciseness**
- "The context window is a public good." "**Default assumption:** Claude is already very smart. Only add context Claude doesn't already have." Questions to challenge each piece: "Does Claude really need this explanation?" and "Does this paragraph justify its token cost?" — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**Degrees of freedom**
- High freedom (text heuristics) when "Multiple approaches are valid". Medium (pseudocode or parameterized scripts) when "A preferred pattern exists". Low (exact scripts) when "Operations are fragile and error-prone" or "Consistency is critical". BP's analogy: a "Narrow bridge with cliffs on both sides" needs guardrails, while an "Open field with no hazards" needs only general direction. — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**Examples, templates, defaults**
- "For Skills where output quality depends on seeing examples, provide input/output pairs". "Examples convey the desired style and level of detail to Claude more clearly than descriptions alone." — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- Avoid offering too many options: "Provide a default (with escape hatch)". Use consistent terminology. Avoid time-sensitive information (use an "Old patterns" section instead). — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**Workflows and checklists**
- "For particularly complex workflows, provide a checklist that Claude can copy into its response and check off as it progresses". There is also a non-code example ("Research synthesis workflow"). — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**Feedback loops and visual analysis**
- "**Common pattern:** Run validator → fix errors → repeat. This pattern greatly improves output quality." The validator can be a style guide: "The 'validator' is STYLE_GUIDE.md, and Claude performs the check by reading and comparing." — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- "Use visual analysis: When inputs can be rendered as images, have Claude analyze them". The example converts PDF pages to images with a bundled script. BP: "Claude's vision capabilities help analyze layouts and structures." — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- "Plan-validate-execute": write an intermediate plan file, validate it with a script, then execute. "Make validation scripts verbose with specific error messages". — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**Scripts**
- "Solve, don't defer": scripts should handle errors themselves. Avoid "voodoo constants": "If you don't know the right value, how will Claude determine it?" — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- Pre-made scripts are "More reliable than generated code", "Save tokens" and "Ensure consistency across uses". Say explicitly whether Claude should execute a script or read it as reference. — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- "Avoid assuming tools are installed". Use fully-qualified MCP tool names (`ServerName:tool_name`). — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**Evaluation**
- "**Create evaluations BEFORE writing extensive documentation.**" BP's five steps:
  1. Identify gaps: run Claude without the skill.
  2. Create three scenarios.
  3. Establish a baseline.
  4. "Write minimal instructions".
  5. Iterate.
  - BP's example eval JSON has `skills`, `query`, `files` and `expected_behavior`. BP also notes: "There is not currently a built-in way to run these evaluations."
  - [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- "Develop Skills iteratively with Claude": "Claude A" helps design and refine the skill, and "Claude B" (a fresh instance with the skill loaded) uses it on real tasks. Observe Claude B and bring the observations back to Claude A. Watch for "Unexpected exploration paths", "Missed connections", "Overreliance on certain sections" and "Ignored content". — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- "Test with all models you plan to use". For example: "What works perfectly for Opus might need more detail for Haiku." — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- BP's pre-sharing checklist:
  - "SKILL.md body is under 500 lines"
  - "Examples are concrete, not abstract"
  - "File references are one level deep"
  - "Feedback loops included for quality-critical tasks"
  - "At least three evaluations created"
  - "Tested with Haiku, Sonnet, and Opus"
  - [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- ENG's four practices: "Start with evaluation", "Structure for scale", "Think from Claude's perspective", and "Iterate with Claude" (capture successful approaches and common mistakes, and ask Claude to self-reflect). — [ENG](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

**The skill-creator skill**
- Skill-creator's loop: draft the skill, write 2–3 realistic test prompts into `evals/evals.json`, then "For each test case, spawn two subagents in the same turn — one with the skill, one without". When improving an existing skill, the baseline is a snapshot of the old version. — [SC](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- Subjective skills: "Subjective skills (writing style, design quality) are better evaluated qualitatively — don't force assertions onto things that need human judgment." Programmatically checkable assertions should be checked by a script. — [SC](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- Tooling:
  - `scripts/aggregate_benchmark.py` produces pass rate, time and tokens "with mean ± stddev and the delta".
  - `eval-viewer/generate_review.py` launches a browser viewer with "Outputs" and "Benchmark" tabs where the human leaves per-run feedback.
  - An analyst pass flags "non-discriminating" assertions and flaky, high-variance evals.
  - [SC](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- "Blind comparison: give two outputs to an independent agent without telling it which is which, and let it judge quality. Then analyze why the winner won." This uses `agents/comparator.md` and `agents/analyzer.md`. — [SC](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- Description optimization:
  - Create 20 queries, 8–10 that should trigger and 8–10 that should not. The most valuable negatives are "near-misses".
  - `run_loop.py` splits them "60% train and 40% held-out test", runs "each query 3 times", iterates up to 5 times, and picks `best_description` "selected by test score rather than train score to avoid overfitting".
  - It requires `claude -p`, so it works only in Claude Code.
  - [SC](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- Writing style:
  - "Try to explain to the model why things are important in lieu of heavy-handed musty MUSTs."
  - "If you find yourself writing ALWAYS or NEVER in all caps ... that's a yellow flag."
  - "Look for repeated work across test cases": if every run wrote the same helper script, bundle it in `scripts/`.
  - On overfitting: "if the skill ... works only for those examples, it's useless."
  - [SC](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
- Claude Code plugins can measure triggering with "a `tool_used: Skill` grader" run via `claude plugin eval` after each description change. — [CC](https://code.claude.com/docs/en/skills)

### Inferences
- **Tension in the sources:** BP's iteration example suggests "using stronger language such as 'MUST filter'" when Claude B misses a rule. SC treats all-caps MUST/NEVER as a yellow flag and prefers explaining the why. Reconciliation: give the reasoning first. Reserve hard MUSTs for objectively checkable constraints (brand hex values, safe area, fps). Never use them for taste.
- For a motion skill, the "baseline" comparison is especially informative because Claude's default motion has recognizable tells. Running 3–5 representative briefs with and without the skill and reviewing rendered stills or videos side by side (or blind) is the most direct evidence that the skill helps.

### Gaps
- BP gives no numeric guidance on how many examples are optimal, and none on whether to include image or video examples (as opposed to code) in a skill.
- I found no Anthropic-published quantitative results showing how much a design or taste skill improves output.

---

## 3. How Anthropic's frontend-design skill fights "AI slop", and how that transfers to motion

### Takeaway
The frontend-design skill has gone through four versions in anthropics/skills (Dec 2025 → Jun 2026 → Sep 2026). It moved from a bold, maximalist "commit to an extreme aesthetic / NEVER use Inter or purple gradients" prompt to a more calibrated design-studio brief. The current version:
- grounds the design in the subject matter;
- lists concrete "tells" with hex values;
- requires a written token plan that is reviewed against the brief before coding;
- says "spend your boldness in one place";
- self-critiques via screenshots.

It explicitly calls "fade-and-slide-up entrances on each section and hover transitions on every card" the generic AI default.

### Cited Findings

**Original version** (first commit in anthropics/skills, ef74077, 2025-12-01; the skill shipped earlier in the claude-code plugin)
- Opening and description:
  - Description: "Create distinctive, production-grade frontend interfaces ... that avoids generic AI aesthetics".
  - Opening: "This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic 'AI slop' aesthetics."
  - [frontend-design @ ef74077](https://github.com/anthropics/skills/blob/ef74077/skills/frontend-design/SKILL.md)
- Committing to a direction:
  - "Before coding, understand the context and commit to a BOLD aesthetic direction".
  - "**Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine...".
  - "**Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?"
  - "the key is intentionality, not intensity."
  - [frontend-design @ ef74077](https://github.com/anthropics/skills/blob/ef74077/skills/frontend-design/SKILL.md)
- Banned defaults: "NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns". Also: "NEVER converge on common choices (Space Grotesk, for example) across generations." — [frontend-design @ ef74077](https://github.com/anthropics/skills/blob/ef74077/skills/frontend-design/SKILL.md)
- Motion in the original: "Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise." — [frontend-design @ ef74077](https://github.com/anthropics/skills/blob/ef74077/skills/frontend-design/SKILL.md)
- Matching complexity: "Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code ... Minimalist or refined designs need restraint, precision". — [frontend-design @ ef74077](https://github.com/anthropics/skills/blob/ef74077/skills/frontend-design/SKILL.md)

**June 2026 rewrite** (2235be7, #1293)
- New persona: "Approach this as the design lead at a small studio known for giving every client a visual identity that could not be mistaken for anyone else's. This client has already rejected proposals that felt templated".
- Named the three clustered "looks" (cream + serif + terracotta; near-black + acid-green; broadsheet).
- Required a "Signature: the single unique element this page will be remembered by".
- Motion caution added: "sometimes less is more, and extra animation contributes to the feeling that the design is AI-generated."
- [frontend-design @ 2235be7](https://github.com/anthropics/skills/blob/2235be7/skills/frontend-design/SKILL.md)

**Current version** (41bbe19, 2026-09-03, "Update frontend-design skill to avoid generic design defaults (#1713)")
- Grounding:
  - "If the brief does not identify what the product or subject matter is, identify it yourself before designing, and confirm with the client."
  - "The subject's industry, subject matter, materials, and vernacular are where distinctive visual choices come from".
  - [FD](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- Calibration list. "AI-generated design right now clusters around some traits":
  1. a warm cream background (near #F4F1EA) with a terracotta accent ("often near #D97757 — Anthropic's own Claude-interaction accent, so on a user's brief it reads as a tell");
  2. near-black with acid-green or vermilion;
  3. broadsheet hairlines;
  4. "the SaaS-card kit ... the same soft grey shadow (rgba(0,0,0,.1))";
  5. "template chrome": tracked-out ALL-CAPS eyebrows, "meta strings joined with middle dots", "a '→' appended to link and button text".
  - [FD](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- Defaults versus choices: "All traits are legitimate for some briefs, but they are defaults rather than choices ... Where the brief pins down a visual direction, follow it exactly — the brief's own words always win ... Where it leaves an axis free, don't spend that freedom on one of these defaults." — [FD](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- Typography tells: "Avoid these default typographic treatments; they are the commonest tells of a generated page". Examples include accenting a single word in a headline and all-caps labels. — [FD](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- **Motion rule (most transferable):** "Use non-user-triggered motion sparingly and deliberately, only to draw attention. A single orchestrated moment — one page-load sequence or one reveal — lands better than scattered effects; fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as AI-generated. Motion that answers a person's action (opening, expanding, confirming) is welcome when it shows what changed." — [FD](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- Process:
  - "Work in two passes. First, brainstorm a short design plan ... create a compact token system with color, type, layout, and principles", with color as "4–6 named hex values" and layout ideated with ASCII wireframes.
  - "Then review that plan against the brief before building: if any part of it reads like the generic default you would produce for any similar page (work through a similar prompt to see if you arrive somewhere similar) ... revise that part, say what you changed and why."
  - [FD](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- Restraint and critique:
  - "Spend your boldness in one place. Let one element be the memorable thing, keep everything around it quiet and disciplined".
  - Quality floor includes "reduced motion respected".
  - "Critique your own work as you build, taking screenshots to review if your environment supports it — a picture is worth 1000 tokens."
  - "Consider Chanel's advice: ... remove one accessory."
  - "if you have a space to quickly jot down notes about what you've tried, it can help you in future passes."
  - [FD](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)

### Inferences (transfer to motion)
- **Pattern 1: persona plus stakes.** Example: "motion director at a studio whose client rejected templated reels". This gives Claude a taste bar without long rule lists.
- **Pattern 2: ground in subject.** Derive motion vocabulary from the product's physical world. A banking app moves like ledgers and stamps. A food brand moves like steam, pours and slices.
- **Pattern 3: an explicit, dated "motion tells" calibration list** (motion analogues of FD's list):
  - fade+slide-up on every element;
  - uniform 300ms ease-in-out everywhere;
  - identical stagger on every list;
  - scale-from-0 pops;
  - bouncy overshoot on everything;
  - glow and particle backgrounds as decoration;
  - kinetic-type word-by-word reveals by default;
  - whoosh transitions between every scene.
  - Frame each one, as FD does, as "a default, not a choice — legitimate if the brief asks".
- **Pattern 4: a two-pass plan.** Write a motion token plan (signature easing, duration palette, entrance pattern, one "signature moment") and a storyboard as ASCII or beat sheet. Review it against the brief for genericness before writing code.
- **Pattern 5: one orchestrated moment.** "Spend your boldness in one place": one hero transition per piece, with everything else quiet.
- **Pattern 6: visual self-critique.** Render stills or contact sheets and look at them, the video equivalent of FD's screenshot advice.
- The skill's own evolution shows that hard bans like "NEVER use Inter" were replaced over time with calibrated "these are defaults; the brief wins" language. That suggests ban lists should be framed as calibration, not absolute prohibitions.

### Gaps
- I could not confirm the exact date the skill first shipped in the claude-code plugin repo, because the GitHub API was not accessible. The anthropics/skills history starts 2025-12-01 after a folder move.
- Anthropic has not published eval data showing how much frontend-design improves outputs.

---

## 4. Patterns from other strong taste/design skills (Remotion, brand-guidelines, canvas-design, algorithmic-art, slack-gif-creator, Emil Kowalski, LottieFiles)

### Takeaway
Strong taste skills combine four things:
1. A short SKILL.md that routes to per-topic rule files.
2. Concrete numeric tables (durations, easings, sizes) instead of adjectives.
3. Explicit anti-pattern lists ("escalation triggers") with a remedial hierarchy.
4. A self-review step: checklists, a separate strict review skill, or render-and-look.

Remotion's skills are a router plus dozens of topic files. Emil Kowalski splits construction (`animate`) from critique (`review-animations`, "Default to flagging; approval is earned") and keeps exact values in a STANDARDS.md. LottieFiles uses a philosophy-first SKILL.md with personality archetypes and a severity-tiered checklist. Anthropic's canvas-design and algorithmic-art use a "write a design philosophy first, then express it" two-step plus a mandated refinement pass.

### Cited Findings

**Remotion** ([remotion-dev/skills](https://github.com/remotion-dev/skills), installed with `npx skills add remotion-dev/skills`)
- Structure:
  - 12 skills: `remotion-best-practices` ("Router for all Remotion skills"), `remotion-create`, `remotion-markup`, `remotion-render`, `remotion-captions`, `remotion-maps` and others.
  - `remotion-markup/SKILL.md` links out to ~40 topic files (`timing.md`, `transitions.md`, `motion-blur.md`, `google-fonts.md`, `measuring-text.md`, `multi-scene-video.md`), each loaded only "When needing to…".
  - The maps sub-skill bundles `assets/tokens.ts`, sample data and `scripts/prep-geo.mjs`.
  - [remotion-dev/skills](https://github.com/remotion-dev/skills)
- Hard technical rules with reasons:
  - "Drive animations using `useCurrentFrame()` and `interpolate()`. CSS `transition` or `animation` will not render correctly".
  - "Tailwind animation class will not render correctly".
  - "Use `Easing.bezier()` and `Easing.spring()` to customize timing".
  - 👍/👎 code pairs show the preferred style.
  - [remotion-markup SKILL.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md)
- Taste rules for video layout ([video-layout.md](https://github.com/remotion-dev/skills/blob/main/skills/remotion-create/video-layout.md)):
  - "You are designing a video, not a webpage."
  - "Decide what the viewer should notice first in each scene. Build the frame around that one thing."
  - Safe area: "keep key text at least 80px from the sides and 100px from the top and bottom" (for 1080px-wide).
  - "Do not add redundant elements."
  - Minimum sizes: "Main headline: 84px", "Important supporting text: 44px".
- Verification: "When a visual check is useful, open the Remotion Studio ... You can also use Rendering to inspect one or several frames as images." The render skill gives `npx remotion still` and `npx remotion render [composition-id] out/frames --frames=0,30,90 --image-format=png`. — [remotion-markup](https://github.com/remotion-dev/skills/blob/main/skills/remotion-markup/SKILL.md); [remotion-render](https://github.com/remotion-dev/skills/blob/main/skills/remotion-render/SKILL.md)
- Preview-first and preserving edits:
  - "Open the preview before building the video ... Keep Studio running while you work so the user can see changes as they appear and steer the result."
  - "Users may make edits in the code outside of the conversation. If you detect a surprising change ... don't overwrite it".
  - [remotion-create](https://github.com/remotion-dev/skills/blob/main/skills/remotion-create/SKILL.md); [remotion-best-practices](https://github.com/remotion-dev/skills/blob/main/skills/remotion-best-practices/SKILL.md)
- Remotion's frontmatter descriptions are terse ("Content, animation and effects best practices") and carry a `version: 4.0.536` field. — [remotion-dev/skills](https://github.com/remotion-dev/skills)

**Emil Kowalski** ([emilkowalski/skills](https://github.com/emilkowalski/skills))
- Premise: "Agents don't have great taste ... An `ease-in` easing for an enter animation when it's supposed to be `ease-out` ... these skills list all the little mistakes agents can potentially make and explain how to fix them." — [README](https://github.com/emilkowalski/skills/blob/main/README.md)
- One job per skill, with descriptions that cross-reference each other. `animate` "does ONE thing", and its description ends "For critiquing existing motion use review-animations; for auditing a whole codebase use improve-animations." Opinionated skills like `review-animations`, `prototype` and `pick-ui-library` use `disable-model-invocation: true` so they run only when explicitly invoked. — [animate](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md); [review-animations](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md)
- `animate` hard rules:
  - "Steps 1 and 2 gate everything. Don't reach for a curve before you know whether it animates at all."
  - "No approximated values. Every curve, duration, and spring config comes from the tables below."
  - "Extend the codebase's tokens, don't fork them."
  - "Never present motion options as a menu. Make the call, state the reasoning in one line, write the code."
  - It names "Animating something that shouldn't animate" as the worse of two failure modes.
  - [animate](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md)
- `review-animations` structure:
  - "Ten Non-Negotiable Standards": justified motion; frequency-appropriate; "`ease-in` on UI is a block"; "UI animations stay under 300ms"; "Never animate from `scale(0)` — start from `scale(0.9–0.97)` + opacity"; interruptibility; GPU-only properties; reduced motion; asymmetric enter/exit; cohesion.
  - "Aggressive Escalation Triggers" (for example `transition: all`, "Everything-at-once entrance where a 30–80ms stagger belongs").
  - A "Remedial Preference Hierarchy" whose first step is "Delete the animation".
  - A required Before/After/Why table, and an explicit Block/Approve verdict.
  - [review-animations](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md)
- Exact values live in [STANDARDS.md](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md):
  - Frequency table: "100+ times/day ... No animation. Ever."
  - Easing decision order.
  - Named curves: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`.
  - Duration table: button press 100–160ms; tooltips 125–200ms; dropdowns 150–250ms; modals and drawers 200–500ms; "Marketing / explanatory — Can be longer".
- `emil-design-eng` (674 lines, over BP's 500-line guidance) opens with philosophy ("Taste is trained, not innate", "Unseen details compound", "Beauty is leverage") before the rules. — [emil-design-eng](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md)

**LottieFiles motion-design-skill** ([lottiefiles/motion-design-skill](https://github.com/lottiefiles/motion-design-skill))
- Tool-agnostic description: "Use when creating animations, transitions, micro-interactions, loading states, page transitions, scroll-triggered effects, or any motion work. Works with CSS, Framer Motion, GSAP, Lottie, Spring, or any animation system." — [SKILL.md](https://github.com/lottiefiles/motion-design-skill/blob/main/skills/motion-design/SKILL.md)
- Structure: a 315-line SKILL.md plus `director/` files (core-philosophy, motion-personality, emotion-mapping, choreography, disney-principles, narrative-structure), `patterns/` (entrance-exit, state-feedback, ambient-continuous, multi-element) and `reference/` (timing-easing-tables, property-selection, quality-checklist, troubleshooting). — [repo tree](https://github.com/lottiefiles/motion-design-skill)
- Content highlights:
  - An "8-Step Checklist" ("Emotional target?", "Motion Personality?" ...).
  - "Three Pillars": Emotional Intent / Visual Narrative / Motion Craft.
  - "Three motion layers (flat animation = missing layers)": Primary, Secondary, Ambient.
  - "Select ONE archetype per project" from a table: Playful 150–300ms ease-out-back with 10–20% overshoot; Premium 350–600ms `cubic-bezier(0.4,0,0.2,1)`; Corporate; Energetic.
  - "Brand Motion Identity — define three constants: Signature easing: One curve for 80% of animations; Duration palette: 3 durations; Entrance pattern".
  - [SKILL.md](https://github.com/lottiefiles/motion-design-skill/blob/main/skills/motion-design/SKILL.md)
- Quality checklist ([quality-checklist.md](https://github.com/lottiefiles/motion-design-skill/blob/main/skills/motion-design/reference/quality-checklist.md)):
  - "1/3 rule (distance): no unbroken motion >1/3 container"
  - "max 1/3 elements active simultaneously"
  - "No linear easing on spatial movement"
  - "Stagger total <500ms"
  - "Appropriate on 100th viewing"
  - "Animations >5s are pausable"
  - Severity tiers (CRITICAL / HIGH).

**Anthropic canvas-design and algorithmic-art** (two-step philosophy then expression)
- canvas-design:
  - Step one: "Design Philosophy Creation (.md file)", then "Express by creating it on a canvas".
  - Name the movement ("Brutalist Joy" / "Chromatic Silence") and write 4–6 paragraphs.
  - "Leave creative space".
  - Mandated refinement: "The user ALREADY said 'It isn't perfect enough...'" and "avoid adding more graphics; instead refine what has been created ... If the instinct is to call a new function or draw a new shape, STOP and instead ask: 'How can I make what's already here more of a piece of art?'"
  - "Nothing falls off the page and nothing overlaps ... This is non-negotiable."
  - It bundles a `./canvas-fonts` directory.
  - [canvas-design](https://github.com/anthropics/skills/blob/main/skills/canvas-design/SKILL.md)
- algorithmic-art:
  - Same philosophy-first structure.
  - "STEP 0: READ THE TEMPLATE FIRST ... Use that file as the LITERAL STARTING POINT ... Keep all FIXED sections exactly as shown ... Replace only the VARIABLE sections", with ✅/❌ lists.
  - Mandated seeded randomness for reproducibility.
  - [algorithmic-art](https://github.com/anthropics/skills/blob/main/skills/algorithmic-art/SKILL.md)
- Both skills' instruction to repeatedly stress craftsmanship ("meticulously crafted", "master-level execution") is the older "intensity" style that SC now cautions against (all-caps MUSTs as a yellow flag). — [canvas-design](https://github.com/anthropics/skills/blob/main/skills/canvas-design/SKILL.md); [SC](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)

**Anthropic brand-guidelines (tokens as data)**
- Lists exact hex tokens with roles: "Dark: `#141413` - Primary text and dark backgrounds", "Orange: `#d97757` - Primary accent".
- Specifies typography with fallbacks ("Headings: Poppins (with Arial fallback)").
- States application rules ("Non-text shapes use accent colors", "Cycles through orange, blue, and green accents").
- Its description includes trigger terms: "Use it when brand colors or style guidelines, visual formatting, or company design standards apply."
- [brand-guidelines](https://github.com/anthropics/skills/blob/main/skills/brand-guidelines/SKILL.md)

**Anthropic slack-gif-creator (motion with validators)**
- Hard constraints up front: "Emoji GIFs: 128x128", "FPS: 10-30", "Duration: Keep under 3 seconds".
- Ships Python helpers `core/gif_builder.py`, `core/easing.py`, `core/frame_composer.py` and `core/validators.py`, used through a short "Core Workflow" code block.
- [slack-gif-creator](https://github.com/anthropics/skills/blob/main/skills/slack-gif-creator/SKILL.md)

### Inferences
- The best motion skills replace adjectives ("smooth", "snappy") with lookup tables of exact curves and durations. They also tell Claude not to invent values (Emil's "No approximated values").
- Splitting "make" and "review" into separate skills (Emil), or at least separate phases, lets the review apply a stricter, adversarial posture ("Default to flagging"). That posture would be diluted if it lived inside the build instructions.
- For a team motion skill:
  - Lottie's "three constants" (signature easing, 3-duration palette, entrance pattern) map directly onto brand motion tokens.
  - Remotion's safe-area and minimum-type-size numbers are a ready template for video-specific rules.
  - The canvas-design "refine, don't add" final pass maps onto "remove one animation" (Chanel's rule in FD).

### Gaps
- Emil Kowalski's "Agents with Taste" essay (emilkowal.ski) could not be fetched from this environment (DNS failure). Its arguments are represented only through his repo README.
- Remotion's older (early 2026) single-skill `rules/` layout is mentioned in community discussion, but I did not verify it, because I only cloned the current HEAD. The current repo is organized as multiple skills plus topic files.
- I found no independent evaluation comparing these community motion skills against each other.

---

## 5. Including brand tokens, reference assets and scripts (e.g. render-stills-and-review); testing that a skill improves output

### Takeaway
Bundle tokens as a data file (JSON or TS) or a short reference table. Put templates, fonts, LUTs and sample media in `assets/`. Put deterministic helpers (render stills, build a contact sheet, lint timing values) in `scripts/`. Tell Claude to execute them, not read them. Then run a render→look→fix loop using Claude's vision. Measure improvement with skill-creator's with-skill versus baseline runs, human review in the viewer, blind comparator judgments, and description-trigger evals.

### Cited Findings
- SPEC directory conventions: `scripts/` ("executable code"), `references/` ("documentation"), `assets/` ("templates, resources"). — [SPEC](https://github.com/agentskills/agentskills/blob/main/docs/specification.mdx)
- BP: "Bundle comprehensive resources: Include complete API docs, extensive examples, large datasets; no context penalty until accessed". "Prefer scripts for deterministic operations". Make the intent clear: "Run `analyze_form.py`" (execute) versus "See `analyze_form.py` for ..." (read). — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- CC: reference a bundled script with `${CLAUDE_SKILL_DIR}/scripts/render.sh` and pre-approve it with `allowed-tools`. CC's worked example has a bundled Python script that generates an HTML visualization: "This pattern works for any visual output ... The bundled script does the work while Claude handles orchestration." — [CC](https://code.claude.com/docs/en/skills)
- Precedents for tokens and assets inside a skill:
  - Remotion maps bundles `assets/tokens.ts`.
  - algorithmic-art bundles `templates/viewer.html` as a "LITERAL STARTING POINT".
  - canvas-design bundles `canvas-fonts/`.
  - brand-guidelines inlines hex tokens.
  - [remotion-dev/skills](https://github.com/remotion-dev/skills); [algorithmic-art](https://github.com/anthropics/skills/blob/main/skills/algorithmic-art/SKILL.md); [canvas-design](https://github.com/anthropics/skills/blob/main/skills/canvas-design/SKILL.md); [brand-guidelines](https://github.com/anthropics/skills/blob/main/skills/brand-guidelines/SKILL.md)
- Render-and-review building blocks:
  - Remotion's CLI renders specific frames: `npx remotion render [id] out/frames --frames=0,30,90 --image-format=png` or `npx remotion still`. — [remotion-render](https://github.com/remotion-dev/skills/blob/main/skills/remotion-render/SKILL.md)
  - BP's "Use visual analysis" pattern: convert output to images with a bundled script, then have Claude analyze them. — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
  - FD: "taking screenshots to review ... a picture is worth 1000 tokens". — [FD](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
  - Emil recommends "reviewing it in slow motion / frame-by-frame and with fresh eyes". — [review-animations](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/SKILL.md)
- Validators as scripts: slack-gif-creator ships `core/validators.py`. BP: "Make validation scripts verbose with specific error messages". — [slack-gif-creator](https://github.com/anthropics/skills/tree/main/skills/slack-gif-creator); [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- Testing:
  - SC runs with-skill and baseline subagents in parallel, aggregates a benchmark, shows a human viewer, and offers blind A/B comparison and trigger optimization (details in section 2). — [SC](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
  - BP: at least three evaluations, tested across the models in use. — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
  - For plugins: `claude plugin eval` with a `tool_used: Skill` grader. — [CC](https://code.claude.com/docs/en/skills)
- Dependencies: on claude.ai, skills "Can install packages from npm and PyPI". On the Claude API there is "no network access and no runtime package installation". List the required packages in SKILL.md. — [BP](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

### Inferences
- Proposed motion skill layout, synthesized from the patterns above (not an official template):
  ```
  motion-design/
  ├── SKILL.md                 # persona, grounding, motion-tells calibration, 2-pass process, checklist (<300 lines)
  ├── tokens/motion-tokens.json # signature easing curves, 3-duration palette, stagger, brand colors, fonts, safe areas
  ├── references/
  │   ├── easing-and-timing.md  # exact curves + duration tables (Emil/Lottie-style), "no approximated values"
  │   ├── choreography.md       # hero/secondary/ambient layers, stagger rules, 1/3 rules
  │   ├── anti-patterns.md      # AI-slop motion tells with Before/After/Why
  │   ├── video-layout.md       # safe areas, min type sizes per aspect ratio (Remotion-style)
  │   └── examples.md           # 2–3 annotated good pieces (beat sheet + token plan + code excerpt)
  ├── assets/                  # logo SVGs, fonts, LUTs, scene templates, reference stills/contact sheets
  └── scripts/
      ├── render_stills.sh      # render N keyframes / contact sheet from composition
      └── lint_motion.py        # flag durations/easings not in token file, ease-in on entrances, etc.
  ```
- Put the review step in the workflow checklist: "Render stills at 0%, 25%, 50%, 75%, 100% of each scene → view → fix → re-render". Alternatively, ship a separate `review-motion` skill with `disable-model-invocation: true` and a "Default to flagging" posture.
- Use FD's "work through a similar prompt to see if you arrive somewhere similar" as a genericness check inside the plan review.
- Evaluate with 3–5 real briefs (for example "15s product launch reel 9:16", "logo sting", "UI micro-interaction"):
  - Compare with-skill against no-skill.
  - Use objective assertions where possible: palette hex values used, safe-area respected, durations come from the token set, fps and dimensions correct.
  - Use blind human or comparator review for taste.

### Gaps
- I found no official Anthropic script for rendering video frames inside a skill. The render-stills script would be team-authored, using Remotion's `still`/`--frames` CLI, ffmpeg, or Playwright screenshots for web motion.
- Claude can review stills or contact sheets, but whether it can judge timing feel from frames alone (as opposed to video) is not covered by any source I found. Treat this as a known limitation and keep a human in the loop for timing.

---

## 6. Sharing skills across a team (repo, plugins/marketplaces, claude.ai org provisioning)

### Takeaway
There are four routes:
1. Commit the skill to `.claude/skills/` in the repo. This is the simplest option for Claude Code users of that repo.
2. Package it in a plugin and host a git-based marketplace. A repo's `.claude/settings.json` can declare `extraKnownMarketplaces` and `enabledPlugins`, and admins can require it fleet-wide via managed settings.
3. On claude.ai Team or Enterprise, owners provision or upload skills org-wide (on by default), and these sync into Claude Code.
4. Upload via the API `/v1/skills` endpoint.

### Cited Findings
- **Repo:** "Project: commit `.claude/skills/` to version control." "Plugin: add a `skills/` directory to your plugin." "Managed: deploy organization-wide through managed settings." — [CC](https://code.claude.com/docs/en/skills)
- **Marketplace:**
  - "A plugin marketplace is a directory or repository with a `.claude-plugin/marketplace.json` file". It "requires a `name`, an `owner`, and a `plugins` array".
  - Validate with `claude plugin validate ./my-marketplace`.
  - Teammates run `claude plugin marketplace add <owner>/<repo>` and then `claude plugin install <plugin>@<marketplace>`.
  - "The repository can be private".
  - [Create a marketplace](https://code.claude.com/docs/en/plugin-marketplaces)
- **Per-repo auto-setup:** "set `extraKnownMarketplaces` and `enabledPlugins` in that repository's `.claude/settings.json`". These apply only after the contributor accepts the workspace trust dialog. — [Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org)
- **Fleet-wide requirement:** managed settings (server-managed from **Organization settings > Claude Code > Managed settings**, MDM, or `managed-settings.json`) with `extraKnownMarketplaces` plus `enabledPlugins`. `strictKnownMarketplaces` restricts sources, and `strictPluginOnlyCustomization` blocks non-plugin skills. — [Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org)
- **claude.ai org provisioning:**
  - "Claude Team and Enterprise plan admins can now provision skills centrally from admin settings." "Admin-provisioned skills are enabled by default for all users." Users can still turn off individual skills.
  - Skills require Code Execution and File Creation to be enabled.
  - Claude Code users can "Install from the plugin directory or check skills into your repository". The API uses "the /v1/skills endpoint".
  - [Claude blog, Dec 18 2025](https://claude.com/blog/organization-skills-and-directory)
- The current Claude Code docs reference **Organization settings > Plugins & skills** on claude.ai. Plugins turned on there "reach Claude Code as synced plugins". — [Manage plugins for your organization](https://code.claude.com/docs/en/plugins/org)
- Help-center articles describe owners uploading skills to provision them org-wide, and sharing skills with specific colleagues on Team and Enterprise plans. Menu paths differ between article versions ("Admin settings > Capabilities" versus "Organization settings > Plugins & skills"). — [Claude Help Center: Using skills in Claude](https://support.claude.com/en/articles/12512180-using-skills-in-claude) (summarized from search results; verify against the live admin UI)
- Anthropic's own skills install as a marketplace: `/plugin marketplace add anthropics/skills`, then `/plugin install example-skills@anthropic-agent-skills`. — [anthropics/skills README](https://github.com/anthropics/skills/blob/main/README.md)
- Community skills commonly install via `npx skills add <owner>/<repo>` (Remotion, Emil Kowalski, LottieFiles). — [remotion-dev/skills README](https://github.com/remotion-dev/skills); [emilkowalski/skills README](https://github.com/emilkowalski/skills/blob/main/README.md)
- **Security:** "We recommend installing skills only from trusted sources." Audit bundled code and any instructions that reach external networks. — [ENG](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)

### Inferences
- For a marketing-automation team:
  1. Start with the skill committed under the repo's `.claude/skills/motion-design/`. This gives fast iteration and code review on skill changes.
  2. Once stable, wrap it in a plugin in an org marketplace repo, so other repos and claude.ai users get the same version.
  3. Optionally provision it org-wide on claude.ai so non-engineers (designers using claude.ai or Cowork) get it too.
- Version the skill (for example a `metadata.version`, as LottieFiles does, or a `version` field, as Remotion does), and keep evals in the same repo so changes are re-benchmarked.

### Gaps
- I did not verify the current exact claude.ai admin UI path or the skill upload limits (zip size, file count). Help-center sources conflict on menu naming.
- I did not research the API `/v1/skills` upload limits or versioning semantics in depth.
