# Infrastructure

Web: Vercel. Go API and River workers: persistent container host, with Render as the initial candidate. Neon PostgreSQL credentials will be configured as deployment secrets when supplied. No provider accounts or database have been connected yet.

`ci-template.yml` contains the intended GitHub Actions jobs. It is not active: the current GitHub CLI OAuth token lacks permission to push files under `.github/workflows/`. Move it there after repository authorization with the `workflow` scope, then verify both jobs run on the pushed commit.
