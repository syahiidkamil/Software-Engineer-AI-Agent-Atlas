# Deploy: {{PROJECT}}

Provider: <a host: coolify | vercel | netlify | fly | railway | docker-compose-ssh; a registry: npm | pypi | crates.io | github-releases; a store: app-store | play-store; an apply: terraform | pulumi | kubectl; or other>
Mode: instructions   <!-- ci = a pipeline deploys on merge/tag, ATLAS never deploys around it; instructions = ATLAS prints exact steps; cli = ATLAS runs the provider CLI after an explicit yes -->
Pipeline: <ci mode: workflow file, e.g. .github/workflows/deploy.yml; or the provider's git integration>
Trigger: <ci mode: per env, e.g. prod = merge to main, staging = push to develop, or tag v*>
Environments: dev, staging, prod
App identifiers: <provider app/project/service ids per env; no secrets>
Domain(s): <for a hosted service; a package name or a store listing otherwise>
Build: `<command>`    Start: `<command, if it runs as a process>`    Port: <n, if it listens on one>
Env keys required: see .env.example (names only); provider token key: <e.g. VERCEL_TOKEN>
Database: <db.cjs registry entry per env>; migrations: `<command>`, run BEFORE the new release (ci mode: does the pipeline run them? which step?)
Health check: <URL that returns 200 when healthy; with no URL: the command that proves the release works, e.g. install the published version and run it>
Smoke test: <2 to 5 read-only flows to check after a deploy>
Rollback: <how to redeploy the previous release; ci mode: revert commit + merge, or the provider's rollback. If the release cannot be taken back (a published version, a store build, an applied destroy), say what recovery is instead: a patch release, a new submission, a restore>
Logs: <app logs; ci mode: also the pipeline run, e.g. gh run view --log>
Last deploy: <date, version or commit, env>
