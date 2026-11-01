# Deploy: {{PROJECT}}

Provider: <coolify | vercel | netlify | fly | railway | docker-compose-ssh | other>
Mode: instructions   <!-- ci = a pipeline deploys on merge/tag, ATLAS never deploys around it; instructions = ATLAS prints exact steps; cli = ATLAS runs the provider CLI after an explicit yes -->
Pipeline: <ci mode: workflow file, e.g. .github/workflows/deploy.yml; or the provider's git integration>
Trigger: <ci mode: per env, e.g. prod = merge to main, staging = push to develop, or tag v*>
Environments: dev, staging, prod
App identifiers: <provider app/project/service ids per env; no secrets>
Domain(s): <...>
Build: `<command>`    Start: `<command>`    Port: <n>
Env keys required: see .env.example (names only); provider token key: <e.g. VERCEL_TOKEN>
Database: <db.cjs registry entry per env>; migrations: `<command>`, run BEFORE the new release (ci mode: does the pipeline run them? which step?)
Health check: <URL that returns 200 when healthy>
Smoke test: <2 to 5 read-only flows to check after a deploy>
Rollback: <how to redeploy the previous release; ci mode: revert commit + merge, or the provider's rollback>
Logs: <app logs; ci mode: also the pipeline run, e.g. gh run view --log>
Last deploy: <date, version or commit, env>
