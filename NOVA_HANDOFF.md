# Nova AI Workspace — Handoff

Last updated: 2026-10-04

## 1. Product

Nova is an intelligent AI workspace that keeps conversations, documents, context, and decisions connected.

Core idea:

> One workspace where context stays with the work.

Nova is not intended to feel like a generic chatbot.

---

## 2. Current Architecture

### Frontend
- React
- Vite
- Existing CSS-based design system
- Supabase authentication
- Public landing experience
- Authenticated Nova workspace

### Backend
- FastAPI
- Python
- Hosted LLM provider
- OpenRouter
- NVIDIA Nemotron 3 Ultra
- Supabase
- RAG/document support

Local backend:

http://127.0.0.1:8000

Local frontend:

http://localhost:5173

---

## 3. Authentication

Supabase Email Auth is implemented.

Authenticated workspace requests use:

Authorization: Bearer <access_token>

Protected workspace endpoint remains authenticated.

Public demo must never bypass workspace authentication.

### Public demo flow

Landing page:

POST /demo/chat/stream

Rules:
- no authentication required
- no user memory
- no saved conversation history
- no private RAG
- no uploaded user documents
- no user-specific data persistence
- production demo rate limited
- localhost bypasses demo rate limit for development

### Workspace flow

Authenticated users use the protected chat flow.

The public demo and authenticated workspace must remain separate.

---

## 4. Current Product Routes / States

### Logged out
Show public Nova landing experience.

### Sign in
Show Supabase authentication UI.

### Logged in
Show full Nova workspace.

### Logout
Logout is available from the account area in the workspace sidebar.

---

## 5. Landing Page Structure

Desktop structure:

Context Library | Main Workspace | Thread

### Left — Context Library
Demo sources currently include:
- Research notes
- Launch strategy
- Client call

These demonstrate how Nova can reason across context.

### Center
Headline
Composer
Answer
Sources
Follow-up
Actions

### Right — The Thread
Shows the reasoning/context pipeline.

---

## 6. Composer

Current modes:

- Ask
- Search
- Compare

### Ask
General AI conversation.

It should NOT pretend selected documents were read if they were irrelevant.

Pipeline:

Question received
→ Thinking
→ Answered

### Search
Search/reason over selected context.

Pipeline:

Sources selected
→ Reading
→ Synthesizing
→ Answered

### Compare
Compare at least two selected sources.

Pipeline:

Sources selected
→ Reading
→ Synthesizing
→ Answered

---

## 7. Composer Design

The composer should look like a premium search/AI command bar.

Locked direction:

[ Ask | Search | Compare ]

✦  Ask Nova anything...                         →

Rules:
- no "Ctrl Enter to ask" text
- Enter submits
- Shift + Enter creates new line
- no inner focus rectangle
- only the outer composer receives focus styling
- compact send arrow button
- auto-grow only when needed
- do not make it look like a large textarea form

---

## 8. Answer Experience

The response area contains:

### Answer
Actual model response.

### Sources
Only show sources actually used.

Do not show fake citations.

### Follow-up
Should eventually be generated contextually from the answer.

Avoid generic follow-ups that make no sense for the current answer.

### Actions
Possible actions:
- Summarize
- Compare
- Make plan

Only show actions when they make sense.

---

## 9. Scrolling

Important desktop behavior:

The entire desktop page should NOT scroll.

Only the center workspace / answer area should scroll vertically when the response becomes long.

The following remain fixed:
- header
- context library
- thread panel

Tablet/mobile may use normal single-column scrolling.

---

## 10. Responsive Rules

### >= 1024px
Three-column desktop layout.

Do not redesign the desktop structure.

### < 1024px
Single-column layout.

Context library becomes a horizontal source-card scroller.

Cards approximately 220px wide.

Use snap scrolling.

The Thread becomes a collapsible section below the answer.

Collapsed by default.

### Mobile
Headline approximately 40px.

Answer lead approximately 22px.

Subline approximately 16px.

Composer full width.

Send button optimized for touch.

Minimum tap targets approximately 44px.

No horizontal page overflow.

### < 640px header
Show:
- Nova logo
- Enter Nova

Hide:
- Private by design
- Sign in

Target responsive test widths:
- 390px
- 768px
- desktop 1440px+

---

## 11. Brand / Logo

Current problem:

Landing page and workspace previously used different Nova logos.

This must not continue.

### Official logo direction

Use one consistent Nova identity everywhere.

Official system:

Primary lockup:
Nova symbol + Nova wordmark

Compact UI lockup:
Nova symbol + Nova wordmark

App icon / favicon:
Nova symbol alone

Monochrome:
Only when amber cannot be used.

### Symbol

Use the four-point Nova sparkle/star symbol chosen in the latest brand direction.

Do NOT use:
- old diamond logo
- unrelated orange square logo
- different symbols on different screens

The final logo should be recreated as a proper SVG.

Do not use a cropped AI-generated logo image.

The same SVG identity should be used in:
- landing header
- workspace sidebar
- workspace topbar
- auth screen
- favicon
- mobile header

---

## 12. Visual System

Nova should use ONE design system across landing, auth, and workspace.

Current preferred direction is the earlier darker premium theme rather than the faded brown/autumn version.

Target feeling:
- deep black
- charcoal
- warm amber/orange accent
- high contrast
- restrained glow
- premium
- quiet
- technical
- editorial where appropriate

Avoid:
- muddy brown overlays
- excessive gold everywhere
- generic SaaS gradients
- purple AI styling
- glassmorphism overload
- different themes between landing and workspace

Suggested palette direction:

Background:
#0A0A0B

Deep:
#070708

Sidebar:
#0F0F10

Surface:
#141415

Raised:
#181819

Hover:
#1D1D1F

Primary text:
#F5F1E9

Secondary:
#AAA59C

Muted:
#706D68

Accent:
#ED9A5A

Accent bright:
#FFC07D

Accent deep:
#9D4F28

Borders:
subtle neutral / translucent white

Exact tokens can still be refined before final production lock.

---

## 13. Typography

### Brand / major display
Serif can be used selectively for high-level presentation.

### Product UI
Use clean sans-serif UI typography.

### Answers
Do not render an entire long AI answer as giant serif text.

Preferred:

Lead paragraph:
Newsreader / editorial treatment

Body:
Inter / Geist-style sans serif

Support:
- headings
- lists
- code
- inline code
- links
- citations
- paragraphs

Markdown must render properly.

Never display raw:

**bold**

or other Markdown syntax to the user.

---

## 14. Existing Workspace

The existing authenticated workspace must not be broken while improving the landing page.

Preserve:
- conversations
- New chat
- streaming chat
- document upload
- authentication
- sidebar
- conversation selection
- hosted model status
- Supabase integration

---

## 15. Account Area

The account UI belongs near the bottom of the sidebar.

Preferred structure:

avatar / initials
email
workspace/account label
expand control

Expanded account menu:
- Log out

Do not use a giant isolated "LOG OUT" button.

Keep account controls compact and organized.

---

## 16. AI Provider

Primary hosted model:

nvidia/nemotron-3-ultra-550b-a55b

Fallback may use OpenRouter free routing when configured.

Do not hardcode API keys.

Environment variables remain private.

---

## 17. Privacy / Security

Never expose:
- service-role keys
- API keys
- Supabase secrets
- access tokens

Public demo has no access to private workspace data.

Authenticated backend endpoints must continue verifying the Supabase access token.

Backend service-role behavior must always scope data explicitly to user_id.

---

## 18. Current Development Priorities

### Priority 1 — Brand lock
Create official Nova SVG logo system.

Implement the same logo everywhere.

### Priority 2 — Design system consolidation
Create shared visual tokens/components instead of maintaining unrelated landing/workspace styling.

### Priority 3 — Landing AI intelligence
Improve:
- actual source-use detection
- source citations
- contextual follow-ups
- intelligent actions

### Priority 4 — Workspace integration
Bring Ask / Search / Compare concepts into the actual authenticated Nova workspace where appropriate.

### Priority 5 — Durable memory
Current conversation context is not the final cross-chat memory system.

Future durable user memory should be designed intentionally.

---

## 19. Engineering Rules Going Forward

1. Do not redesign unrelated areas while fixing one component.
2. Preserve working authentication.
3. Preserve backend security.
4. Never replace real AI with hardcoded demo answers.
5. Never show fake citations.
6. Landing and workspace must share one brand.
7. Test desktop and mobile before declaring UI complete.
8. Check authenticated and unauthenticated flows after frontend changes.
9. Keep generated/temp files out of Git.
10. Keep secrets out of source control.
11. Use complete, understandable components rather than accumulating CSS patches.
12. Before committing, test:
   - landing
   - public demo AI
   - sign in
   - workspace
   - chat
   - logout
   - 1440px
   - 768px
   - 390px

---

## 20. Immediate Next Step

Stop changing unrelated UI.

Next task:

Create the final Nova logo as a clean SVG system and replace all inconsistent Nova branding with that shared component.

After branding is unified, continue core Nova product development.