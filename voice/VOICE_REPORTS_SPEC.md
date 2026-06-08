# Voice Reports — Design Spec (exact)

Build the Voice Reports dashboard to these values. The reference file
`VoiceReports.reference.jsx` in this folder is this spec written as real React —
copy its markup/styles. Uses the SkillHub CSS variables already in
`src/index.css` (no hard-coded hex) + `lucide-react`.

## Language
Keep all labels in Uzbek exactly as below. Do NOT translate.

## Layout
- Lives on the existing `/voice-reports` route inside the normal app shell
  (sidebar + header). Worker sees their own recorder + history. CEO/PM sees the
  team feed.
- Content column: `max-width: 760px` (worker recorder uses up to 600), centered,
  `padding: 28px 40px`.
- Page header: mic icon (salmon) + title 22/700 + tertiary subtitle.
  - Worker title: **Ovozli hisobot** · sub: *Gapiring — tizim avtomatik tarzda
    Kecha / To'siqlar / Bugun bo'limlariga ajratadi. Siz tekshirib tasdiqlaysiz.*
  - CEO title: **Jamoa hisobotlari** · sub: *Har bir xodimning kunlik hisoboti —
    qisqacha, ovoz yozuvi va savol-javob bilan.*

## Tokens (already defined)
Surfaces `--bg-primary/secondary/tertiary`; text `--text-primary/secondary/tertiary`;
borders `--border-color`; accent `--accent-primary` (+ `-text/-muted/-border`);
success `--accent-success-text/-muted/-border`; warning `--accent-warning-text/-muted`;
danger `--alert-error-text/-bg/-border`. Mono = `ui-monospace, Menlo`.

## States (worker)
1. **Idle** — recorder card (`--bg-secondary`, 1px border, radius 16, min-h 300,
   content centered). 88px mic button (`--accent-primary-muted` bg, salmon mic),
   with a `vrPulse` ring animating outward. Title "Bugungi hisobotni ovozli
   ayting" 16/600, hint line, and a pill chip: "✦ AI avtomatik bo'limlarga
   ajratadi · 3–5 daqiqa".
2. **Recording** — animated waveform (30 bars, `vrBar` keyframe), mono timer
   34/700 (m:ss), 72px stop button (square, `--alert-error-bg` + danger border),
   line with a red dot: "Yozilmoqda… tugatganda to'xtatish tugmasini bosing".
3. **Preview** — "Yozib olindi · {dur}", custom `<AudioBar>` (salmon play circle +
   scrubber + mono times), buttons: secondary "↺ Qayta yozish" + primary
   "Yuborish ➤".
4. **AI processing** — card titled "AI hisobotni tahlil qilmoqda…" (spinner) +
   sub; three section labels each with 3 shimmer bars (`vrShim`).
5. **Review & edit** — card titled "✦ Tekshiring va kerak bo'lsa tahrirlang".
   Three editable `<textarea>` sections:
     • KECHA BAJARILGAN — label `--accent-success-text`, check icon
     • TO'SIQLAR — label `--alert-error-text`, alert-triangle icon
     • BUGUN REJALASHTIRILGAN — label `--accent-primary-text`, list icon
   Collapsible "To'liq transkript (ixtiyoriy tahrir)", an `<AudioBar>`, footer:
   ghost "Bekor qilish" + primary "✓ Tasdiqlash va yuborish".
6. **History** — eyebrow "Oldingi hisobotlarim", then report cards: date +
   status badge (Tasdiqlangan = success / Ko'rib chiqilmoqda = warning) + the
   three sections (read-only).

## CEO / PM feed
Eyebrow none; a list of team report cards. Each card:
- Worker avatar (success tone) + name + date + status badge.
- The three sections (read-only).
- `<AudioBar>` + "To'liq transkript" toggle.
- **AI Q&A block** (top border, salmon eyebrow "Hisobot bo'yicha AI savol-javob"):
  prior exchanges as chat bubbles — question bubble (avatar "D", `--bg-tertiary`)
  and answer bubble (sparkle avatar, `--bg-primary`), both with a clipped
  top-left corner (borderTopLeftRadius 3). Input row: "Bu hisobot bo'yicha savol
  bering…" + salmon send button.

## Section block anatomy (shared)
Eyebrow label (11/700, 0.06em, UPPERCASE, tone color) + icon, then either a
read-only paragraph (13.5/1.65, `--text-secondary`) or an editable textarea
(`--bg-primary` bg, 1px border, radius 10, 13.5/1.6).

## AudioBar anatomy
Row: `--bg-primary` bg, 1px border, radius 10. 32px salmon play circle (dark
glyph) + mono current time + 4px track (filled salmon) + mono duration. Wrap the
real `<audio>` element's controls behind this — never show the raw browser
player.

## Motion
`vrPulse` 2.4s (idle ring), `vrBar` ~0.7–1.3s (waveform), `vrShim` 1.4s
(processing). Respect `prefers-reduced-motion`.

## Hard rules
No hard-coded hex. No raw `<audio>`/`<select>` chrome. Mono for timer + times.
1px hairline borders. One salmon accent. Keep Uzbek labels verbatim. Works in
light + dark (tokens handle it).
