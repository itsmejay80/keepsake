# Readwise Reader feature research for Karakeep

Research date: 2026-09-17

## Scope and method

This report inventories current Readwise Reader capabilities that are relevant to Karakeep and turns them into candidate product opportunities. All external evidence comes from official Readwise documentation or product pages. The comparison baseline is Karakeep's checked-in documentation, especially its introduction, bookmarking, advanced workflows, RSS, and MCP pages. A feature described as a "candidate gap" should still be validated against the running product and work in progress before becoming a roadmap commitment.

## Executive summary

Reader's strongest differentiation is a complete reading loop:

1. Capture almost any reading material.
2. Normalize it into a purpose-built reading surface.
3. Preserve position and let the user highlight, annotate, listen, or ask AI questions in context.
4. Organize it with saved queries and triage states.
5. Resurface it through feeds, a daily digest, search, and Readwise review/export workflows.

Karakeep already has a stronger archival and ownership story: self-hosting, full-page archival, video archival, rules, collaboration, local-model support, API/webhooks, and broad automation. The best strategy is therefore not full Reader parity. It is to add the missing consumption and recall layer on top of Karakeep's existing capture and preservation strengths.

The highest-value opportunities are:

- A first-class YouTube transcript reader with timestamped highlights and transcript navigation.
- Reliable reading progress and "continue reading" across web and mobile.
- A more capable annotation notebook, including highlight-level notes/tags and Markdown export.
- Reading-focused AI: document/passage chat and library-wide cited answers.
- A separate feed-triage experience so RSS subscriptions do not flood the durable library.
- Text-to-speech and reader appearance/accessibility controls.

## Current Reader capability map

### 1. Capture and import

Reader accepts articles, newsletters, EPUBs, PDFs, videos, tweets, and other documents in a unified library. Users can capture through its browser extension, mobile share sheet, drag-and-drop upload, URL entry, RSS, and email forwarding. Its browser extension saves rendered page content and can add tags, a document note, and a destination at capture time. File uploads include PDF, EPUB, Markdown, and OPML. ([Reader overview](https://docs.readwise.io/reader/docs), [saving content](https://docs.readwise.io/reader/docs/saving-content), [adding content](https://docs.readwise.io/reader/docs/faqs/adding-new-content))

It supports bulk migration/import from services and files, including Instapaper, Matter, Raindrop CSV, generic URL CSV, and OPML for feeds. ([importing content](https://docs.readwise.io/reader/docs/faqs/importing-content), [migration guide](https://docs.readwise.io/reader/docs/migrating-content))

Email newsletters can be delivered to a custom Reader email address and displayed either as normalized text or in the sender's original formatting. Reader remembers the preferred view per sender. ([email newsletters](https://docs.readwise.io/reader/docs/faqs/email-newsletters))

Reader also turns Twitter/X threads into article-like documents. Podcast links from supported apps can produce a permanent transcript that users can highlight and chat with; RSS podcast episodes can be transcribed on demand. ([adding content](https://docs.readwise.io/reader/docs/faqs/adding-new-content))

Implication for Karakeep: capture breadth is already a strength, but EPUB/Markdown reading, inbound email/newsletters, and podcast transcription are plausible format gaps. Capture-time notes, tags, and routing are small UX improvements that reduce later cleanup.

### 2. Reading experience

Reader supplies a clean reading view with adjustable typeface, font size, line spacing, line width, light/dark/automatic themes, right-to-left direction, and dyslexia- and legibility-oriented typefaces. It has a focused long-form mode, vertical paged scrolling, tablet two-column pagination, configurable side panels, and device-specific reading preferences. ([appearance](https://docs.readwise.io/reader/docs/faqs/appearance), [long-form reading workflow](https://docs.readwise.io/reader/guides/workflows/longform-reading))

It tracks both the user's furthest genuine reading progress and last location, attempting to distinguish reading from quickly skimming. Progress is visible in document lists and in the mobile reading view. ([basics](https://docs.readwise.io/reader/docs/faqs))

PDF support includes original rendering, zoom, image/table snapshot highlights, metadata editing, enhanced/reflowed text view, optional dark-mode color inversion, and annotated PDF download. ([PDFs](https://docs.readwise.io/reader/docs/faqs/pdfs), [sharing](https://docs.readwise.io/reader/docs/faqs/sharing))

Text-to-speech works on most documents, offers multiple languages and voices, follows the spoken paragraph, supports jumping to a new reading position, and exposes playback keyboard controls. Speech generation requires connectivity. ([text-to-speech](https://docs.readwise.io/reader/docs/faqs/text-to-speech))

Implication for Karakeep: the largest product-quality gap is likely not another bookmark type, but a reader that users want to remain inside. Reading position, strong typography/accessibility, PDF reflow, and TTS create repeat usage after capture.

### 3. YouTube and video

Saving a YouTube URL produces a video-and-transcript reading surface. The transcript is synchronized to playback and automatically scrolls like a teleprompter. Users can click a transcript fragment or highlight to seek precisely, highlight and annotate while watching, resize the player, control speed, and jump by 15 seconds. Reader also offers an enhanced transcript and lets users select any caption language exposed by the source video. ([YouTube videos](https://docs.readwise.io/reader/docs/faqs/videos))

YouTube channels can be added as feeds; Reader imports recent videos and automatically receives new ones. Multiple subscriptions can be imported through OPML. ([YouTube videos](https://docs.readwise.io/reader/docs/faqs/videos))

Implication for Karakeep: Karakeep's video archival is an excellent preservation foundation, but Reader demonstrates a separate consumption feature: timestamp-aware transcript reading and annotation. This is the clearest opportunity to turn existing YouTube support into a daily-use workflow.

### 4. Highlights, annotations, and knowledge flow

Reader supports text and image highlights, highlight notes, document notes, document tags, and highlight-level tags. Web users can navigate paragraph by paragraph and highlight, tag, or note entirely from the keyboard. The browser extension can also highlight the live web page, and those highlights generally synchronize with the normalized Reader version. Mobile supports stylus highlighting. ([highlights, tags, and notes](https://docs.readwise.io/reader/docs/faqs/highlights-tags-notes))

Every Reader highlight immediately syncs into Readwise and can flow onward to note-taking systems. Users can export a document's annotations as Markdown with an editable Jinja2 template, export all highlights under a tag, export library metadata as CSV, export feeds as OPML, or download all source files and article content. ([exporting](https://docs.readwise.io/reader/docs/faqs/exporting))

Readwise supports automatic highlight exports to systems such as Notion, Obsidian, Apple Notes, Evernote, Logseq, Roam, OneNote, Tana, Workflowy, and Markdown/CSV. ([all integrations](https://docs.readwise.io/readwise/docs/all-integrations), [exporting highlights](https://docs.readwise.io/readwise/docs/exporting-highlights))

Implication for Karakeep: Karakeep documents basic notes and highlights, but the deeper opportunity is a per-document notebook with durable highlight anchors, highlight-level notes/tags, video/PDF/image highlighting, backlinks to the source position, and portable exports.

### 5. Organization and triage

Reader separates a durable Library from the incoming Feed. Its default Library workflow can use Inbox/Later/Archive or Later/Shortlist/Archive, while Feed uses Seen/Unseen. Saved filtered views can combine query parameters such as location, category, tags, domain, saved method, publication/save dates, reading time, progress, and highlight count. Views can be pinned, added to Home, split into state-based tabs, and shared. RSS sources can be grouped into folders. ([organizing content](https://docs.readwise.io/reader/docs/organizing-content), [filter syntax](https://docs.readwise.io/reader/guides/filtering/syntax-guide), [filtered views](https://docs.readwise.io/reader/docs/faqs/filtered-views))

The interaction model is optimized for high-volume triage: customizable mobile swipe actions, auto-advance after an action, a command palette, customizable keyboard shortcuts, bulk actions, and bump-to-top. ([navigation](https://docs.readwise.io/reader/docs/faqs/navigation))

Implication for Karakeep: rules and smart lists already give Karakeep a strong automation base. The useful inspiration is the explicit separation between ephemeral subscription intake and intentional library saves, plus very fast triage controls.

### 6. Discovery and resurfacing

Reader's Daily Digest mixes documents from the Feed and Saved for Later into a scrollable queue intended to help users triage new material and rediscover old saves. It can appear on Home and be delivered by email. ([Daily Digest](https://docs.readwise.io/reader/docs/faqs/daily-digest))

Reader's Home can be configured from saved filtered views, enabling personalized shelves such as quick reads, books, recent highlights, a topic, or "currently reading." ([filtered views](https://docs.readwise.io/reader/docs/faqs/filtered-views), [long-form reading workflow](https://docs.readwise.io/reader/guides/workflows/longform-reading))

Reader highlights feed directly into Readwise's separate Daily Review, which resurfaces highlights through the app or email using spaced repetition. This is distinct from Reader's document-level Daily Digest: one revives ideas, while the other revives reading material. ([Reader product page](https://readwise.io/read))

Implication for Karakeep: a small, explainable resurfacing system would address the classic bookmark-hoarding problem—captured content is rarely reopened—without needing a social discovery algorithm.

### 7. Search and AI

Reader performs server-side full-text search across Library document text, titles, and authors, and falls back to on-device search for locally synced documents when offline. Feed bodies are intentionally excluded until moved into the Library. ([searching](https://docs.readwise.io/reader/docs/faqs/searching))

Ghostreader provides document-, passage-, and word-level AI assistance: summarization, definition, explanation, translation, and follow-up chat. Prompts can be customized, and automatic prompts can summarize or tag newly saved documents. Global Ghostreader searches across the entire library and responds with citations linked back to sources. ([Ghostreader overview](https://docs.readwise.io/reader/guides/ghostreader/overview), [custom prompts](https://docs.readwise.io/reader/guides/ghostreader/custom-prompts))

Global Ghostreader also has editable skills for recurring workflows such as topic research, similar-document discovery, and inbox/feed triage. Its write tools can save or move documents, edit metadata, manage tags, and create or edit highlights; users configure each tool as always allowed, confirmation required, or disabled. ([Global Ghostreader](https://docs.readwise.io/reader/guides/ghostreader/global))

Readwise's MCP exposes full-text and semantic search, document/highlight retrieval, tagging, movement, metadata updates, and highlight creation to compatible AI clients. Its CLI can search, save, organize, highlight, and export Reader data. ([MCP documentation](https://docs.readwise.io/tools/mcp), [Readwise changelog](https://docs.readwise.io/changelog))

Implication for Karakeep: Karakeep already has full-text/semantic search, summaries, auto-tagging, CLI, REST, and MCP. The more defensible next step is contextual AI with citations and source navigation, rather than additional one-shot generation.

### 8. Sharing, collaboration, and portability

Users can publish an annotated, distraction-free version of an article, including highlights, notes, and tags. They can share a highlight as an image or create a public "bundle" from a filtered view that recipients can add to Reader. ([sharing](https://docs.readwise.io/reader/docs/faqs/sharing))

Reader is available on web, iOS, Android, macOS, and Windows. Web, desktop, and mobile support offline reading with synchronization on reconnection; mobile caches full document text after the app has had time to sync. It also includes options optimized for Android e-ink devices. ([basics](https://docs.readwise.io/reader/docs/faqs), [e-ink devices](https://docs.readwise.io/reader/docs/faqs/eink))

Implication for Karakeep: collaborative lists are already a Karakeep advantage. Public annotated documents and curated bundles could extend that strength, while complete data export reinforces its ownership promise.

## Prioritized candidate features for Karakeep

Priority definitions:

- **P0:** foundational to turning saved media into a coherent reading product; begin discovery/design now.
- **P1:** high user value and strong strategic fit; build after or alongside the P0 foundations.
- **P2:** useful differentiator or retention feature; sequence after core reader quality is reliable.
- **P3:** specialized or expensive parity feature; validate demand before committing.

| Priority | Candidate | Why it matters | Suggested minimum useful version |
| --- | --- | --- | --- |
| P0 | Timestamped YouTube transcript reader | Builds on existing video capture/archive and is a visible gap versus Reader | Player + time-synced transcript; click text to seek; transcript search; highlights store start/end timestamps and reopen at the right moment |
| P0 | Reading progress and resume | Converts capture into an ongoing reading habit and underpins Home/resurfacing | Last position and percent read synced across web/mobile; Continue Reading shelf; mark finished; progress indicator on cards |
| P0 | Annotation notebook and durable anchors | Makes highlights useful after reading and creates the substrate for export/AI | Per-document notebook; highlight notes and tags; source-context link; text re-anchoring after re-fetch; Markdown export |
| P1 | Contextual document/passage AI with citations | Extends Karakeep's existing search/summarization rather than duplicating it | Ask about document or selected passage; answers cite/highlight source spans; define/explain/translate/summarize actions; local-model compatible |
| P1 | Feed inbox distinct from the durable library | Prevents RSS auto-import from overwhelming meaningful saves | Unseen/seen feed queue; explicit "keep in library" action; source folders; fast swipe/keyboard triage; rules remain available |
| P1 | Reader appearance and accessibility | Relatively contained work with broad daily impact | Serif/sans choices, font size, line height/width, themes, OpenDyslexic/Atkinson Hyperlegible, RTL, distraction-free mode |
| P1 | Text-to-speech with synchronized position | Adds accessibility and makes the archive useful while commuting | Play from current paragraph, speed/voice controls, spoken-text follow, resume position; support articles first |
| P1 | Portable highlight/library export | Fits Karakeep's self-hosted ownership promise and reduces lock-in anxiety | Per-document Markdown; bulk JSON/CSV/Markdown with notes/highlights/tags/source metadata; stable deep links |
| P2 | Daily resurfacing queue | Solves "save and forget" and improves retention | Configurable daily mix of unread, forgotten, favorite, and partially read items; reason shown for each recommendation |
| P2 | Highlight review / spaced resurfacing | Turns annotations into retained knowledge rather than a static archive | Small daily queue of past highlights; again/later/never controls; source context and one-tap reopen; optional email or notification |
| P2 | EPUB and Markdown as first-class reading formats | Expands Karakeep from bookmark archive toward unified reader | Upload, render, progress, highlight, search, and offline cache; EPUB first if demand is stronger |
| P2 | Newsletter email ingestion | Removes inbox friction and complements RSS | Per-user inbound address; sender allowlist; clean/original views; route through rules |
| P2 | Podcast transcript companion | Reuses transcript, annotation, AI, and resurfacing primitives | Save episode URL, generate/read transcript, timestamped highlights, open source player at timestamp; do not build a podcast player initially |
| P2 | Saved views / smart shelves UX | Makes advanced search and rules approachable | Save a query as a named view; pin/reorder on Home; provide templates such as Quick Reads and Unfinished |
| P2 | Keyboard-first triage and command palette | Raises throughput for power users | Palette for move/tag/archive/favorite; next/previous, highlight/note, customizable shortcuts; auto-advance option |
| P2 | Highlight export integrations | Completes the read-to-write loop | Start with Obsidian filesystem/Markdown and Notion; append-only sync; customizable template later |
| P3 | Public annotated pages and curated bundles | Builds on Karakeep's existing sharing/collaboration strengths | Public read-only page with selected annotations; share a static or live smart list as a collection |
| P3 | Enhanced/reflowed PDF reading | Valuable but technically expensive and full of anchoring edge cases | OCR/text view, progress, text highlights, and annotated export; retain original PDF alongside reflowed view |
| P3 | E-ink-specific mode and native desktop apps | Useful to a narrower segment; PWAs/mobile may cover most needs | First test high contrast, reduced motion, and page-turn inputs in existing clients |

## Recommended sequencing

### Phase 1: consumption foundation

Build a shared reading-state and annotation model that works for articles and YouTube transcripts. Ship reading progress, Continue Reading, durable anchors, the annotation notebook, and Markdown export. This avoids implementing each later format as a bespoke silo.

### Phase 2: make captured content easier to consume

Add transcript synchronization, reader appearance controls, document/passage AI, and article TTS. Add the separate Feed inbox and high-speed triage so subscription intake does not degrade the bookmark library.

### Phase 3: retention and format expansion

Add daily resurfacing, saved Home shelves, EPUB/Markdown, newsletter ingestion, and podcast transcripts. These should reuse the reading-state, transcript, annotation, and automation primitives from the first two phases.

### Phase 4: ecosystem and specialist workflows

Add note-app sync, public annotated pages/bundles, richer PDF reflow, and e-ink or desktop-specific experiences based on observed demand.

## Product guardrails

- Preserve Karakeep's identity as the user-owned, self-hostable archive. Reader inspiration should improve consumption without making cloud AI mandatory.
- Prefer shared primitives—content positions, annotations, transcript timestamps, reading state, export records—over format-specific feature islands.
- Keep source media and normalized text together. A transcript, OCR result, or reflowed PDF should never replace the archived original.
- Make AI answers navigable and cited. A plausible answer without a path back to the source weakens trust.
- Keep intake separate from intent. Subscribed content can be transient; manually saved or promoted content belongs in the durable library.
- Measure the read loop, not only capture volume: reopen rate, completion rate, highlights per opened item, Continue Reading usage, and resurfaced-item engagement.

## Official sources

- [What is Readwise Reader?](https://docs.readwise.io/reader/docs)
- [Saving content](https://docs.readwise.io/reader/docs/saving-content)
- [Adding new content](https://docs.readwise.io/reader/docs/faqs/adding-new-content)
- [Importing content](https://docs.readwise.io/reader/docs/faqs/importing-content)
- [Appearance](https://docs.readwise.io/reader/docs/faqs/appearance)
- [YouTube videos](https://docs.readwise.io/reader/docs/faqs/videos)
- [PDFs](https://docs.readwise.io/reader/docs/faqs/pdfs)
- [Text-to-speech](https://docs.readwise.io/reader/docs/faqs/text-to-speech)
- [Highlights, tags, and notes](https://docs.readwise.io/reader/docs/faqs/highlights-tags-notes)
- [Organizing content](https://docs.readwise.io/reader/docs/organizing-content)
- [Filtering syntax](https://docs.readwise.io/reader/guides/filtering/syntax-guide)
- [Searching](https://docs.readwise.io/reader/docs/faqs/searching)
- [Ghostreader overview](https://docs.readwise.io/reader/guides/ghostreader/overview)
- [Daily Digest](https://docs.readwise.io/reader/docs/faqs/daily-digest)
- [Exporting](https://docs.readwise.io/reader/docs/faqs/exporting)
- [Sharing](https://docs.readwise.io/reader/docs/faqs/sharing)
- [Reader basics and offline behavior](https://docs.readwise.io/reader/docs/faqs)
- [Readwise MCP](https://docs.readwise.io/tools/mcp)
- [Readwise and Reader changelog](https://docs.readwise.io/changelog)
