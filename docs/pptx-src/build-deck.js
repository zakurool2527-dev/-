const pptxgen = require("pptxgenjs");

/* ── Design tokens (carried over from the HTML deck) ───────── */
const C = {
  ink:    "111820",
  ink2:   "4C5762",
  ink3:   "7B8792",
  panel:  "F2F5F7",
  panel2: "E7ECF0",
  rule:   "D4DAE0",
  white:  "FFFFFF",
  codex:  "0B5E78",
  claude: "8A6B1F",
  yes:    "2C7A50",
  no:     "AE3B33",
  // on dark
  dInk:   "E7EDF2",
  dInk2:  "A5B1BB",
  dInk3:  "78858F",
  dPanel: "1B232A",
  dRule:  "2B353E",
  dCodex: "5CB7D6",
  dClaude:"D6AC55",
  dYes:   "5FBE8A",
  dNo:    "E2776C",
};

const JP = "Yu Gothic";
const MONO = "Courier New";

const W = 13.333, H = 7.5;
const M = 0.62;                 // side margin
const CW = W - M * 2;           // content width

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Claude Code";
pres.title = "Codex と Claude Code の OS 差分";

let n = 0;
const TOTAL = 17;

/* ── Slide chrome ──────────────────────────────────────────── */
function newSlide({ eyebrow, title, lead, section, dark = false }) {
  n++;
  const s = pres.addSlide();
  const t = dark
    ? { bg: C.ink, ink: C.dInk, ink2: C.dInk2, ink3: C.dInk3, rule: C.dRule }
    : { bg: C.white, ink: C.ink, ink2: C.ink2, ink3: C.ink3, rule: C.rule };
  s.background = { color: t.bg };

  if (eyebrow) {
    s.addText(eyebrow, {
      x: M, y: 0.38, w: CW, h: 0.24, isTextBox: true, margin: 0,
      fontFace: MONO, fontSize: 10, bold: true, charSpacing: 1.6,
      color: t.ink3, valign: "middle",
    });
  }
  if (title) {
    s.addText(title, {
      x: M, y: 0.66, w: CW, h: 0.62, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 26, bold: true, color: t.ink, valign: "middle",
    });
  }
  if (lead) {
    s.addText(lead, {
      x: M, y: 1.33, w: CW, h: 0.42, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 12, color: t.ink2, lineSpacingMultiple: 1.3,
      valign: "top",
    });
  }

  // footer
  s.addShape(pres.ShapeType.line, {
    x: M, y: 6.92, w: CW, h: 0, line: { color: t.rule, width: 0.75 },
  });
  s.addText(section, {
    x: M, y: 6.99, w: CW * 0.7, h: 0.26, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9, color: t.ink3, charSpacing: 1.2, valign: "middle",
  });
  s.addText(`${String(n).padStart(2, "0")} / ${TOTAL}`, {
    x: M + CW * 0.7, y: 6.99, w: CW * 0.3, h: 0.26, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9, color: t.ink2, align: "right", valign: "middle",
  });
  s._t = t;
  return s;
}

const bodyY = (hasLead) => (hasLead ? 1.92 : 1.46);

/* ── Reusable pieces ───────────────────────────────────────── */

// small outlined label, e.g. macOS / Windows / 二次情報
function chip(s, x, y, text, color, dashed = false) {
  const w = 0.14 + text.length * 0.085;
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h: 0.22, rectRadius: 0.03,
    fill: { color: "FFFFFF", transparency: 100 },
    line: { color, width: 0.75, dashType: dashed ? "dash" : "solid" },
  });
  s.addText(text, {
    x, y, w, h: 0.22, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 8, bold: true, color,
    align: "center", valign: "middle",
  });
  return w;
}

// tinted card with a coloured heading
function card(s, { x, y, w, h, head, headColor, items, fill, dark, headChip }) {
  const t = s._t;
  s.addShape(pres.ShapeType.rect, {
    x, y, w, h, fill: { color: fill || (dark ? C.dPanel : C.panel) },
    line: { color: dark ? C.dRule : C.rule, width: 0.75 },
  });
  const chipW = headChip ? 0.14 + headChip.length * 0.085 + 0.14 : 0;
  s.addText(head, {
    x: x + 0.22, y: y + 0.16, w: w - 0.44 - chipW, h: 0.26, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9.5, bold: true, charSpacing: 1.2,
    color: headColor, valign: "middle",
  });
  if (headChip) chip(s, x + w - 0.22 - (chipW - 0.14), y + 0.17, headChip, C.ink3, true);
  s.addText(
    items.map((it, i) => ({
      text: it,
      options: { bullet: { characterCode: "2013" }, breakLine: i < items.length - 1 },
    })),
    {
      x: x + 0.22, y: y + 0.5, w: w - 0.44, h: h - 0.68, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: t.ink2,
      lineSpacingMultiple: 1.34, paraSpaceAfter: 7, valign: "top",
    }
  );
}

// summary bar at the bottom of a slide
function takeaway(s, y, runs, alert = false) {
  const t = s._t;
  const h = 0.82;
  s.addShape(pres.ShapeType.rect, {
    x: M, y, w: CW, h, fill: { color: alert ? "FBF1F0" : C.panel },
    line: { color: alert ? C.no : C.rule, width: alert ? 1 : 0.75 },
  });
  s.addText(runs, {
    x: M + 0.26, y: y + 0.08, w: CW - 0.52, h: h - 0.16, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 10.5, color: t.ink2,
    lineSpacingMultiple: 1.3, valign: "middle",
  });
}

// footnote line
function note(s, y, runs) {
  s.addText(runs, {
    x: M, y, w: CW, h: 0.4, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 9, color: s._t.ink3, lineSpacingMultiple: 1.25, valign: "top",
  });
}

// status glyph + label
const st = (kind, label, color) => {
  const g = kind === "yes" ? "●" : kind === "no" ? "✕" : "○";
  return [
    { text: g + " ", options: { fontFace: JP, fontSize: 11, bold: true, color } },
    { text: label, options: { fontFace: JP, fontSize: 11, bold: true, color } },
  ];
};

// standard matrix table
function matrix(s, { y, rows, colW, rowH, headFills }) {
  const t = s._t;
  s.addTable(rows, {
    x: M, y, w: CW, colW, rowH,
    border: { type: "solid", color: C.rule, pt: 0.75 },
    fontFace: JP, fontSize: 10.5, color: t.ink2,
    valign: "top", autoPage: false,
  });
  return y;
}

/* ═══════════════════════════════════════════════════════════
   01 — Title (dark)
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "DEVELOPER TOOLING BRIEF  ·  2026.08.18",
    section: "CODEX x CLAUDE CODE / OS CAPABILITY MATRIX",
    dark: true,
  });

  s.addText("Codex と Claude Code、\nWindows と macOS で\n何が違うのか", {
    x: M, y: 1.5, w: 7.3, h: 2.2, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 30, bold: true, color: C.dInk,
    lineSpacingMultiple: 1.28, valign: "middle",
  });

  s.addText(
    "同じ「ターミナル型コーディングエージェント」でも、OS の境界機構が違えば、できることが変わります。" +
    "サンドボックス・シェル実行・デスクトップ操作の 3 点を軸に、両製品の Windows 版と macOS 版を実装レベルで対比します。",
    {
      x: M, y: 3.92, w: 7.0, h: 1.1, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 12, color: C.dInk2, lineSpacingMultiple: 1.45, valign: "top",
    }
  );

  s.addText(
    [
      { text: "Codex", options: { fontFace: MONO, fontSize: 15, bold: true, color: C.dCodex } },
      { text: "   against   ", options: { fontFace: MONO, fontSize: 10, color: C.dInk3 } },
      { text: "Claude Code", options: { fontFace: MONO, fontSize: 15, bold: true, color: C.dClaude } },
    ],
    { x: M, y: 5.18, w: 7.0, h: 0.4, isTextBox: true, margin: 0, valign: "middle" }
  );

  // Thesis card
  const cx = 8.35, cy = 1.62, cw = 4.35, ch = 3.75;
  s.addShape(pres.ShapeType.rect, {
    x: cx, y: cy, w: cw, h: ch,
    fill: { color: C.dPanel }, line: { color: C.dRule, width: 1 },
  });
  s.addText("結論を先に — サンドボックスは効くか", {
    x: cx + 0.28, y: cy + 0.24, w: cw - 0.56, h: 0.3, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 10, bold: true, color: C.dInk3, valign: "middle",
  });
  s.addShape(pres.ShapeType.line, {
    x: cx + 0.28, y: cy + 0.62, w: cw - 0.56, h: 0,
    line: { color: C.dRule, width: 0.75 },
  });

  const colX = [cx + 0.28, cx + 2.35, cx + 3.32];
  s.addText("Codex", {
    x: colX[1], y: cy + 0.74, w: 0.9, h: 0.26, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9, bold: true, color: C.dCodex, align: "center", valign: "middle",
  });
  s.addText("Claude", {
    x: colX[2], y: cy + 0.74, w: 0.9, h: 0.26, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9, bold: true, color: C.dClaude, align: "center", valign: "middle",
  });

  const trows = [
    ["macOS", "yes", "yes"],
    ["Windows ネイティブ", "yes", "no"],
    ["WSL2", "yes", "yes"],
  ];
  trows.forEach((r, i) => {
    const ry = cy + 1.1 + i * 0.52;
    const hit = i === 1;
    if (hit) {
      s.addShape(pres.ShapeType.rect, {
        x: cx + 0.14, y: ry - 0.04, w: cw - 0.28, h: 0.46,
        fill: { color: "24303A" }, line: { color: "24303A", width: 0.5 },
      });
    }
    s.addShape(pres.ShapeType.line, {
      x: cx + 0.28, y: ry - 0.06, w: cw - 0.56, h: 0,
      line: { color: C.dRule, width: 0.5 },
    });
    s.addText(r[0], {
      x: colX[0], y: ry, w: 2.0, h: 0.38, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, bold: hit, color: C.dInk, valign: "middle",
    });
    [1, 2].forEach((k) => {
      s.addText(r[k] === "yes" ? "●" : "✕", {
        x: colX[k], y: ry, w: 0.9, h: 0.38, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: r[k] === "yes" ? 12 : 14, bold: true,
        color: r[k] === "yes" ? C.dYes : C.dNo,
        align: "center", valign: "middle",
      });
    });
  });

  s.addShape(pres.ShapeType.line, {
    x: cx + 0.28, y: cy + 2.82, w: cw - 0.56, h: 0, line: { color: C.dRule, width: 0.75 },
  });
  s.addText(
    [
      { text: "この 1 セル", options: { fontFace: JP, fontSize: 9.5, bold: true, color: C.dNo } },
      { text: "が、Windows での運用設計を分けます。実装の詳細は 05〜08 枚目。", options: { fontFace: JP, fontSize: 9.5, color: C.dInk3 } },
    ],
    { x: cx + 0.28, y: cy + 2.95, w: cw - 0.56, h: 0.6, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3, valign: "top" }
  );

  s.addNotes("導入。比較の軸は3つ（サンドボックス／シェル／デスクトップ操作）。右のカードが本資料の結論そのもの。");
}

/* ═══════════════════════════════════════════════════════════
   02 — Executive summary (dark)
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "結論",
    title: "差は「OS の隔離機構をどこまで使えるか」に集約される",
    section: "EXECUTIVE SUMMARY",
    dark: true,
  });

  const items = [
    {
      h: "サンドボックス — ネイティブ Windows で明暗が分かれる",
      b: "Claude Code のサンドボックスは macOS・Linux・WSL2 でのみ動作し、ネイティブ Windows では非対応。一方 Codex は Windows 専用のサンドボックス（制限付きトークン方式）を実装し、3 OS すべてで隔離が効きます。Windows で Claude Code に強い隔離を求めるなら、WSL2 に寄せるのが唯一の道です。",
    },
    {
      h: "シェル — Windows での「素の実行環境」が違う",
      b: "Codex は Windows で PowerShell をネイティブに扱います。Claude Code は Git for Windows を入れれば Git Bash 経由の Bash ツール、入れなければ PowerShell ツールに切り替わる二段構え。同じプロンプトでも生成されるコマンドの方言が変わります。",
    },
    {
      h: "デスクトップ操作 — macOS だけが「並列・背後で」動く",
      b: "Codex の Computer Use は macOS ではバックグラウンドで複数エージェントが並列動作し、ユーザーの作業を妨げません。Windows ではアクティブデスクトップ上でのみ動作し、実行中はポインタと前面を占有します。",
    },
  ];

  items.forEach((it, i) => {
    const y = 1.72 + i * 1.66;
    s.addText(String(i + 1).padStart(2, "0"), {
      x: M, y, w: 0.9, h: 0.5, isTextBox: true, margin: 0,
      fontFace: MONO, fontSize: 26, bold: true, color: C.dInk3, valign: "top",
    });
    s.addText(it.h, {
      x: M + 1.0, y, w: CW - 1.0, h: 0.34, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 14, bold: true, color: C.dInk, valign: "middle",
    });
    s.addText(it.b, {
      x: M + 1.0, y: y + 0.4, w: CW - 1.0, h: 0.95, isTextBox: true, margin: 0,
      fontFace: JP, fontSize: 10.5, color: C.dInk2, lineSpacingMultiple: 1.38, valign: "top",
    });
    if (i < items.length - 1) {
      s.addShape(pres.ShapeType.line, {
        x: M, y: y + 1.45, w: CW, h: 0, line: { color: C.dRule, width: 0.75 },
      });
    }
  });
  chip(s, M + 1.0, 6.52, "二次情報", C.dInk3, true);
  s.addNotes("3点に集約。1が最も重い。3はmacOS/Windowsの差が最も大きい項目。");
}

/* ═══════════════════════════════════════════════════════════
   03 — Product landscape
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "前提の整理",
    title: "まず「Codex」「Claude Code」の指す範囲を揃える",
    lead: "どちらも単一の製品ではなく 4 レイヤーの製品群です。OS 差はレイヤーごとに現れ方が違うため、比較の粒度を先に固定します。",
    section: "PRODUCT LANDSCAPE",
  });

  const hcell = (txt, color) => ({
    text: txt,
    options: { fontFace: MONO, fontSize: 9.5, bold: true, color, fill: { color: C.panel2 }, valign: "middle", margin: [6, 8, 6, 8] },
  });
  const cell = (main, sub, fill) => ({
    text: [
      { text: main, options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink, breakLine: !!sub } },
      ...(sub ? [{ text: sub, options: { fontFace: JP, fontSize: 9.5, color: C.ink2 } }] : []),
    ],
    options: { fill: { color: fill }, valign: "middle", margin: [7, 9, 7, 9] },
  });
  const rowhead = (txt, sub) => ({
    text: [
      { text: txt, options: { fontFace: JP, fontSize: 11, bold: true, color: C.ink, breakLine: true } },
      { text: sub, options: { fontFace: JP, fontSize: 9, color: C.ink3 } },
    ],
    options: { fill: { color: C.panel }, valign: "middle", margin: [7, 9, 7, 9] },
  });

  matrix(s, {
    y: 2.0,
    colW: [2.1, 5.0, 4.99],
    rowH: [0.34, 0.86, 0.86, 0.86, 0.62],
    rows: [
      [hcell("レイヤー", C.ink3), hcell("CODEX（OpenAI）", C.codex), hcell("CLAUDE CODE（Anthropic）", C.claude)],
      [
        rowhead("CLI", "ターミナル本体"),
        cell("Codex CLI（Rust 実装）", "macOS / Linux / Windows ネイティブ / WSL2", "EAF1F4"),
        cell("claude（ネイティブバイナリ）", "macOS 13+ / Windows 10 1809+ / Ubuntu 20.04+ / Debian 10+ / Alpine 3.19+", "F5F1E6"),
      ],
      [
        rowhead("デスクトップ", "GUI アプリ"),
        cell("Codex app", "macOS 先行（2026-02）→ Windows（2026-03-04）", "EAF1F4"),
        cell("Claude デスクトップアプリの Code タブ", "macOS（Universal）/ Windows（x64・ARM64）/ Linux（beta）", "F5F1E6"),
      ],
      [
        rowhead("クラウド", "ブラウザ実行"),
        cell("Codex Web", "OS 非依存。ローカル OS の制約を受けない", "EAF1F4"),
        cell("Claude Code on the web", "OS 非依存。デスクトップの Cloud セッションと同一基盤", "F5F1E6"),
      ],
      [
        rowhead("IDE 拡張", "エディタ統合"),
        cell("Codex IDE 拡張（VS Code 系）", "", "EAF1F4"),
        cell("VS Code 拡張 / JetBrains プラグイン", "", "F5F1E6"),
      ],
    ],
  });

  note(s, 6.3, [
    { text: "本資料の対象： ", options: { fontFace: JP, fontSize: 9, bold: true, color: C.ink2 } },
    { text: "OS 差が実際に効くのは CLI とデスクトップの 2 レイヤーです。クラウド実行はどちらも OS 非依存のため、以降は扱いません。", options: { fontFace: JP, fontSize: 9, color: C.ink3 } },
  ]);
  s.addNotes("用語を揃えるスライド。以降はCLIとデスクトップに絞る。");
}

/* ═══════════════════════════════════════════════════════════
   04 — Installation
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "導入",
    title: "対応 OS とインストール経路",
    section: "INSTALLATION",
  });

  const hcell = (txt, color) => ({
    text: txt,
    options: { fontFace: MONO, fontSize: 9.5, bold: true, color, fill: { color: C.panel2 }, valign: "middle", margin: [6, 8, 6, 8] },
  });
  const rh = (txt) => ({
    text: txt,
    options: { fontFace: JP, fontSize: 11, bold: true, color: C.ink, fill: { color: C.panel }, valign: "middle", margin: [6, 9, 6, 9] },
  });
  const cc = (runs, fill) => ({ text: runs, options: { fill: { color: fill }, valign: "middle", margin: [6, 9, 6, 9] } });
  const code = (t, br) => ({ text: t, options: { fontFace: MONO, fontSize: 9.5, color: C.ink, breakLine: !!br } });
  const jp = (t, br, bold) => ({ text: t, options: { fontFace: JP, fontSize: 10, color: bold ? C.ink : C.ink2, bold: !!bold, breakLine: !!br } });

  matrix(s, {
    y: 1.5,
    colW: [1.85, 5.12, 5.12],
    rowH: [0.34, 0.78, 0.86, 0.58, 0.86, 0.86],
    rows: [
      [hcell("項目", C.ink3), hcell("CODEX", C.codex), hcell("CLAUDE CODE", C.claude)],
      [
        rh("macOS"),
        cc([code("curl -fsSL https://chatgpt.com/codex/install.sh | sh", true), code("brew install --cask codex", true), code("npm i -g @openai/codex")], "EAF1F4"),
        cc([code("curl -fsSL https://claude.ai/install.sh | bash", true), code("brew install --cask claude-code", true), jp("（@latest cask で最新チャンネル）")], "F5F1E6"),
      ],
      [
        rh("Windows"),
        cc([code("irm https://chatgpt.com/codex/install.ps1 | iex", true), jp("Codex app は Microsoft Store / ", true), code("winget install Codex -s msstore")], "EAF1F4"),
        cc([code("irm https://claude.ai/install.ps1 | iex", true), jp("（PowerShell）／ CMD は install.cmd", true), code("winget install Anthropic.ClaudeCode")], "F5F1E6"),
      ],
      [
        rh("Linux / WSL"),
        cc([jp("macOS と同一のインストーラ")], "EAF1F4"),
        cc([jp("同一のインストーラ ＋ 署名付き apt / dnf / apk リポジトリ")], "F5F1E6"),
      ],
      [
        rh("自動更新"),
        cc([jp("ネイティブインストーラ経由で更新")], "EAF1F4"),
        cc([jp("ネイティブはバックグラウンド自動更新。", true, true), jp("Homebrew / WinGet / apt 系は手動。", true), jp("autoUpdatesChannel で latest / stable を選択、minimumVersion で下限を固定")], "F5F1E6"),
      ],
      [
        rh("コード署名"),
        cc([jp("配布物は公式リリースから取得")], "EAF1F4"),
        cc([jp("macOS＝Anthropic PBC 署名 ＋ Apple 公証", true, true), jp("Windows＝Authenticode「Anthropic, PBC」", true), jp("Linux＝個別署名なし（署名付きマニフェストで検証）")], "F5F1E6"),
      ],
    ],
  });

  note(s, 6.35, [
    { text: "補足： ", options: { fontFace: JP, fontSize: 9, bold: true, color: C.ink2 } },
    { text: "Claude Code の npm パッケージは Node.js 22+ が必要（v2.1.198 以降）。対応プラットフォームに win32-x64 / win32-arm64 / darwin-arm64 / darwin-x64 を含みます。", options: { fontFace: JP, fontSize: 9, color: C.ink3 } },
  ]);
  s.addNotes("導入経路はほぼ対等。差が出るのは自動更新と署名まわりの運用。");
}

/* ═══════════════════════════════════════════════════════════
   05 — THE sandbox matrix
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "核心 — 対比マトリクス",
    title: "サンドボックス対応表：ここが最大の分岐点",
    section: "SANDBOX MATRIX",
  });

  const hcell = (txt, color) => ({
    text: txt,
    options: { fontFace: MONO, fontSize: 9.5, bold: true, color, fill: { color: C.panel2 }, valign: "middle", margin: [6, 8, 6, 8] },
  });
  const rh = (txt, sub) => ({
    text: [
      { text: txt, options: { fontFace: JP, fontSize: 11, bold: true, color: C.ink, breakLine: !!sub } },
      ...(sub ? [{ text: sub, options: { fontFace: JP, fontSize: 9, color: C.ink3 } }] : []),
    ],
    options: { fill: { color: C.panel }, valign: "middle", margin: [6, 9, 6, 9] },
  });
  const cc = (kind, label, detail, fill) => ({
    text: [
      ...st(kind, label + "   ", kind === "no" ? C.no : kind === "yes" ? C.yes : C.ink3).map((r, i) =>
        i === 1 ? { ...r, options: { ...r.options, breakLine: true } } : r
      ),
      { text: detail, options: { fontFace: JP, fontSize: 9.5, color: C.ink2 } },
    ],
    options: { fill: { color: fill }, valign: "middle", margin: [6, 9, 6, 9] },
  });

  matrix(s, {
    y: 1.5,
    colW: [2.3, 4.9, 4.89],
    rowH: [0.34, 0.72, 0.72, 0.82, 0.72, 0.62],
    rows: [
      [hcell("実行環境", C.ink3), hcell("CODEX", C.codex), hcell("CLAUDE CODE", C.claude)],
      [
        rh("macOS"),
        cc("yes", "対応", "Seatbelt。/usr/bin/sandbox-exec を絶対パスで呼び、.sbpl ポリシーを埋め込み", "EAF1F4"),
        cc("yes", "対応", "Seatbelt。OS 内蔵のためインストール作業は不要", "F5F1E6"),
      ],
      [
        rh("Linux"),
        cc("yes", "対応", "Landlock（FS）＋ seccomp（syscall）。bubblewrap 経路も実装", "EAF1F4"),
        cc("yes", "対応", "bubblewrap（FS）＋ socat（ネットワーク）。seccomp フィルタは任意で追加", "F5F1E6"),
      ],
      [
        rh("Windows ネイティブ", "PowerShell / CMD"),
        cc("yes", "対応", "Windows 専用実装。elevated（推奨）と unelevated の 2 モード", "EAF1F4"),
        cc("no", "非対応", "公式ドキュメント：「The sandbox does not run on native Windows」。承認モデルのみが防御線", "F5F1E6"),
      ],
      [
        rh("WSL2"),
        cc("yes", "対応", "Linux 実装をそのまま利用。ネイティブサンドボックスが使えない環境の逃げ道", "EAF1F4"),
        cc("yes", "対応", "Linux と同一（bubblewrap）。Windows で隔離を得る唯一の手段", "F5F1E6"),
      ],
      [
        rh("WSL1"),
        cc("cond", "実質対象外", "", "EAF1F4"),
        cc("no", "非対応", "bubblewrap が要求するカーネル機能が WSL1 に無いため", "F5F1E6"),
      ],
    ],
  });

  // legend
  const lg = [
    ["●", C.yes, "対応"], ["○", C.ink3, "条件付き / 対象外"], ["✕", C.no, "非対応"],
  ];
  let lx = M;
  lg.forEach(([g, col, lab]) => {
    s.addText([
      { text: g + " ", options: { fontFace: JP, fontSize: 10, bold: true, color: col } },
      { text: lab, options: { fontFace: JP, fontSize: 9.5, color: C.ink3 } },
    ], { x: lx, y: 5.72, w: 1.7, h: 0.24, isTextBox: true, margin: 0, valign: "middle" });
    lx += 1.75;
  });

  takeaway(s, 6.0, [
    { text: "この表の読み方： ", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink } },
    { text: "両者とも macOS・Linux では OS 標準の隔離機構を使っており、差はほとんどありません。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
    { text: "分岐するのはネイティブ Windows の 1 行だけ", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.no } },
    { text: "です。Codex は Windows 用の隔離機構を自前で実装したのに対し、Claude Code は実装せず「WSL2 を使ってください」という設計判断をしています。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ], true);

  s.addNotes("本資料の中心。ここだけ覚えて帰ってもらえればよい。Windows ネイティブの1行が全て。");
}

/* ═══════════════════════════════════════════════════════════
   06 — Codex internals (3 cards)
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "実装の内訳 — CODEX",
    title: "Codex は OS ごとに別々の隔離機構を実装している",
    section: "CODEX SANDBOX INTERNALS",
  });

  const cw = (CW - 0.4) / 3;
  const data = [
    { head: "macOS — SEATBELT", items: [
      "Apple Seatbelt を /usr/bin/sandbox-exec 経由で使用。PATH ではなく絶対パスで呼ぶことでパス乗っ取りに耐性を持たせている",
      ".sbpl ポリシーをバイナリに埋め込み（基本ポリシーとネットワークポリシーを分離）",
      "ネットワークはループバックと検出したプロキシポートに縮退",
    ]},
    { head: "LINUX — LANDLOCK", items: [
      "Landlock（カーネル 5.13+）でファイルシステム、seccomp でシステムコールを制限。root 権限は不要",
      "読み取りは広く許可、書き込みは許可ディレクトリと /dev/null に限定するのが既定の考え方",
      "bubblewrap 経路も実装されており、環境に応じて選択される",
    ]},
    { head: "WINDOWS — 制限付きトークン", items: [
      "Seatbelt / Landlock に相当する仕組みが無いため、Windows 独自の実装を用意している",
      "合成 SID と write-restricted token、ACL によるファイル境界が中核",
      "モードにより強度が変わる（次スライド）",
    ]},
  ];
  data.forEach((d, i) => {
    card(s, { x: M + i * (cw + 0.2), y: 1.5, w: cw, h: 2.95, head: d.head, headColor: C.codex, items: d.items });
  });

  takeaway(s, 4.66, [
    { text: "設計思想の違い： ", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink } },
    { text: "Codex は 3 つの OS すべてに隔離実装を用意し、サンドボックスを既定で有効にする方針を採っています。対する Claude Code は /sandbox でモードと境界を設定する方式で、隔離が成立するのは macOS・Linux・WSL2 に限られます。「どの OS でも同じ強度を出す」か「OS が提供する機構がある環境に絞る」か、という方針の差として捉えると理解しやすくなります。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ]);
  chip(s, M, 5.62, "二次情報", C.ink3, true);

  note(s, 5.95, [
    { text: "確認方法： ", options: { fontFace: JP, fontSize: 9, bold: true, color: C.ink2 } },
    { text: "実装ファイルは openai/codex リポジトリの codex-rs/sandboxing/src/ に seatbelt.rs / landlock.rs / bwrap.rs / windows.rs として存在し、OS 別に分かれていることが確認できます。", options: { fontFace: JP, fontSize: 9, color: C.ink3 } },
  ]);
  s.addNotes("3OSそれぞれ別実装。リポジトリのファイル構成で裏取り可能。");
}

/* ═══════════════════════════════════════════════════════════
   07 — elevated vs unelevated
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "WINDOWS 深掘り — CODEX",
    title: "elevated と unelevated：同じ Windows でも隔離の強さが違う",
    lead: "Codex の Windows サンドボックスは 2 モードあり、管理者権限の有無で選べる強度が変わります。ここは Windows 版だけに存在する意思決定ポイントです。",
    section: "CODEX ON WINDOWS",
  });

  const hcell = (txt, color, mono) => ({
    text: txt,
    options: { fontFace: mono ? MONO : JP, fontSize: mono ? 10 : 9.5, bold: true, color, fill: { color: C.panel2 }, valign: "middle", margin: [6, 8, 6, 8] },
  });
  const rh = (txt) => ({
    text: txt,
    options: { fontFace: JP, fontSize: 11, bold: true, color: C.ink, fill: { color: C.panel }, valign: "middle", margin: [6, 9, 6, 9] },
  });
  const cc = (runs, zebra) => ({ text: runs, options: { fill: { color: zebra ? "FAFBFC" : C.white }, valign: "middle", margin: [6, 9, 6, 9] } });
  const jp = (t, br, bold, color) => ({ text: t, options: { fontFace: JP, fontSize: 10.5, color: color || (bold ? C.ink : C.ink2), bold: !!bold, breakLine: !!br } });

  matrix(s, {
    y: 2.1,
    colW: [2.4, 4.85, 4.84],
    rowH: [0.36, 0.72, 0.56, 0.9, 0.62, 0.62],
    rows: [
      [hcell("観点", C.ink3), hcell("elevated（推奨）", C.codex, true), hcell("unelevated（フォールバック）", C.ink2, true)],
      [rh("実行主体"),
        cc([jp("専用のローカル Windows ユーザーを作成し、その権限で実行", true), { text: "CodexSandboxOffline / CodexSandboxOnline", options: { fontFace: MONO, fontSize: 9, color: C.ink3 } }]),
        cc([jp("現在ログイン中のユーザーのまま、制限付きトークンで実行")], true)],
      [rh("ファイル境界"),
        cc([jp("ACL ＋ 専用ユーザーによる二重の境界")]),
        cc([jp("ACL ベースの境界のみ（専用ユーザーの境界は無い）")], true)],
      [rh("ネットワーク隔離"),
        cc([jp("● OS 強制", true, true, C.yes), jp("Windows ファイアウォールで送信を deny。ネットワークが必要なコマンドだけ deny 規則の無いユーザーで実行")]),
        cc([jp("○ 弱い", true, true, C.no), jp("ファイアウォール規則を持たず、環境レベルのオフライン制御に依存")], true)],
      [rh("管理者権限"),
        cc([jp("初期セットアップに必要", false, true), jp("（ユーザー作成・ローカルポリシー変更のため）")]),
        cc([jp("不要", false, true)], true)],
      [rh("使いどころ"),
        cc([jp("既定の選択。業務端末で管理者権限が取れる場合")]),
        cc([jp("管理者権限が無い／elevated のセットアップが失敗する場合")], true)],
    ],
  });

  note(s, 6.15, [
    { text: "出典に関する注記： ", options: { fontFace: JP, fontSize: 9, bold: true, color: C.ink2 } },
    { text: "このスライドの内容は openai/codex の実装構成と公開技術記事に基づきます。OpenAI 公式ドキュメントは資料作成環境のネットワークポリシーにより参照できませんでした。導入前に developers.openai.com/codex/windows での確認を推奨します。", options: { fontFace: JP, fontSize: 9, color: C.ink3 } },
  ]);
  chip(s, M, 6.58, "二次情報", C.ink3, true);
  s.addNotes("管理者権限が取れるかどうかで隔離強度が変わる。ネットワーク隔離の差が最も大きい。");
}

/* ═══════════════════════════════════════════════════════════
   08 — Claude Code internals (3 cards)
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "実装の内訳 — CLAUDE CODE",
    title: "Claude Code のサンドボックスは 3 環境で成立する",
    section: "CLAUDE CODE SANDBOX INTERNALS",
  });

  const cw = (CW - 0.4) / 3;
  card(s, { x: M, y: 1.5, w: cw, h: 3.3, head: "macOS", headColor: C.claude, items: [
    "Seatbelt を使用。追加インストールは一切不要で、/sandbox コマンドから設定するだけ",
    "3 つのタブ（Mode / Overrides / ネットワーク許可）で承認方式と境界を設定",
    "依存パッケージが無いぶん、macOS が最も導入コストの低い環境",
  ]});
  card(s, { x: M + cw + 0.2, y: 1.5, w: cw, h: 3.3, head: "LINUX / WSL2", headColor: C.claude, items: [
    "bubblewrap（ファイルシステム隔離）＋ socat（ネットワークプロキシ）の 2 パッケージが必要",
    "任意の seccomp フィルタ（@anthropic-ai/sandbox-runtime）で Unix ドメインソケットの遮断を追加できる",
    "Ubuntu 24.04 以降は AppArmor が非特権ユーザー名前空間を制限するため、bwrap 用プロファイルの追加が必要な場合がある",
  ]});

  // Windows card — the exception, drawn in the alert tone
  const x3 = M + (cw + 0.2) * 2;
  s.addShape(pres.ShapeType.rect, {
    x: x3, y: 1.5, w: cw, h: 3.3,
    fill: { color: "FBF1F0" }, line: { color: C.no, width: 1 },
  });
  s.addText("WINDOWS ネイティブ", {
    x: x3 + 0.22, y: 1.66, w: cw - 0.44, h: 0.26, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9.5, bold: true, charSpacing: 1.2, color: C.no, valign: "middle",
  });
  s.addText([
    { text: "✕  サンドボックスは動作しない", options: { fontFace: JP, fontSize: 12, bold: true, color: C.no, breakLine: true } },
  ], { x: x3 + 0.22, y: 2.02, w: cw - 0.44, h: 0.3, isTextBox: true, margin: 0, valign: "middle" });
  s.addText([
    { text: "公式ドキュメントに明記されており、PowerShell ツールの既知の制限にも「On Windows, sandboxing is not supported」とあります。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2, breakLine: true } },
    { text: "", options: { fontSize: 5, breakLine: true } },
    { text: "防御線は権限モード（Manual / Auto / Accept edits / Plan）と hooks のみ。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2, breakLine: true } },
    { text: "", options: { fontSize: 5, breakLine: true } },
    { text: "組織展開時は「Windows ホストにはサンドボックス設定を配らない、または WSL2／コンテナに寄せる」とドキュメントが明示的に案内しています。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ], { x: x3 + 0.22, y: 2.42, w: cw - 0.44, h: 2.28, isTextBox: true, margin: 0, lineSpacingMultiple: 1.34, valign: "top" });

  takeaway(s, 5.05, [
    { text: "WSL1 は不可： ", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink } },
    { text: "bubblewrap が要求するカーネル機能が WSL2 にしか無いためです。wsl -l -v でバージョンを確認し、「Sandboxing requires WSL2」と出たら WSL2 へ昇格します。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ]);
  s.addNotes("3列のうち右端だけが例外。ここが本資料のハイライト。");
}

/* ═══════════════════════════════════════════════════════════
   09 — macOS caveats
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "同じ SEATBELT でも挙動が違う",
    title: "macOS 固有の落とし穴（Claude Code）",
    lead: "macOS はサンドボックスが「効きすぎる」方向の問題が出ます。Linux／WSL2 とは挙動が異なる点が公式に明記されています。",
    section: "macOS CAVEATS",
  });

  const colw = (CW - 0.4) / 2;
  const dl = (s, x, y, w, items) => {
    let cy = y;
    items.forEach((it) => {
      s.addText(it.t, {
        x, y: cy, w, h: 0.26, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: 11.5, bold: true, color: C.ink, valign: "middle",
      });
      s.addText(it.d, {
        x, y: cy + 0.29, w, h: it.h, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: 10.5, color: C.ink2, lineSpacingMultiple: 1.34, valign: "top",
      });
      cy += 0.29 + it.h + 0.2;
    });
  };

  dl(s, M, 2.0, colw, [
    { t: "Apple Events が既定で遮断される", h: 1.15,
      d: "open / osascript / ブラウザ認証フローが error -600 で失敗します。allowAppleEvents で解除できますが、サンドボックス内のコマンドが他アプリを無許可で起動できるようになるため、コード実行の隔離は失われます。プロジェクト設定からは有効化できません。" },
    { t: "Go 製 CLI が TLS 検証に失敗する", h: 0.86,
      d: "gh / gcloud / terraform などが Seatbelt 下で TLS 検証に失敗することがあります。excludedCommands に列挙してサンドボックス外で実行するのが回避策です。" },
  ]);

  s.addShape(pres.ShapeType.line, { x: M + colw + 0.2, y: 2.0, w: 0, h: 2.9, line: { color: C.rule, width: 0.75 } });

  dl(s, M + colw + 0.4, 2.0, colw - 0.2, [
    { t: "認証情報マスクの挙動が OS で真逆", h: 1.55,
      d: '"mode": "mask" を設定したとき —\nLinux / WSL2：センチネル値に置換したファイルを読ませ、送信時にプロキシが実値へ復元。ツールは動作し続ける。\nmacOS：そのファイルの読み取り自体を拒否。deny と同じ効果になり、そのファイルで認証するツールはサンドボックス内で動かなくなる。' },
    { t: "--dangerously-skip-permissions の制限", h: 0.6,
      d: "root / sudo 下では Linux・macOS ともに拒否されます（既知のサンドボックス内では自動的にスキップ）。" },
  ]);

  takeaway(s, 5.3, [
    { text: "読み方： ", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink } },
    { text: "macOS は「隔離は強いが、外部ツールとの相性問題が出やすい」。Linux / WSL2 は「回避手段が用意されていて素直に動く」。同じ設定ファイルを配っても結果が変わるため、チームで OS が混在する場合は設定を OS 別に分ける必要があります。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ]);
  s.addNotes("macOSは効きすぎる方向の問題。設定をOS別に分ける必要がある。");
}

/* ═══════════════════════════════════════════════════════════
   10 — Windows caveats
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "ネイティブ WINDOWS の実像",
    title: "Windows 固有の落とし穴（Claude Code）",
    section: "WINDOWS CAVEATS",
  });

  const colw = (CW - 0.4) / 2;
  const dl = (x, y, w, items) => {
    let cy = y;
    items.forEach((it) => {
      s.addText(it.t, {
        x, y: cy, w, h: 0.26, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: 11.5, bold: true, color: C.ink, valign: "middle",
      });
      s.addText(it.d, {
        x, y: cy + 0.29, w, h: it.h, isTextBox: true, margin: 0,
        fontFace: JP, fontSize: 10.5, color: C.ink2, lineSpacingMultiple: 1.34, valign: "top",
      });
      cy += 0.29 + it.h + 0.22;
    });
  };

  dl(M, 1.5, colw, [
    { t: "サンドボックスが無い分、承認モデルが唯一の防御線", h: 0.6,
      d: "ファイル書き込みもネットワークも OS レベルでは止まりません。権限モードと hooks の設計が Windows では相対的に重要になります。" },
    { t: "Git for Windows は「任意」だが実質は分岐点", h: 0.88,
      d: "入れると Git Bash 経由で Bash ツールが使え、入れないと PowerShell ツールになります。自動検出に失敗する場合は CLAUDE_CODE_GIT_BASH_PATH を settings.json に設定します。" },
    { t: "メモリ上限設定は Linux / WSL 限定", h: 0.6,
      d: "CLAUDE_CODE_TOOL_MEMORY_LIMIT（暴走ビルドの抑止）はネイティブ Windows では使えません。" },
  ]);

  s.addShape(pres.ShapeType.line, { x: M + colw + 0.2, y: 1.5, w: 0, h: 4.3, line: { color: C.rule, width: 0.75 } });

  dl(M + colw + 0.4, 1.5, colw - 0.2, [
    { t: "実行ポリシーはプロセススコープで Bypass", h: 0.88,
      d: ".ps1 が既定の Windows でも動くよう、プロセススコープでのみ Bypass を指定します。グループポリシーは依然有効。端末の実効ポリシーに従わせるなら CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY=1。" },
    { t: "文字コード（日本語環境で重要）", h: 0.88,
      d: "v2.1.214 以降、PowerShell 5.1 の > / >> リダイレクトが UTF-8 で書き出されます。それ以前は UTF-16LE で、非 ASCII のパイプ入力が ? 化したり Python が UnicodeEncodeError で落ちる問題がありました。" },
    { t: "WSL2 から Windows バイナリを呼ぶとき", h: 0.88,
      d: "cmd.exe / powershell.exe / /mnt/c/ 配下の起動は Unix ソケット経由で Windows 側へ渡ります。サンドボックスの Unix ソケット設定に従うため、遮断するには seccomp フィルタの導入が前提です。" },
  ]);
  s.addNotes("日本語環境では文字コードの項目が実務上いちばん刺さる。");
}

/* ═══════════════════════════════════════════════════════════
   11 — Shell
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "実行モデル",
    title: "シェル：エージェントが実際に叩くコマンドの方言が変わる",
    section: "SHELL EXECUTION",
  });

  const hcell = (txt, color) => ({
    text: txt,
    options: { fontFace: MONO, fontSize: 9.5, bold: true, color, fill: { color: C.panel2 }, valign: "middle", margin: [6, 8, 6, 8] },
  });
  const rh = (txt, sub) => ({
    text: [
      { text: txt, options: { fontFace: JP, fontSize: 11, bold: true, color: C.ink, breakLine: !!sub } },
      ...(sub ? [{ text: sub, options: { fontFace: JP, fontSize: 9, color: C.ink3 } }] : []),
    ],
    options: { fill: { color: C.panel }, valign: "middle", margin: [6, 9, 6, 9] },
  });
  const cc = (runs, fill) => ({ text: runs, options: { fill: { color: fill }, valign: "middle", margin: [6, 9, 6, 9] } });
  const jp = (t, br, bold) => ({ text: t, options: { fontFace: JP, fontSize: 10.5, color: bold ? C.ink : C.ink2, bold: !!bold, breakLine: !!br } });

  matrix(s, {
    y: 1.5,
    colW: [1.9, 5.1, 5.09],
    rowH: [0.34, 0.62, 1.24, 0.56, 0.76],
    rows: [
      [hcell("OS", C.ink3), hcell("CODEX", C.codex), hcell("CLAUDE CODE", C.claude)],
      [rh("macOS"),
        cc([jp("既定のシェル（zsh / bash）を Seatbelt 下で実行")], "EAF1F4"),
        cc([jp("Bash ツールが主。", false, true), jp("PowerShell ツールはオプトインで、pwsh 7 以上を PATH に置く必要がある")], "F5F1E6")],
      [rh("Windows", "ネイティブ"),
        cc([jp("PowerShell をネイティブに使用", true, true), jp("Windows らしいコマンドがそのまま生成される")], "EAF1F4"),
        cc([jp("Git Bash の有無で二段構え", true, true),
            jp("Git Bash 無し → PowerShell ツールが自動有効", true),
            jp("Git Bash 有り → PowerShell ツールは段階的ロールアウト（CLAUDE_CODE_USE_POWERSHELL_TOOL=1/0 で明示制御）", true),
            jp("有効時は PowerShell が主シェル扱い。POSIX スクリプト用に Bash ツールも併存")], "F5F1E6")],
      [rh("Linux / WSL2"),
        cc([jp("bash（Linux 実装のサンドボックス下）")], "EAF1F4"),
        cc([jp("Bash ツール。PowerShell ツールはオプトイン（pwsh 7+ 必須）")], "F5F1E6")],
      [rh("個別指定"),
        cc([jp("—")], "EAF1F4"),
        cc([jp('hooks は "shell": "powershell"、skill は frontmatter の shell: powershell、対話 ! は "defaultShell": "powershell" で個別に切替可能')], "F5F1E6")],
    ],
  });

  takeaway(s, 5.62, [
    { text: "運用上の含意： ", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink } },
    { text: "hooks や CI で shell コマンドを検査する場合、Claude Code では Bash だけでなく Bash|PowerShell の両方にマッチさせる必要があります。片方だけの matcher は Windows で素通りします。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ]);
  s.addText("※ Codex の Windows 側の挙動は公開報道・技術記事に基づく", {
    x: M + 1.05, y: 5.12, w: 6.0, h: 0.26, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 9, color: C.ink3, valign: "middle",
  });
  chip(s, M, 5.12, "二次情報", C.ink3, true);
  s.addNotes("hooksのmatcherは Bash|PowerShell 両方にすること。実務で最も事故りやすい点。");
}

/* ═══════════════════════════════════════════════════════════
   12 — Desktop apps
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "GUI",
    title: "デスクトップアプリの対比",
    section: "DESKTOP APPS",
  });

  const cw = (CW - 0.3) / 2;
  card(s, { x: M, y: 1.5, w: cw, h: 4.0, head: "CODEX APP", headColor: C.codex, headChip: "二次情報", items: [
    "macOS が先行（2026 年 2 月）、Windows は 2026 年 3 月 4 日に追随。約 1 か月の時間差があった",
    "複数エージェントのオーケストレーションを中心に据えた「エージェントの司令塔」という位置づけ",
    "Windows 版は PowerShell とネイティブサンドボックスで動作し、WSL2 を選ぶこともできる",
    "Windows 版の中核機能：worktrees、Automations、Skills、アプリ内ブラウザ、Git 連携、成果物プレビュー、プラグイン",
    "Windows 推奨は Windows 11。Windows 10 は best-effort 扱い",
  ]});
  card(s, { x: M + cw + 0.3, y: 1.5, w: cw, h: 4.0, head: "CLAUDE デスクトップの CODE タブ", headColor: C.claude, items: [
    "macOS（Universal）/ Windows（x64・ARM64）/ Linux（beta）を同時に提供。ARM64 Windows のインストーラも用意されている",
    "並列セッション（各セッションが独立した git worktree）、差分レビュー、統合ターミナル、アプリプレビュー、PR 監視と自動マージ、スケジュールタスク",
    "Windows のみ：ローカルセッションに Git のインストールが必須。macOS は多くの環境で標準搭載",
    "Windows のみ：環境ピッカーで WSL セッションを選べる（WSL2 必須、distro 内に git が必要）",
    "CLI と同一エンジンで、CLAUDE.md・MCP・hooks・skills・設定を共有する",
  ]});

  takeaway(s, 5.72, [
    { text: "共通点： ", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink } },
    { text: "どちらも「複数セッション／エージェントを並べて回す」方向に進んでおり、GUI の有無そのものは選定理由になりません。差が出るのは次スライドのデスクトップ操作です。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ]);
  s.addNotes("GUIの有無では差がつかない。次スライドが本題。");
}

/* ═══════════════════════════════════════════════════════════
   13 — Computer use
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "最大の macOS / WINDOWS 差",
    title: "デスクトップ操作：macOS だけが「背後で並列に」動ける",
    section: "COMPUTER USE",
  });

  const cw = (CW - 0.3) / 2;

  // Left: Codex computer use
  s.addShape(pres.ShapeType.rect, { x: M, y: 1.5, w: cw, h: 3.3, fill: { color: C.panel }, line: { color: C.rule, width: 0.75 } });
  s.addText("CODEX — COMPUTER USE", {
    x: M + 0.22, y: 1.66, w: cw - 0.44, h: 0.26, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9.5, bold: true, charSpacing: 1.2, color: C.codex, valign: "middle",
  });
  chip(s, M + 0.22, 2.08, "macOS", C.ink2);
  s.addText("バックグラウンド動作", {
    x: M + 1.12, y: 2.06, w: cw - 1.34, h: 0.26, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 11.5, bold: true, color: C.ink, valign: "middle",
  });
  s.addText("エージェントが自前のカーソルで画面を見て・クリックし・入力します。複数のエージェントが並列に動作し、ユーザーが他アプリで作業していても干渉しません。", {
    x: M + 0.22, y: 2.4, w: cw - 0.44, h: 0.82, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 10.5, color: C.ink2, lineSpacingMultiple: 1.34, valign: "top",
  });
  chip(s, M + 0.22, 3.32, "Windows", C.ink2);
  s.addText("フォアグラウンド占有", {
    x: M + 1.28, y: 3.30, w: cw - 1.5, h: 0.26, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 11.5, bold: true, color: C.no, valign: "middle",
  });
  s.addText("アクティブデスクトップ上でのみ動作し、同じ Windows セッションを使いながらのバックグラウンド実行はできません。実行中はポインタと前面が奪われます。", {
    x: M + 0.22, y: 3.64, w: cw - 0.44, h: 0.82, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 10.5, color: C.ink2, lineSpacingMultiple: 1.34, valign: "top",
  });
  chip(s, M + 0.22, 4.48, "二次情報", C.ink3, true);

  // Right: Claude side
  const rx = M + cw + 0.3;
  s.addShape(pres.ShapeType.rect, { x: rx, y: 1.5, w: cw, h: 3.3, fill: { color: C.panel }, line: { color: C.rule, width: 0.75 } });
  s.addText("CLAUDE 側の対応領域", {
    x: rx + 0.22, y: 1.66, w: cw - 0.44, h: 0.26, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9.5, bold: true, charSpacing: 1.2, color: C.claude, valign: "middle",
  });
  s.addText([
    { text: "Claude Code には OS 全体を操作する同等の Computer Use 機能は提供されていません。", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink, breakLine: true } },
    { text: "担当領域はデスクトップアプリ内のブラウザペインとアプリプレビューです（開発中のアプリを見て、エンドポイントを叩き、ログを確認して反復する）。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ], { x: rx + 0.22, y: 2.06, w: cw - 0.44, h: 1.05, isTextBox: true, margin: 0, lineSpacingMultiple: 1.34, valign: "top" });

  s.addText("自律作業は別タブの Cowork が担当し、隔離された VM 内で実行されます。ここに OS 差が出ます：", {
    x: rx + 0.22, y: 3.16, w: cw - 0.44, h: 0.52, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 10.5, color: C.ink2, lineSpacingMultiple: 1.34, valign: "top",
  });
  chip(s, rx + 0.22, 3.74, "macOS", C.ink2);
  s.addText("Apple Virtualization.framework（Apple Silicon が必要）", {
    x: rx + 1.12, y: 3.72, w: cw - 1.34, h: 0.26, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 10.5, color: C.ink2, valign: "middle",
  });
  chip(s, rx + 0.22, 4.08, "Windows", C.ink2);
  s.addText("Hyper-V（Pro / Enterprise / Education が必要、Home では不可）", {
    x: rx + 1.28, y: 4.06, w: cw - 1.5, h: 0.26, isTextBox: true, margin: 0,
    fontFace: JP, fontSize: 10.5, color: C.ink2, valign: "middle",
  });
  chip(s, rx + 0.22, 4.44, "二次情報", C.ink3, true);

  takeaway(s, 5.1, [
    { text: "ここが選定を左右する： ", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink } },
    { text: "「エージェントに GUI アプリを触らせつつ、自分は同じマシンで作業を続けたい」という要件がある場合、現時点で成立するのは ", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
    { text: "macOS ＋ Codex の組み合わせだけ", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.no } },
    { text: " です。Windows では前面占有が前提になります。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ], true);
  s.addNotes("macOS/Windows差が最も大きいスライド。GUI自動化の要件があるなら選定を決める。");
}

/* ═══════════════════════════════════════════════════════════
   14 — WSL positioning
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "WINDOWS 運用の要",
    title: "WSL の位置づけが両者で決定的に違う",
    section: "WSL POSITIONING",
  });

  const cw = (CW - 0.3) / 2;
  card(s, { x: M, y: 1.5, w: cw, h: 2.9, head: "CODEX にとっての WSL2", headColor: C.codex, items: [
    "選択肢のひとつ。ネイティブ Windows サンドボックスがあるため必須ではない",
    "選ぶ理由：プロジェクトが Linux ツールチェーンに依存／リポジトリと開発フローが既に WSL2 内にある／ネイティブサンドボックスがどちらのモードでも動かない",
    "公式の推奨は「既に WSL2 で開発しているのでなければ、まず Windows 用スタンドアロンインストーラから」",
  ]});

  const rx = M + cw + 0.3;
  s.addShape(pres.ShapeType.rect, { x: rx, y: 1.5, w: cw, h: 2.9, fill: { color: "FBF1F0" }, line: { color: C.no, width: 1 } });
  s.addText("CLAUDE CODE にとっての WSL2", {
    x: rx + 0.22, y: 1.66, w: cw - 0.44, h: 0.26, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9.5, bold: true, charSpacing: 1.2, color: C.no, valign: "middle",
  });
  s.addText([
    { text: "Windows でサンドボックスを使うための唯一の道。", options: { fontFace: JP, fontSize: 11, bold: true, color: C.no, breakLine: true } },
    { text: "ネイティブ Windows には代替実装が存在しません。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2, breakLine: true } },
    { text: "", options: { fontSize: 6, breakLine: true } },
    { text: "デスクトップアプリからも WSL セッションを選択でき、Claude Code 本体・ツール・git がすべて distro 内で動きます。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2, breakLine: true } },
    { text: "", options: { fontSize: 6, breakLine: true } },
    { text: "WSL セッションでまだ使えない機能：", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink, breakLine: true } },
    { text: "統合ターミナル／コネクタとプラグイン／セッションのフォーク／ファイルブラウザペイン／@ のファイル補完。組織管理端末では WSL セッション自体が無効化されている場合もあります。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ], { x: rx + 0.22, y: 2.02, w: cw - 0.44, h: 2.24, isTextBox: true, margin: 0, lineSpacingMultiple: 1.32, valign: "top" });

  takeaway(s, 4.66, [
    { text: "両者共通の注意： ", options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink } },
    { text: "リポジトリを /mnt/c/... （Windows 側のディスク）に置くと、ネットワークファイルシステム経由になり I/O が遅く、ファイル監視も壊れます。WSL を使うならリポジトリは distro 内のファイルシステムに置くのが前提です。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ]);
  s.addNotes("Claude Codeでは WSL2 が必須級。ただし WSL セッションには機能制限がある点に注意。");
}

/* ═══════════════════════════════════════════════════════════
   15 — Terminal experience
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "日々の操作感",
    title: "ターミナル体験の差（Claude Code CLI）",
    lead: "意外にも Shift+Enter は Windows Terminal のほうが素直に動きます。逆に macOS には Option キーという固有の設定が必要です。",
    section: "TERMINAL EXPERIENCE",
  });

  const cw = (CW - 0.4) / 2;

  s.addText("SHIFT+ENTER で改行できるか", {
    x: M, y: 2.0, w: cw, h: 0.26, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9.5, bold: true, charSpacing: 1.2, color: C.ink3, valign: "middle",
  });
  const trow = (t, c, st, stc, fill) => [
    { text: t, options: { fontFace: JP, fontSize: 10, color: c, fill: { color: fill }, valign: "middle", margin: [6, 8, 6, 8] } },
    { text: st, options: { fontFace: JP, fontSize: 10, bold: true, color: stc, fill: { color: fill }, valign: "middle", margin: [6, 8, 6, 8] } },
  ];
  s.addTable([
    trow("Ghostty / Kitty / iTerm2 / WezTerm / Warp /\nApple Terminal / Windows Terminal", C.ink, "● 設定不要", C.yes, C.white),
    trow("VS Code / Cursor / Devin Desktop /\nAlacritty / Zed", C.ink, "○ /terminal-setup", C.ink2, "FAFBFC"),
    trow("gnome-terminal / JetBrains 系（PyCharm 等）", C.ink, "✕ 不可", C.no, C.white),
  ], {
    x: M, y: 2.34, w: cw, colW: [cw * 0.62, cw * 0.38], rowH: [0.62, 0.62, 0.46],
    border: { type: "solid", color: C.rule, pt: 0.75 }, autoPage: false,
  });

  s.addText([
    { text: "共通の代替： ", options: { fontFace: JP, fontSize: 9, bold: true, color: C.ink2 } },
    { text: "Ctrl+J、または \\ を打ってから Enter。どのターミナルでも設定なしで動きます。", options: { fontFace: JP, fontSize: 9, color: C.ink3 } },
  ], { x: M, y: 4.2, w: cw, h: 0.42, isTextBox: true, margin: 0, lineSpacingMultiple: 1.25, valign: "top" });

  s.addShape(pres.ShapeType.line, { x: M + cw + 0.2, y: 2.0, w: 0, h: 2.7, line: { color: C.rule, width: 0.75 } });

  const rx = M + cw + 0.4;
  s.addText("OS 固有の設定", {
    x: rx, y: 2.0, w: cw - 0.2, h: 0.26, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9.5, bold: true, charSpacing: 1.2, color: C.ink3, valign: "middle",
  });
  s.addText([
    { text: "macOS：Option キーがメタキーにならない", options: { fontFace: JP, fontSize: 11.5, bold: true, color: C.ink, breakLine: true } },
    { text: "Option+Enter（改行）や Option+P（モデル切替）などが既定では効きません。Apple Terminal は「Use Option as Meta Key」を有効化、iTerm2 は Left/Right Option を「Esc+」に設定します。Windows にはこの手間がありません。", options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ], { x: rx, y: 2.36, w: cw - 0.2, h: 1.2, isTextBox: true, margin: 0, lineSpacingMultiple: 1.34, valign: "top" });

  s.addText([
    { text: "デスクトップ通知が出るターミナルが限られる", options: { fontFace: JP, fontSize: 11.5, bold: true, color: C.ink, breakLine: true } },
    { text: ' 既定でデスクトップ通知が届くのは Ghostty / Kitty / iTerm2 のみ。それ以外は preferredNotifChannel: "terminal_bell" にするか Notification フックを設定します。この 3 つは macOS で使われることが多く、結果として通知体験は macOS 側が有利になりがちです。', options: { fontFace: JP, fontSize: 10.5, color: C.ink2 } },
  ], { x: rx, y: 3.62, w: cw - 0.2, h: 1.35, isTextBox: true, margin: 0, lineSpacingMultiple: 1.34, valign: "top" });

  s.addNotes("細かいが日々効く差。Windows Terminal はむしろ優秀。");
}

/* ═══════════════════════════════════════════════════════════
   16 — Decision guide
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "選定ガイド",
    title: "要件から逆引きする",
    section: "DECISION GUIDE",
  });

  const hcell = (txt) => ({
    text: txt,
    options: { fontFace: MONO, fontSize: 9.5, bold: true, color: C.ink3, fill: { color: C.panel2 }, valign: "middle", margin: [6, 8, 6, 8] },
  });
  const req = (txt, zebra) => ({
    text: txt,
    options: { fontFace: JP, fontSize: 10.5, bold: true, color: C.ink, fill: { color: zebra ? C.panel : "FAFBFC" }, valign: "middle", margin: [6, 9, 6, 9] },
  });
  const rec = (txt, color, zebra) => ({
    text: txt,
    options: { fontFace: MONO, fontSize: 10, bold: true, color, fill: { color: zebra ? C.panel : "FAFBFC" }, valign: "middle", margin: [6, 9, 6, 9] },
  });
  const why = (txt, zebra) => ({
    text: txt,
    options: { fontFace: JP, fontSize: 10, color: C.ink2, fill: { color: zebra ? C.panel : "FAFBFC" }, valign: "middle", margin: [6, 9, 6, 9] },
  });

  const rows = [
    ["Windows ネイティブのまま、エージェントに強い隔離をかけたい", "Codex", C.codex,
      "ネイティブ Windows サンドボックスを持つのは Codex のみ。管理者権限が取れるなら elevated でファイアウォールによるネットワーク隔離まで効く。Claude Code を使うなら WSL2 に寄せる。"],
    ["Windows で Linux ツールチェーン（Docker / Node / Python）を使う", "どちらでも可", C.ink2,
      "両者とも WSL2 で Linux 実装の隔離が効く。Claude Code はこの構成でフル機能。ただしデスクトップの WSL セッションでは一部機能が未対応。"],
    ["Windows で .NET / MSVC / PowerShell 中心の開発", "Codex", C.codex,
      "PowerShell をネイティブに扱いつつサンドボックスも効く。Claude Code でも PowerShell ツールで作業自体は可能だが、サンドボックス無しを許容する判断が必要。"],
    ["macOS 中心のチーム", "要件で選ぶ", C.ink2,
      "両者とも Seatbelt で隔離が効き、OS 起因の差はほぼ無い。GUI・並列セッション・運用機能で比較するのが妥当。"],
    ["エージェントに GUI アプリを操作させたい", "Codex ＋ macOS", C.codex,
      "自分の作業を止めずに並列実行できるのは macOS のみ。Windows では前面占有になるため、専用マシンや仮想デスクトップの用意が前提。"],
    ["OS 混在チームで設定を統一したい", "Claude Code", C.claude,
      "設定・チャンネル・最低バージョンを managed settings で組織全体に強制でき、CLI とデスクトップが設定を共有する。ただしサンドボックス設定は Windows ホストを除外するか WSL2 前提にする必要がある。"],
  ];

  matrix(s, {
    y: 1.5,
    colW: [3.8, 1.95, 6.34],
    rowH: [0.34, 0.86, 0.72, 0.72, 0.62, 0.72, 0.86],
    rows: [
      [hcell("要件"), hcell("推奨"), hcell("理由と条件")],
      ...rows.map((r, i) => [req(r[0], i % 2 === 0), rec(r[1], r[2], i % 2 === 0), why(r[3], i % 2 === 0)]),
    ],
  });
  s.addNotes("最後は要件から逆引き。Windowsネイティブ＋強い隔離ならCodex一択。");
}

/* ═══════════════════════════════════════════════════════════
   17 — Sources & caveats (dark)
   ═══════════════════════════════════════════════════════════ */
{
  const s = newSlide({
    eyebrow: "出典と注意事項",
    title: "この資料の根拠と、確認すべき点",
    section: "SOURCES & CAVEATS",
    dark: true,
  });

  const cw = (CW - 0.4) / 2;

  s.addText("一次情報として参照したもの", {
    x: M, y: 1.55, w: cw, h: 0.28, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9.5, bold: true, charSpacing: 1.2, color: C.dInk3, valign: "middle",
  });
  s.addText([
    { text: "Claude Code 公式ドキュメント（code.claude.com/docs）", options: { fontFace: JP, fontSize: 11, bold: true, color: C.dInk, breakLine: true } },
    { text: "Advanced setup / Sandboxing / Tools reference / Desktop quickstart / Desktop in WSL / Terminal config。本資料の Claude Code 側の記述はすべてここに基づきます。", options: { fontFace: JP, fontSize: 10.5, color: C.dInk2, breakLine: true } },
    { text: "", options: { fontSize: 8, breakLine: true } },
    { text: "openai/codex リポジトリ", options: { fontFace: JP, fontSize: 11, bold: true, color: C.dInk, breakLine: true } },
    { text: "README のインストール手順、および codex-rs/sandboxing/src/ の実装ファイル構成（seatbelt.rs／landlock.rs／bwrap.rs／windows.rs）で、OS 別実装の存在を確認しています。", options: { fontFace: JP, fontSize: 10.5, color: C.dInk2 } },
  ], { x: M, y: 1.94, w: cw, h: 2.5, isTextBox: true, margin: 0, lineSpacingMultiple: 1.36, valign: "top" });

  s.addShape(pres.ShapeType.line, { x: M + cw + 0.2, y: 1.55, w: 0, h: 3.3, line: { color: C.dRule, width: 0.75 } });

  const rx = M + cw + 0.4;
  s.addText("確認いただきたい点", {
    x: rx, y: 1.55, w: cw - 0.2, h: 0.28, isTextBox: true, margin: 0,
    fontFace: MONO, fontSize: 9.5, bold: true, charSpacing: 1.2, color: C.dInk3, valign: "middle",
  });
  s.addText([
    { text: "OpenAI 公式ドキュメントは参照できませんでした。", options: { fontFace: JP, fontSize: 11, bold: true, color: C.dNo, breakLine: true } },
    { text: "「二次情報」を付したスライド — Codex の Windows サンドボックス内部設計、Codex app のリリース時期、Computer Use の macOS / Windows 差、Cowork の VM 要件 — は公開報道および技術解説記事に基づきます。導入判断の前に developers.openai.com/codex/windows で裏取りしてください。", options: { fontFace: JP, fontSize: 10.5, color: C.dInk2, breakLine: true } },
    { text: "", options: { fontSize: 8, breakLine: true } },
    { text: "両製品とも更新が速い。", options: { fontFace: JP, fontSize: 11, bold: true, color: C.dInk, breakLine: true } },
    { text: "Codex CLI は 0.148.0-alpha 系が日次で更新され、Claude Code も Windows 関連の挙動がバージョンで変わっています（例：PowerShell の UTF-8 出力は v2.1.214 以降）。記載内容は 2026 年 8 月 18 日時点のものとしてお読みください。", options: { fontFace: JP, fontSize: 10.5, color: C.dInk2 } },
  ], { x: rx, y: 1.94, w: cw - 0.2, h: 2.9, isTextBox: true, margin: 0, lineSpacingMultiple: 1.36, valign: "top" });

  // closing takeaway on dark
  s.addShape(pres.ShapeType.rect, {
    x: M, y: 5.32, w: CW, h: 1.0, fill: { color: C.dPanel }, line: { color: C.dRule, width: 0.75 },
  });
  s.addText([
    { text: "最も安定した結論： ", options: { fontFace: JP, fontSize: 11, bold: true, color: C.dInk } },
    { text: "OS 差の本質は「その OS が提供する隔離プリミティブ（Seatbelt / Landlock / 制限付きトークン）を、そのエージェントが実装しているか」です。個別の機能名は変わっても、この構図は当面変わりません。", options: { fontFace: JP, fontSize: 11, color: C.dInk2 } },
  ], { x: M + 0.28, y: 5.44, w: CW - 0.56, h: 0.76, isTextBox: true, margin: 0, lineSpacingMultiple: 1.3, valign: "middle" });

  s.addNotes("出典と限界を明示。Codex側は公式ドキュメント未確認の項目があるため、導入前の裏取りを推奨。");
}

/* ── Write ─────────────────────────────────────────────────── */
const out = process.argv[2] || "deck.pptx";
pres.writeFile({ fileName: out }).then(() => console.log("wrote", out, "—", n, "slides"));
