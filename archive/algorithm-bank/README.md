# Algorithm Bank archive

`bank/` contains the former `/bank` Astro pages. `run.ts` is the former
`/api/run` Cloudflare Pages Function used by the problem runner.

Problem data remains in `src/content/problems/` and its collection definition
remains in `src/content/config.ts`.

To restore the feature, move `bank/` back to `src/pages/bank/` and `run.ts`
back to `functions/api/run.ts`, then add `/bank` to the site navigation.
