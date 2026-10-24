# SPEC

## §G GOAL
static Astro 7 portfolio site for JOWSAI (handwoven Eri silk stoles, Assam): `/` = fixed hero + story (docx variant A) + design grid; `/designs/<slug>/` per design; ∀ content read @ build from `raw/`; ⊥ ecommerce.

## §C CONSTRAINTS
- stack: `astro@^7.4`, static output. bun = pkg manager & script runner only (⊥ npm, ⊥ `package-lock.json`); astro CLI runs on Node ≥ 22.23.4. dev deps: `@astrojs/check`, `typescript@^6`, `@types/bun`.
- ⊥ UI framework (React/Vue/Svelte/…), ⊥ Tailwind. Astro scoped CSS + CSS custom props. client JS ! only lightbox.
- images ! via `astro:assets` + sharp: `<Picture>` → responsive AVIF + WebP + JPG fallback. md inline images → responsive WebP only (md pipeline ⊥ AVIF). ⊥ `Bun.Image`.
- `raw/` = live content input: user drops files, next build picks up. ⊥ copy hard-coded in `src/` (exception: `src/config.ts` contact values).
- `raw/` layout: `home.md` + `<slug>/design.md` + `<slug>/<images>`. slug = folder name. `_`-prefixed file|folder ignored. other root files (e.g. `landing-page-ideas.docx`) = archive, build ⊥ read.
- image order: `images` list in `design.md` first, then unlisted visible images by filename (numeric-aware). first = cover.
- hero copy verbatim: "JOWSAI" / "Eri Silk, Woven in Assam." / "A quiet expression of heritage, shaped by nature and crafted by hand." hero image = `raw/red-motif/img2.jpg`.
- home story = docx variant A verbatim (sections "Born of Silk. Shaped by Hands." · "The Art of Assam's Handloom" · "A Beauty That Evolves" · "Craft That Sustains Communities" · "From Assam. Made by Hand." · sign-off "JOWSAI" / "The Art of Eri Silk"), stored `raw/home.md`. ⊥ variants B/C.
- design `red-motif`: "Eri Silk Stole — Red Motif", subtitle "Woven Heritage, Naturally Beautiful", copy = `sq1_txt.txt` verbatim, images img2, img1, img3.
- design `ivory`: "Eri Silk Stole — Ivory", no subtitle, copy = `sq1_txt.txt` minus Bodo-motif & chemical-dye-free claims & tags; care line drops "natural" ("preserve the silk fibres, colours, texture and developing lustre") (user reviews), images w1–w4. ⊥ fibre %/blend claim, ⊥ Bodo, ⊥ dye claim until `?` below resolved.
- composites: img1, img3 (photo-only grids) shown. sq1, sq2 (boards w/ baked-in text) hidden → `_sq1.jpg`, `_sq2.jpg`.
- one-time `raw/` migration: loose files → `raw/red-motif/` & `raw/ivory/`; original `sqN_txt.txt` → `raw/_archive/` untouched. ⊥ other `raw/` edits.
- CTA: "Enquire about this design" → WhatsApp (`wa.me`, text prefilled w/ design name) + `mailto:` (subject = design name). footer: WhatsApp · Email · Instagram. values ∈ `src/config.ts`. '' → link ⊥ rendered. ⊥ placeholder href, ⊥ invented contact value.
- look: ivory/cream base, coral-red accent (sampled from red motif), deep brown text. fonts: Cormorant Garamond (display) + Jost (text), OFL, self-hosted via `fontProviders.fontsource()`. wordmark = text "JOWSAI" (no logo file).
- English only. OUT: prices, cart, checkout, payments, accounts, CMS, backend, forms, analytics, i18n, blog. sitemap/OG/canonical deferred until domain known.
- done = `bun run build` & `bun run check` & `bun test` clean + Chrome @390px & 1440px on `/`, `/designs/red-motif/`, `/designs/ivory/` → 0 console errors + ∀ img alt non-empty.
- ? WhatsApp number, email, Instagram handle → CTA & footer links hidden until set.
- ? ivory fibre (100% Eri | blend) & Bodo/dye applicability → `_sq2.jpg` stays hidden until resolved.
- ? domain & deploy target → `site` URL, canonical, OG, sitemap deferred.
- ? logo asset → text wordmark meanwhile.
- ? current photos final | stand-ins → swap via `raw/` drop-in.
- git: ! 1 Conventional Commit per §T (e.g. `feat(site): T7 home page`). ⊥ remote, ⊥ push.

## §I INTERFACES
- file: `raw/home.md` → frontmatter `{hero: {image: <path rel raw/>, alt, title, tagline, lede}}` (title/tagline/lede = 3 hero lines) + Markdown body = story = variant A after its 3 hero lines (`##` = section; inline `![alt](<rel path>)` ok).
- file: `raw/<slug>/design.md` → frontmatter `{name!, subtitle?, order?: number, images?: [{file!, alt!}], tags?: string[]}` + Markdown body = story & care. grid order = `order` asc, then slug.
- file: `raw/<slug>/*.{jpg,jpeg,png,webp,avif}` (ext case-insensitive) → gallery images. `_*` ignored. other files ignored.
- file: `src/config.ts` → `contact = {whatsapp: '' | digits w/ country code, no '+', email: '' | address, instagram: '' | handle}`.
- route: `/` → hero · story · `#designs` grid (cover, name, subtitle → link).
- route: `/designs/<slug>/` → title block (name, subtitle, tags) · gallery + lightbox · story · CTA · back link `/#designs`.
- link: `https://wa.me/<digits>?text=<enc>` · `mailto:<email>?subject=<enc>` · `https://www.instagram.com/<handle>/`.
- cmd: `bun install` · `bun run dev` · `bun run build` → `dist/` · `bun run preview` · `bun run check` (astro check) · `bun test` (bun:test: unit tests + `dist/` checks; ! after `bun run build`; `dist/` missing → fail).

## §R RESEARCH
probe = throwaway Astro 7.4.2 build under bun 1.4.2 on this machine.
id|topic|finding|src
R1|astro under bun|`astro` bin shebang `#!/usr/bin/env node` → `bun run build` runs astro on Node (probe log `node v26.10.0`). bun = install & script runner only|probe; `node_modules/astro/bin/astro.mjs`
R2|install|`bun install` → `bun.lock`; sharp optional dep → `@img/sharp-win32-x64` auto, no postinstall|probe
R3|image service|sharp (default) encodes AVIF/WebP/JPG. `Bun.Image` (bun 1.4.2, backend `system` on Windows): webp/jpeg/png ok, avif → `ERR_IMAGE_ENCODE_FAILED` ∴ sharp|probe
R4|load `raw/`|`glob({ pattern: '[!_]*/design.md', base: './raw', generateId: ({ entry }) => entry.split('/')[0] })` loads outside `src/`; `render(entry)` ok; `[!_]` skips `_draft/`. `home.md` via `glob({ pattern: 'home.md', base: './raw' })`. schema `z` from `astro/zod` (Zod 4)|probe; docs.astro.build/en/reference/content-loader-reference/
R5|image discovery|`import.meta.glob<{ default: ImageMetadata }>(['/raw/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}', '!/raw/**/_*', '!/raw/_*/**'], { eager: true })` → ImageMetadata ∀ visible image; `_*` file & `_*/` folder ⊥ emitted (w/o `'!/raw/_*/**'`, `raw/_draft/x.jpg` leaks into `dist/`); originals ⊥ emitted (variants only). key order = code point (`W4.JPG` < `img10.jpg` < `img2.jpg`) ∴ resolver sorts|probe
R6|natural sort|`a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })` → img2, img10, w3, W4|probe (`bun test`)
R7|md images|relative `![alt](./ivory/w3.jpg)` in `raw/*.md` → optimized `<img>` WebP, alt kept, width/height, lazy; srcset only w/ `image.layout`. ⊥ AVIF, ⊥ `<picture>`. DeepWiki claims an `image` formats option → absent from 7.4.2 `config.d.ts` ∴ WebP only|probe; `astro/dist/types/public/config.d.ts`; deepwiki.com/withastro/astro
R8|responsive|`image: { layout: 'constrained', responsiveStyles: true }` → auto widths & sizes ∀ `<Picture>` & md img. `<Picture formats={['avif','webp']}>` → avif + webp `<source>` + jpg `<img>`. `priority` → `loading="eager" decoding="sync" fetchpriority="high"`. encoder defaults via `image.service.config.{avif,webp,jpeg}`|probe; docs.astro.build/en/reference/modules/astro-assets/; `config.d.ts`
R9|md renderer|v7 default = Sätteri (⊥ remark). `##` → `<h2 id="slug">`. remark/rehype plugins need `@astrojs/markdown-remark`|docs.astro.build/en/guides/upgrade-to/v7/; probe
R10|whitespace|`compressHTML` default `'jsx'`: newline between inline els dropped (`<a>A</a>⏎<a>B</a>` → `AB`), same-line space kept ∴ `{" "}`|probe; `config.d.ts`
R11|compiler|Rust compiler: non-void el ! end tag (missing → compile error); invalid nesting ⊥ auto-fixed|docs.astro.build/en/guides/upgrade-to/v7/
R12|fonts|top-level `fonts: [{ provider: fontProviders.fontsource(), name, cssVariable, weights, styles, fallbacks }]` (stable since 6.0) + `<Font cssVariable="--x" preload />` from `astro:assets` → woff2 fetched @ build, cached `node_modules/.astro/fonts/`, emitted `dist/_astro/fonts/` (self-hosted). cold cache ! network|probe; `config.d.ts`; `astro/components/Font.astro`
R13|astro check|needs `@astrojs/check` (0.9.12) + `typescript@^6`. TS 7.0.2 → "astro check does not currently support TypeScript 7.0. To continue using astro check, install TypeScript 6 instead."|probe
R14|bun types|TS 6 + `bun:test` / `node:*` imports → ts(2307) / ts(2591) until `@types/bun` + tsconfig `compilerOptions.types: ["bun"]`; then `astro check` 0 errors|probe
R15|bun test|`bun test` runs `*.test.ts` (TS native, `node:fs` ok) ∴ resolver ! pure TS: ⊥ `import.meta.glob`, ⊥ `astro:*`|probe
R16|versions|astro 7.4.2 → Vite 8, Zod 4, rolldown; engines node `>=22.23.4`|`astro/package.json`

## §V INVARIANTS
V1: ∀ visible image ∈ `raw/<slug>/` → rendered on `/designs/<slug>/`. `_`-prefixed file|folder ⊥ rendered & ⊥ emitted to `dist/`.
V2: gallery order = `images` list order, then unlisted visible by filename (numeric-aware). first = grid cover.
V3: design folder w/o `design.md` | 0 visible images | `images[].file` ∉ visible files → build fails, msg names folder & file.
V4: ∀ rendered `<img>` → non-empty alt. listed → its `alt`; unlisted → `<name> — photo <n>`.
V5: contact value '' → its link ⊥ rendered; all '' → no CTA block & no footer contact list. ⊥ href `#`/`TODO`/example value. `whatsapp` ≠ '' ∧ ∉ `/^\d{8,15}$/` → build fails.
V6: hero = 3 fixed lines verbatim, shown once (⊥ repeated in story). hero lines + home story = variant A verbatim, in order (md smart quotes `’‘“”` ≡ `'"`).
V7: `dist/designs/ivory/index.html` visible text (tags stripped, ⊥ asset URLs) ⊥ match `/\b(bodo|dyes?|dyed|blend(ed)?|natural colou?rs?)\b|100\s*%/i`. care advice "harsh chemical treatments" ok; "chemical dyes" & "Chemical-Dye-Free" caught by `dyes?`.
V8: `dist/index.html` ⊥ `<script`. design pages → lightbox script only. `package.json` deps ⊥ UI framework.
V9: gallery works w/o JS (∀ thumb = `<a href>` → large image). lightbox: Esc closes, ←/→ navigate, focus returns to trigger, `prefers-reduced-motion` → ⊥ transitions.
V10: ∀ text contrast ≥ 4.5:1 (large text ≥ 3:1). coral accent ⊥ small text unless ≥ 4.5:1.
V11: ∀ img width & height set (⊥ layout shift). hero eager + `fetchpriority="high"`; rest lazy.
V12: ⊥ horizontal scroll @ 390px & 1440px. 0 console errors ∀ route.
V13: build reads content only from `raw/` & `src/config.ts`. `.docx` ⊥ read.

## §T TASKS
id|status|task|cites
T1|x|`git init` + `.gitignore` (`node_modules/`, `dist/`, `.astro/`); migrate `raw/`: loose files → `red-motif/` & `ivory/`; sq1, sq2 → `_sq1.jpg`, `_sq2.jpg`; txt → `design.md` (frontmatter, alt, tags) + originals → `_archive/`; variant A → `raw/home.md`|V6,V7,I.file
T2|x|scaffold Astro 7 by hand: deps `astro@^7.4`; dev `@astrojs/check`, `typescript@^6`, `@types/bun`; tsconfig strict + `types: ["bun"]`; config `image` layout constrained + `fonts`; scripts dev/build/preview/check/test; no starter assets|V8,V13,I.cmd,R1,R2,R8,R12,R13,R14
T3|x|raw resolver `src/lib/raw.ts` (pure TS, fs scan): `_` skip, ext filter, order, alt fallback, errors + `bun test` suite|V1,V2,V3,V4,V13,I.file,R6,R15
T4|.|wire resolver → Astro: collections `designs` & `home`, `import.meta.glob` images, md render|V1,V11,V13,R4,R5,R7
T5|.|base layout: tokens (palette, fonts), header wordmark, footer, favicon|V10,V12,R10,R11,R12
T6|.|`src/config.ts` contact + CTA & footer links|V5,I.link
T7|.|home `/`: hero, story, `#designs` grid|V6,V8,V11,I.route
T8|.|design page `/designs/<slug>/`: title block, gallery, story, CTA, back link|V1,V2,V4,V5,I.route
T9|.|lightbox: native `<dialog>`, progressive enhancement|V8,V9
T10|.|verify: build, check, test, `dist/` greps, Chrome @390px & 1440px|V1,V4,V7,V8,V10,V11,V12

## §B BUGS
id|date|cause|fix
B1|2026-10-24|V7 regex word `chemical` hit ivory care line "harsh chemical treatments" (care advice, ⊥ claim) ∴ claim-free ivory page failed V7|V7
B2|2026-10-24|variant A opens w/ 3 hero lines & §I home.md had ⊥ hero text fields ∴ hero copy either hard-coded in `src/` or rendered twice|V6,I.file
