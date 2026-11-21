# Kinds of software

What "run it", "see it working", "test it by hand" and "release it" mean depends on what is being
built. A project's map says which kind it is on its `Kind:` line. Commands read this file when they
need the answer; it is not loaded into every session.

A project can be more than one kind (a web app with a backend service, a library with a CLI). Use
the row for the part the current task touches. A map without a `Kind:` line is an older map: infer
the kind from the code and add the line.

| Kind | Run it locally | See a change working | A manual QA case drives | A release is |
|---|---|---|---|---|
| `web-app` | dev server on a port | load the URL in a browser | the browser | a deploy to a host |
| `backend-service` (API, worker, queue consumer) | the server or worker process; its dependencies (database, broker) up first | a request and its response; for a worker, the job's effect and its log line | HTTP or RPC calls from the shell | a deploy to a host, migrations first |
| `mobile-app` | simulator, emulator, or a device build | the screen on the simulator; a UI test when no simulator is reachable | the simulator, when a tool to drive it is installed; otherwise a person | a store submission (review, staged rollout) or an internal build (TestFlight, internal track) |
| `desktop-app` | the app in dev mode | the window; logs for what has no window | the app window, when a tool to drive it is installed; otherwise a person | signed installers per OS, an update feed |
| `cli` | the command itself, from a clean shell | exit code, stdout, stderr, files it wrote | the shell | a published package or binaries on a release page |
| `library` (SDK, package) | its tests and a small example that imports it | the example's output; the public API's types and docs | the shell, running the example | a version published to a registry |
| `game` | the engine's editor or a dev build | play the scene; frame time and logs for what cannot be seen in a screenshot | a person, mostly; headless tests for rules and state | a build per platform, a store or a download page |
| `data-ml` (pipelines, notebooks, training) | the pipeline or notebook on a small sample | row counts, schema, a metric against a baseline, a plot | the shell: run on the sample and compare outputs | a scheduled job, a model version in a registry, a published dataset |
| `infrastructure` (IaC, cluster config) | a plan or dry run against a non-production target | the plan's diff: what is created, changed, destroyed | the plan output, read line by line | an apply, after the plan was read and approved |
| `other` | written in the map's "Run and test" | written there too | whatever that section says | written in `DEPLOY.md` |

## What changes with the kind

**Verifying.** The rule is the same everywhere: a change is done when it was run and observed, not
when the code reads right. Only the observation differs. Where there is no screen, the evidence is
the command and its captured output, saved next to the screenshots a web project would keep.

**What cannot be driven from here.** A phone simulator, a game window, a signed desktop build or a
piece of hardware may be out of reach of the tools in this session. Say so and hand that check to
the person, with the exact steps. Testing a different surface and reporting the original one as
tested is the failure to avoid.

**Releases that cannot be taken back.** A deploy to a host can be rolled back. A version published
to a package registry, a build approved by an app store, a destroyed cloud resource and a migrated
production database cannot: the version number is spent, the users have the build, the data is
gone. These always need the person's explicit yes at the moment of the action, whatever the deploy
mode, and the runbook's "Rollback" line says what recovery really is (a patch release, a new
submission, a restore from backup).

**Interface design.** The `super-ui-ux-design` and `frontend-design` skills and the design rules in
`.claude/rules/design/` are for graphical interfaces. A CLI's interface is its commands, flags,
help text, exit codes and error messages; a library's is its public API and its docs; a service's
is its contract. They deserve the same care, with different tools: consistency with the platform's
conventions, errors that say what to do next, and nothing surprising on the default path.

**Wireframes and prototypes.** `/plan:create-phase`, `/brainstorm:wireframe` and
`/brainstorm:prototype` draw screens. For work with no screen, `/plan:visual` plans with diagrams,
tables and interface sketches (a command's usage text, an API's request and response, a schema).

**Stage still sets the bar.** `toy`, `mvp` and `production` mean the same for every kind. What
"production" requires differs: a library needs semantic versioning and a changelog, a pipeline
needs idempotent re-runs and data checks, infrastructure needs state locking and a reviewed plan.
