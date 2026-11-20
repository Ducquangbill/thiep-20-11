# Release — thiep-20-11

Static single-page greeting card (`index.html`, `styles.css`, `app.js`). No build step, no backend, no database, no secrets. Deployment = publish three files.

- Environments: `dev` (local), `staging` (preview deployment per branch/PR), `production` (main branch only, on explicit instruction).
- Artifact: the repo root minus tests, docs, and tooling (`index.html`, `styles.css`, `app.js` are the entire runtime payload).
- CI: `.github/workflows/ci.yml` runs `npm test` on Node 20 / 22 / 24 for every push to `main` and every pull request, plus a dependency-free guard and a `static-site` artifact upload.

## 1. Local preview

```bash
# 1. Unit tests — Node >= 20, zero install
npm test

# 2. Serve over HTTP (required for ES module `app.js`)
npm start          # npx serve --listen 8080 .
# open http://localhost:8080/
```

Verification signals:

- `npm test` → `pass 54`, `fail 0`.
- `http://localhost:8080/` → `200`, `Content-Type: text/html; charset=utf-8`.
- `http://localhost:8080/app.js` → `Content-Type: application/javascript; charset=utf-8`.
- Opening the page shows the closed envelope and the prompt "Chạm để mở thiệp"; console is clean.

`file://` works as a fallback, but the module script and Google Fonts behave better over HTTP. Always prefer `npm start`.

## 2. URL personalization

Only three query parameters are read. Anything else is ignored (BR-1).

| Param  | Meaning            | Fallback when absent or empty |
| ------ | ------------------ | ----------------------------- |
| `to`   | Recipient name     | `Thầy/Cô của em`              |
| `msg`  | Greeting message   | default Vietnamese greeting   |
| `from` | Sender name        | `Người học trò của bạn`       |

Rules:

- Values are percent-decoded; `+` is read as a space, so `?to=Co+Lan` shows `Co Lan`.
- Each field is truncated to 120 characters with a trailing `…`.
- Values render via `textContent` only, so HTML/JS payloads appear as literal text (BR-3).
- Malformed escapes (`%zz`) fall back to the raw substring; the page never crashes.

Share examples (replace the host with the deployed origin):

```text
https://<host>/
https://<host>/?to=C%C3%B4%20Lan&msg=Ch%C3%BAc%20c%C3%B4%20m%E1%BB%99t%20ng%C3%A0y%2020%2F11%20th%E1%BA%ADt%20vui&from=Sinh%20vi%C3%AAn%2012A
https://<host>/?to=Thay+Minh&msg=Chuc+thay+luon+khoe+manh&from=Lop+11B
```

Generate links safely instead of hand-writing them:

```js
const link = `${origin}/?to=${encodeURIComponent(to)}&msg=${encodeURIComponent(msg)}&from=${encodeURIComponent(from)}`;
```

## 3. Deployment

All four targets are static hosts. No build command, no build output directory (use `.` / repository root), no environment variables.

### Vercel — live

| Item | Value |
| --- | --- |
| Public URL | `https://thiep-20-11-nu.vercel.app/` |
| Project | `thiep-20-11` — `prj_63fMHqHaUPOn20rqCQPZg32FlWFN` |
| Team | `ducquangnaohs-projects` — `team_kKbz3icHmtzNJRMrp4IqDdoo` |
| Production deployment | `dpl_H47jyaApPEpBGp7CCCCFCukM28wm` (docs-only commits create newer deployments serving the same three files) |
| Source commit | `8dff96a` on `main` |
| Hosting mode | Git-linked: every push to `main` builds a production deployment |
| Build | none — static files served from the repository root (`framework: null`) |

`vercel.json` (committed) declares the security headers:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

`.vercelignore` keeps `docs/`, `tests/`, `graphify-out/`, `.github/`, tooling directories and `*.md` out of the published artifact. Verified: `GET /docs/thiep-20-11/spec.md` and `GET /tests/app.test.js` both return `404`.

Deployment protection: the account has SSO protection set to `all_except_custom_domains`. The production domain `thiep-20-11-nu.vercel.app` is exempt and returns `200` to anonymous visitors. Generated deployment URLs such as `thiep-20-11-ducquangnaohs-projects.vercel.app` redirect to Vercel SSO — share the `-nu` domain, not a deployment URL.

Verified on the live deployment (2026-11-19):

```text
GET /                -> 200  text/html; charset=utf-8            sha1 2ca849a1… (matches repo)
GET /styles.css      -> 200  text/css; charset=utf-8             sha1 1109f810… (matches repo)
GET /app.js          -> 200  application/javascript; charset=utf-8 sha1 f63669e1… (matches repo)
Headers              -> CSP, X-Content-Type-Options: nosniff, Referrer-Policy, X-Frame-Options: DENY
?to=…&msg=…&from=…   -> 200, 6781 bytes, card slots present (values applied client-side)
```

Preview deployments from pull requests act as `staging`. Production promotes only from `main`, on explicit approval.

### Vercel — new project setup (if the project is ever recreated)

1. Import the repository, framework preset **Other**.
2. Build command: empty. Output directory: `.`.
3. Commit `vercel.json` and `.vercelignore` before the first production deploy.

### GitHub Pages

1. Settings → Pages → Source: **GitHub Actions**, or deploy from branch `main` / root.
2. With Actions, add a job that uploads the three files via `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4` (the `static-site` artifact from CI already contains them).
3. GitHub Pages cannot set custom HTTP headers. Enforce the policy with a `<meta>` tag in `index.html`, or front the site with Cloudflare:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'"
/>
```

`X-Content-Type-Options` and `frame-ancestors` are not available through `<meta>`; put Cloudflare in front if they are required.

### Netlify

1. New site from Git. Build command: empty. Publish directory: `.`.
2. Add `_headers` at the repository root:

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'
```

Deploy previews per pull request serve as `staging`.

### Cloudflare Pages

1. Connect the repository. Framework preset: **None**. Build command: empty. Build output directory: `/`.
2. Add `_headers` (same content as the Netlify block above). Cloudflare Pages applies it automatically, including preview deployments.

### Post-deploy verification (any host)

```bash
curl -sI https://<host>/ | findstr /I "HTTP content-type x-content-type-options content-security-policy"
curl -s https://<host>/app.js | findstr /C:"export const MAX_FIELD_LEN = 120"
```

Expected: `200`, `text/html; charset=utf-8`, both security headers present, and the JS payload intact.

### Hosting notes

- Serve UTF-8 for `.html`, `.css`, `.js`; all four hosts do this by default. Verify with the `curl -I` check above.
- Total gzip payload must stay ≤ 200KB (NFR-3). Check locally: `gzip -c index.html styles.css app.js | wc -c`.
- Do not add analytics, service workers, or network calls: they break the "no network after load" NFR and the `connect-src 'none'` policy.
- Google Fonts needs `fonts.googleapis.com` (CSS) and `fonts.gstatic.com` (woff2) in the policy. Self-hosting the two `vietnamese` subsets removes both origins and tightens CSP to `default-src 'self'`.

## 4. Monitoring

No server, so observability is uptime and edge metrics only.

- Uptime probe (external, e.g. UptimeRobot/Better Stack) on `https://thiep-20-11-nu.vercel.app/?to=healthcheck` every 5 minutes, keyword check `Chạm để mở thiệp`, alert to the maintainer email.
- Alert conditions: any non-`200` response, response > 2s (NFR-3), or keyword missing.
- Host analytics: the Vercel project dashboard (`ducquangnaohs-projects/thiep-20-11`) for request and error rates; check the day after launch and on 20/11.
- Client-side errors are not collected by design. Reproduce reported issues locally with the shared URL, since the URL alone fully describes page state.

## 5. Rollback

Static hosts keep every deployment immutable, so rollback is a re-promotion, not a restore. Roll back when: the page fails to open the envelope, text is missing or mangled, a header breaks the page (CSP violation in console), or gzip payload regresses past 200KB.

| Target | Rollback action | Time |
| ------ | --------------- | ---- |
| Vercel (live) | Vercel dashboard → `thiep-20-11` → Deployments → previous `READY` production deployment → **Promote to Production**, or `request_rollback` with that deployment ID | ~30s |
| Netlify | Deploys → previous good deploy → **Publish deploy** | ~10s |
| Cloudflare Pages | Deployments → previous good deployment → **Rollback to this deployment** | ~30s |
| GitHub Pages | Revert the offending commit on `main` (`git revert <sha>`), push; Pages redeploys | ~2 min |

Current known-good production deployment to roll back to: `dpl_H47jyaApPEpBGp7CCCCFCukM28wm` (commit `8dff96a`). Previous candidate: `dpl_H1A8TAHwkU4DvcHuz2JSYzAqgT38` (commit `b12a598`).

Source-level rollback (all hosts):

```bash
git log --oneline -5
git revert <bad-sha>      # never force-push main
git push origin main
```

Because the Vercel project is Git-linked, a `git revert` push redeploys production on its own. Verify after rollback: `curl -sI https://thiep-20-11-nu.vercel.app/` returns `200`, and the page opens the envelope with default content in a fresh incognito window. No data migration, no cache priming, and no state to clean up is required.

## 6. Project closure

- The artifact is three static files; there is no infrastructure, database, or secret to decommission.
- After 20/11, keep the deployment live for a month so shared links keep working, then optionally unpublish the project on the host. Unpublishing breaks every shared link: confirm before doing it.
- Archive the repository (read-only) if no further changes are planned. `.github/workflows/ci.yml` costs nothing when idle.
- Rotate nothing: the project holds no credentials and reads no secrets.
- Close the feature docs in `docs/thiep-20-11/`; keep `release.md` as the operational record.
