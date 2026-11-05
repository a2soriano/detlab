import { Fragment, useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, FocusEvent, KeyboardEvent, ReactNode } from "react";
import {
  LuArrowRight,
  LuCheck,
  LuChevronRight,
  LuCircleAlert,
  LuCircleCheck,
  LuEraser,
  LuGrid2X2,
  LuHand,
  LuLightbulb,
  LuListOrdered,
  LuMenu,
  LuMousePointerClick,
  LuSigma,
  LuX,
} from "react-icons/lu";
import { Frac, fmt, fracText, parseValue, show, solveSystem } from "./cramer";
import type { Breakdown, Det2, Outcome } from "./cramer";

/* ============================================================
   Types, examples and small helpers
   ============================================================ */

type Size = 2 | 3;
type Section = "home" | "solver" | "answer" | "steps" | "how";
interface Grid {
  A: string[][];
  b: string[];
}

const VARS = ["x", "y", "z"];
const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
const subscript = (k: number) => String(k).split("").map((ch) => SUBSCRIPTS[Number(ch)]).join("");

const EXAMPLES: Record<Size, Grid> = {
  2: { A: [["2", "1"], ["1", "3"]], b: ["5", "10"] },
  3: {
    A: [["0.3", "0.52", "1"], ["0.5", "1", "1.9"], ["0.1", "0.3", "0.5"]],
    b: ["-0.01", "0.67", "-0.44"],
  },
};

const cloneGrid = (g: Grid): Grid => ({ A: g.A.map((row) => [...row]), b: [...g.b] });
const emptyGrid = (n: Size): Grid => ({
  A: Array.from({ length: n }, () => Array<string>(n).fill("")),
  b: Array<string>(n).fill(""),
});

/* Column n is the b column. Cells are typed row by row, ending each row with its b value. */
const typingOrder = (n: Size) =>
  Array.from({ length: n }, (_, r) => Array.from({ length: n + 1 }, (_, c) => [r, c] as const)).flat();
const cellId = (r: number, c: number) => `cell-${r}-${c}`;
const cellName = (n: Size, r: number, c: number) =>
  c === n ? `b${subscript(r + 1)}` : `a${subscript(r + 1)}${subscript(c + 1)}`;
const rawAt = (g: Grid, n: Size, r: number, c: number) => (c === n ? g.b[r] : g.A[r][c]);

interface ReadResult {
  outcome: Outcome | null;
  empty: string[];
  bad: string[];
}

function readGrid(g: Grid, n: Size): ReadResult {
  const empty: string[] = [];
  const bad: string[] = [];
  const value = (r: number, c: number): Frac | null => {
    const text = rawAt(g, n, r, c);
    if (text.trim() === "") {
      empty.push(`${r}-${c}`);
      return null;
    }
    const f = parseValue(text);
    if (!f) bad.push(`${r}-${c}`);
    return f;
  };
  const A = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => value(r, c)));
  const b = Array.from({ length: n }, (_, r) => value(r, n));
  if (empty.length || bad.length) return { outcome: null, empty, bad };
  return { outcome: solveSystem(A as Frac[][], b as Frac[]), empty, bad };
}

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  return "Good evening";
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   Math typography
   ============================================================ */

const Var = ({ children }: { children: ReactNode }) => <i className="var">{children}</i>;

const Sym = ({ base, sub }: { base: string; sub: string | number }) => (
  <span className="sym">
    <i className="var">{base}</i>
    <sub>{sub}</sub>
  </span>
);

const Num = ({ f, strong = false }: { f: Frac; strong?: boolean }) => (
  <span className={strong ? "num strong" : "num"}>{fmt(f)}</span>
);

/** A factor in a product, always in brackets: (0.3)(−0.07) */
const Factor = ({ f }: { f: Frac }) => <span className="num">({fmt(f)})</span>;

/** Brackets only when negative, for things like ÷ (−0.0022) */
const MaybeParen = ({ f }: { f: Frac }) => (f.isNeg() ? <Factor f={f} /> : <Num f={f} />);

function SignedSum({ terms }: { terms: Frac[] }) {
  return (
    <>
      {terms.map((t, i) => (
        <Fragment key={i}>
          {i === 0 ? (
            <Num f={t} />
          ) : (
            <>
              {" "}
              <span className="op">{t.isNeg() ? "−" : "+"}</span> <Num f={t.abs()} />
            </>
          )}
        </Fragment>
      ))}
    </>
  );
}

function Mat({ m, col = -1, row = -1, small = false }: { m: Frac[][]; col?: number; row?: number; small?: boolean }) {
  return (
    <span className={small ? "mat mat-sm" : "mat"} style={{ "--cols": m[0].length } as CSSProperties}>
      {m.flatMap((r, i) =>
        r.map((v, j) => (
          <span key={`${i}-${j}`} className={j === col ? "hl-b" : i === row ? "hl-row" : undefined}>
            {fmt(v)}
          </span>
        )),
      )}
    </span>
  );
}

interface Line {
  lhs?: ReactNode;
  rhs: ReactNode;
  result?: boolean;
}

function Work({ lines }: { lines: Line[] }) {
  return (
    <div className="work">
      {lines.map((l, i) => (
        <Fragment key={i}>
          <span className="w-lhs">{l.lhs}</span>
          <span className="w-eq">=</span>
          <span className={l.result ? "w-rhs result" : "w-rhs"}>{l.rhs}</span>
        </Fragment>
      ))}
    </div>
  );
}

function Det2Inline({ d }: { d: Det2 }) {
  const [[a, b], [c, e]] = d.m;
  return (
    <>
      <Factor f={a} />
      <Factor f={e} /> <span className="op">−</span> <Factor f={b} />
      <Factor f={c} /> <span className="op">=</span> <Num f={d.p} />{" "}
      <span className="op">{d.q.isNeg() ? "+" : "−"}</span> <Num f={d.q.abs()} /> <span className="op">=</span>{" "}
      <Num f={d.value} strong />
    </>
  );
}

function DetWork({ bd, name }: { bd: Breakdown; name: ReactNode }) {
  if (bd.two) {
    const d = bd.two;
    const [[a, b], [c, e]] = d.m;
    return (
      <Work
        lines={[
          { lhs: name, rhs: <><Factor f={a} /><Factor f={e} /> <span className="op">−</span> <Factor f={b} /><Factor f={c} /></> },
          { rhs: <><Num f={d.p} /> <span className="op">{d.q.isNeg() ? "+" : "−"}</span> <Num f={d.q.abs()} /></> },
          { rhs: <Num f={d.value} />, result: true },
        ]}
      />
    );
  }
  const top = bd.matrix[0];
  const [m1, m2, m3] = bd.minors;
  return (
    <div className="detwork">
      <div className="minors">
        {bd.minors.map((m, j) => (
          <div className="minor" key={j}>
            <Sym base="M" sub={`1${j + 1}`} />
            <Mat m={m.m} small />
            <span className="minor-calc">
              <span className="op">=</span> <Det2Inline d={m} />
            </span>
          </div>
        ))}
      </div>
      <Work
        lines={[
          {
            lhs: name,
            rhs: (
              <>
                <Factor f={top[0]} /><Factor f={m1.value} /> <span className="op">−</span> <Factor f={top[1]} />
                <Factor f={m2.value} /> <span className="op">+</span> <Factor f={top[2]} /><Factor f={m3.value} />
              </>
            ),
          },
          { rhs: <SignedSum terms={bd.terms} /> },
          { rhs: <Num f={bd.value} />, result: true },
        ]}
      />
    </div>
  );
}

function Equation({ row, rhs }: { row: Frac[]; rhs: Frac }) {
  return (
    <span className="equation">
      {row.map((a, j) => {
        const coef = fmt(a.abs());
        return (
          <Fragment key={j}>
            {j === 0 ? (a.isNeg() ? "−" : "") : <span className="op"> {a.isNeg() ? "−" : "+"} </span>}
            {coef.includes("/") ? `(${coef})` : coef}
            <Var>{VARS[j]}</Var>
          </Fragment>
        );
      })}
      <span className="op"> = </span>
      <span className="b-tone">{fmt(rhs)}</span>
    </span>
  );
}

/** The live preview under the matrix, built from what is typed so far. */
function LiveEquation({ grid, n, r }: { grid: Grid; n: Size; r: number }) {
  const term = (c: number, first: boolean) => {
    const text = rawAt(grid, n, r, c).trim();
    if (text === "") return <>{first ? "" : <span className="op"> + </span>}<span className="blank">?</span></>;
    const f = parseValue(text);
    if (!f) return <>{first ? "" : <span className="op"> + </span>}<span className="invalid">{text}</span></>;
    const body = fmt(f.abs());
    const shown = body.includes("/") && c < n ? `(${body})` : body;
    if (c === n) return <span className="b-tone">{fmt(f)}</span>;
    return <>{first ? (f.isNeg() ? "−" : "") : <span className="op"> {f.isNeg() ? "−" : "+"} </span>}{shown}</>;
  };
  return (
    <span className="equation">
      {Array.from({ length: n }, (_, c) => (
        <Fragment key={c}>
          {term(c, c === 0)}
          <Var>{VARS[c]}</Var>
        </Fragment>
      ))}
      <span className="op"> = </span>
      {term(n, true)}
    </span>
  );
}

/* ============================================================
   Navigation bar with breadcrumbs
   ============================================================ */

const NAV_LINKS: [Section, string][] = [
  ["solver", "Solver"],
  ["steps", "Steps"],
  ["how", "How it works"],
];

function Nav({ section, n, go }: { section: Section; n: Size; go: (id: Section) => void }) {
  const [open, setOpen] = useState(false);
  const sys = `${n} × ${n} system`;
  const trails: Record<Section, [Section, string][]> = {
    home: [["home", "Home"]],
    solver: [["home", "Home"], ["solver", "Solver"], ["solver", sys]],
    answer: [["home", "Home"], ["solver", "Solver"], ["solver", sys], ["answer", "Answer"]],
    steps: [["home", "Home"], ["solver", "Solver"], ["solver", sys], ["steps", "Steps"]],
    how: [["home", "Home"], ["how", "How it works"]],
  };
  const trail = trails[section];
  const active = section === "answer" ? "steps" : section;

  return (
    <header className="top">
      <div className="nav glass">
        <button className="brand" onClick={() => go("home")} aria-label="DetLab, back to top">
          <span className="logo"><LuSigma /></span>
          <span className="brand-name">DetLab</span>
        </button>
        <span className="nav-sep" />
        <nav className="crumbs" aria-label="Breadcrumb">
          <ol>
            {trail.map(([id, label], i) => (
              <li key={`${id}-${i}`}>
                {i > 0 && <LuChevronRight className="crumb-sep" />}
                <button onClick={() => go(id)} aria-current={i === trail.length - 1 ? "page" : undefined}>
                  {label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <nav className="nav-links" aria-label="Sections">
          {NAV_LINKS.map(([id, label]) => (
            <button key={id} className={active === id ? "on" : undefined} onClick={() => go(id)}>
              {label}
            </button>
          ))}
        </nav>
        <button
          className="nav-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <LuX /> : <LuMenu />}
        </button>
      </div>
      {open && (
        <div className="nav-drawer glass">
          {NAV_LINKS.map(([id, label]) => (
            <button key={id} className={active === id ? "on" : undefined} onClick={() => { go(id); setOpen(false); }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

/* ============================================================
   Hero: greeting and size picker
   ============================================================ */

function Hero({ n, onSize }: { n: Size; onSize: (s: Size) => void }) {
  return (
    <section className="hero" id="home" data-section="home">
      <span className="greet glass">
        <span className="wave"><LuHand /></span>
        {greeting()}, welcome to DetLab
      </span>
      <h1>
        Solve linear systems <em>one cell at a time.</em>
      </h1>
      <p className="lead">
        Pick a size, type your coefficients, and get the answer with every determinant worked out by Cramer's rule.
      </p>
      <div className="size-switch glass" role="radiogroup" aria-label="System size">
        {([2, 3] as const).map((s) => (
          <button key={s} role="radio" aria-checked={n === s} className={n === s ? "on" : undefined} onClick={() => onSize(s)}>
            <span className={`mini mini-${s}`}>
              {Array.from({ length: s * s }, (_, i) => <i key={i} />)}
            </span>
            <span>
              <strong>{s} × {s}</strong>
              <small>{s === 2 ? "x, y" : "x, y, z"}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   Solver: the matrix you type into
   ============================================================ */

interface SolverProps {
  n: Size;
  grid: Grid;
  flagged: Set<string>;
  message: string;
  canUpdate: boolean;
  onCell: (r: number, c: number, value: string) => void;
  onSolve: () => void;
  onExample: () => void;
  onClear: () => void;
}

function Solver({ n, grid, flagged, message, canUpdate, onCell, onSolve, onExample, onClear }: SolverProps) {
  const cells = typingOrder(n);
  const focus = (r: number, c: number) => document.getElementById(cellId(r, c))?.focus();

  const onKey = (e: KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const i = cells.findIndex(([rr, cc]) => rr === r && cc === c);
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        if (i > 0) focus(...cells[i - 1]);
      } else if (i === cells.length - 1) {
        e.currentTarget.blur();
        onSolve();
      } else {
        focus(...cells[i + 1]);
      }
    } else if (e.key === "ArrowDown" && r < n - 1) {
      e.preventDefault();
      focus(r + 1, c);
    } else if (e.key === "ArrowUp" && r > 0) {
      e.preventDefault();
      focus(r - 1, c);
    }
  };

  return (
    <div className="solver glass">
      <div className="solver-head">
        <div>
          <h2>{n === 2 ? "Two equations, two unknowns" : "Three equations, three unknowns"}</h2>
          <p>
            Click a cell and type. <kbd>Enter</kbd> moves to the next one.
          </p>
        </div>
        <div className="solver-tools">
          <button className="btn-ghost" onClick={onExample}><LuLightbulb />Example</button>
          <button className="btn-ghost" onClick={onClear}><LuEraser />Clear</button>
        </div>
      </div>

      <div className="matrix-scroll">
        <div className="matrix" style={{ "--n": n } as CSSProperties}>
          <div className="matrix-heads" aria-hidden="true">
            {VARS.slice(0, n).map((v) => (
              <span className="head" key={v}><Var>{v}</Var></span>
            ))}
            <span />
            <span className="head b"><Var>b</Var></span>
          </div>
          <div className="matrix-body">
            {Array.from({ length: n }, (_, r) => (
              <Fragment key={r}>
                {Array.from({ length: n + 1 }, (_, c) => {
                  const isB = c === n;
                  const cls = ["cell", isB ? "is-b" : "", flagged.has(`${r}-${c}`) ? "is-bad" : ""].filter(Boolean).join(" ");
                  return (
                    <Fragment key={c}>
                      {isB && <span className="bar" aria-hidden="true" />}
                      <label className={cls} htmlFor={cellId(r, c)}>
                        <span className="cell-label">
                          {isB ? <Sym base="b" sub={r + 1} /> : <Sym base="a" sub={`${r + 1}${c + 1}`} />}
                        </span>
                        <input
                          id={cellId(r, c)}
                          value={rawAt(grid, n, r, c)}
                          placeholder="?"
                          autoComplete="off"
                          spellCheck={false}
                          aria-label={cellName(n, r, c)}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => onCell(r, c, e.target.value)}
                          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => onKey(e, r, c)}
                          onFocus={(e: FocusEvent<HTMLInputElement>) => e.target.select()}
                        />
                      </label>
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="preview" aria-label="Your system">
        {Array.from({ length: n }, (_, r) => (
          <LiveEquation key={r} grid={grid} n={n} r={r} />
        ))}
      </div>

      <p className="solver-msg" role="status">{message}</p>

      <button className="btn-solve" onClick={onSolve}>
        {canUpdate ? "Update solution" : "Solve"}
        <LuArrowRight />
      </button>
    </div>
  );
}

/* ============================================================
   Answer (bento grid)
   ============================================================ */

const Sk = ({ w, h, r = 10 }: { w: string; h: number; r?: number }) => (
  <span className="sk" style={{ width: w, height: h, borderRadius: r }} />
);

function ValueText({ f }: { f: Frac }) {
  const s = show(f);
  return <>{s.approx ? "≈ " : ""}{s.text}</>;
}

function Answer({ outcome, loading, n }: { outcome: Outcome | null; loading: boolean; n: Size }) {
  if (loading) {
    return (
      <div className="bento">
        <article className="tile glass t-solution">
          <Sk w="28%" h={12} />
          {Array.from({ length: n }, (_, i) => (
            <div className="sol" key={i}><Sk w="26px" h={30} r={8} /><Sk w="50%" h={40} /></div>
          ))}
        </article>
        <article className="tile glass t-det"><Sk w="35%" h={12} /><Sk w="60%" h={36} /><Sk w="45%" h={26} r={999} /></article>
        <article className="tile glass t-num"><Sk w="40%" h={12} /><Sk w="100%" h={22} /><Sk w="100%" h={22} /></article>
      </div>
    );
  }

  if (!outcome) {
    return (
      <div className="bento">
        <article className="tile glass t-empty">
          <span className="tile-label">Waiting for values</span>
          <p className="muted">Fill in every cell of the matrix and press Solve.</p>
        </article>
      </div>
    );
  }

  const o = outcome;
  return (
    <div className="bento reveal">
      <article className="tile glass t-solution">
        <span className="tile-label">Solution</span>
        {o.ok ? (
          <div>
            {o.solutions.map((s, i) => (
              <div className="sol" key={i}>
                <Var>{VARS[i]}</Var>
                <span className="sol-eq">=</span>
                <span className="sol-val"><ValueText f={s} /></span>
                {show(s).approx && <span className="sol-frac">exactly {fracText(s)}</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">
            There is no single answer. The equations either contradict each other or describe the same line or plane.
          </p>
        )}
      </article>

      <article className="tile glass t-det">
        <span className="tile-label">Determinant</span>
        <div className="det-line">
          <Var>D</Var>
          <span className="sol-eq">=</span>
          <span className="det-val"><ValueText f={o.D.value} /></span>
        </div>
        <span className={o.ok ? "chip ok" : "chip no"}>
          {o.ok ? <LuCircleCheck /> : <LuCircleAlert />}
          {o.ok ? "One unique solution" : "No unique solution"}
        </span>
      </article>

      <article className="tile glass t-num">
        <span className="tile-label">Numerators</span>
        {o.ok ? (
          <div>
            {o.numerators.map((bd, i) => (
              <div className="num-row" key={i}>
                <Sym base="D" sub={VARS[i]} />
                <span className="num"><ValueText f={bd.value} /></span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Skipped, because D is 0.</p>
        )}
      </article>
    </div>
  );
}

/* ============================================================
   Step-by-step solution
   ============================================================ */

interface StepData {
  title: ReactNode;
  note?: ReactNode;
  body: ReactNode;
}

function buildSteps(o: Outcome): StepData[] {
  const n = o.A.length;
  const vars = VARS.slice(0, n);
  const steps: StepData[] = [];

  steps.push({
    title: "Write the system as matrices",
    note: <>The coefficients go into <Var>A</Var> and the right-hand sides go into <Var>b</Var>.</>,
    body: (
      <>
        <div className="eq-stack">
          {o.A.map((row, r) => <Equation key={r} row={row} rhs={o.b[r]} />)}
        </div>
        <div className="mats">
          <span className="mat-pair"><Var>A</Var><span className="op">=</span><Mat m={o.A} /></span>
          <span className="mat-pair"><Var>b</Var><span className="op">=</span><Mat m={o.b.map((v) => [v])} col={0} /></span>
        </div>
      </>
    ),
  });

  steps.push({
    title: <>Find <Var>D</Var>, the determinant of <Var>A</Var></>,
    note:
      n === 3 ? (
        <>
          Expand along row 1: <Var>D</Var> = <Sym base="a" sub="11" /><Sym base="M" sub="11" /> − <Sym base="a" sub="12" />
          <Sym base="M" sub="12" /> + <Sym base="a" sub="13" /><Sym base="M" sub="13" />. Each <Var>M</Var> is the 2 × 2
          determinant left after crossing out that entry's row and column.
        </>
      ) : (
        <>
          Multiply down the main diagonal and subtract the other diagonal: <Var>D</Var> = <Sym base="a" sub="11" />
          <Sym base="a" sub="22" /> − <Sym base="a" sub="12" /><Sym base="a" sub="21" />.
        </>
      ),
    body: (
      <>
        <Mat m={o.A} row={n === 3 ? 0 : -1} />
        <DetWork bd={o.D} name={<Var>D</Var>} />
      </>
    ),
  });

  steps.push({
    title: <>Check that <Var>D</Var> is not zero</>,
    body: o.ok ? (
      <p className="verdict ok">
        <LuCircleCheck /> <span><Var>D</Var> = <Num f={o.D.value} /> is not zero, so the system has exactly one solution.</span>
      </p>
    ) : (
      <p className="verdict no">
        <LuCircleAlert /> <span><Var>D</Var> = 0, so the system has no solution or infinitely many. Cramer's rule stops here.</span>
      </p>
    ),
  });

  if (!o.ok) return steps;

  vars.forEach((v, col) => {
    const bd = o.numerators[col];
    steps.push({
      title: <>Find <Sym base="D" sub={v} /> by putting <Var>b</Var> in column {col + 1}</>,
      note: <>Copy <Var>A</Var>, then replace the <Var>{v}</Var> column with <Var>b</Var>. The amber column is <Var>b</Var>.</>,
      body: (
        <>
          <Mat m={bd.matrix} col={col} />
          <DetWork bd={bd} name={<Sym base="D" sub={v} />} />
        </>
      ),
    });
  });

  steps.push({
    title: <>Divide each numerator by <Var>D</Var></>,
    body: (
      <Work
        lines={vars.map((v, i) => ({
          lhs: <Var>{v}</Var>,
          rhs: (
            <>
              <Num f={o.numerators[i].value} /> <span className="op">÷</span> <MaybeParen f={o.D.value} />{" "}
              <span className="op">=</span> <Num f={o.solutions[i]} strong />
            </>
          ),
        }))}
      />
    ),
  });

  steps.push({
    title: "Check the answer",
    note: "Put the values back into each equation. Every left side should equal its b value.",
    body: (
      <div className="checks">
        {o.A.map((row, r) => {
          const products = row.map((a, j) => a.mul(o.solutions[j]));
          const total = products.reduce((sum, t) => sum.add(t), Frac.ZERO);
          return (
            <div className="check" key={r}>
              <span className="check-tag">Eq {r + 1}</span>
              <span>
                {row.map((a, j) => (
                  <Fragment key={j}>
                    {j > 0 && <span className="op"> + </span>}
                    <Factor f={a} />
                    <Factor f={o.solutions[j]} />
                  </Fragment>
                ))}{" "}
                <span className="op">=</span> <SignedSum terms={products} /> <span className="op">=</span> <Num f={total} strong />
              </span>
              <span className="chip ok"><LuCheck /> matches <Sym base="b" sub={r + 1} /></span>
            </div>
          );
        })}
      </div>
    ),
  });

  return steps;
}

function Steps({ outcome, loading }: { outcome: Outcome | null; loading: boolean }) {
  if (loading) {
    return (
      <ol className="steps">
        {[0, 1, 2].map((i) => (
          <li className="step" key={i}>
            <span className="step-no sk" />
            <article className="step-card glass">
              <Sk w="40%" h={18} />
              <Sk w="75%" h={12} />
              <Sk w="100%" h={110} r={14} />
            </article>
          </li>
        ))}
      </ol>
    );
  }
  if (!outcome) return <p className="muted">The working appears here after you solve.</p>;

  return (
    <ol className="steps reveal">
      {buildSteps(outcome).map((s, i) => (
        <li className="step" key={i}>
          <span className="step-no">{String(i + 1).padStart(2, "0")}</span>
          <article className="step-card glass">
            <h3>{s.title}</h3>
            {s.note && <p className="step-note">{s.note}</p>}
            <div className="step-body">{s.body}</div>
          </article>
        </li>
      ))}
    </ol>
  );
}

/* ============================================================
   How it works: 3 cards in a row
   ============================================================ */

const HOW = [
  { icon: <LuGrid2X2 />, title: "Pick a size", text: "2 × 2 for two equations in x and y, or 3 × 3 for three in x, y and z." },
  { icon: <LuMousePointerClick />, title: "Type your values", text: "Each cell takes a whole number, a decimal like 0.52 or a fraction like 3/4." },
  { icon: <LuListOrdered />, title: "Read the working", text: "D, every numerator determinant, the division and a final check, laid out like on paper." },
];

/* ============================================================
   App
   ============================================================ */

export default function App() {
  const [n, setN] = useState<Size>(3);
  const [grids, setGrids] = useState<Record<Size, Grid>>(() => ({ 2: cloneGrid(EXAMPLES[2]), 3: cloneGrid(EXAMPLES[3]) }));
  const [outcome, setOutcome] = useState<Outcome | null>(() => readGrid(EXAMPLES[3], 3).outcome);
  const [loading, setLoading] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [section, setSection] = useState<Section>("home");
  const timer = useRef<number | undefined>(undefined);
  const grid = grids[n];

  const go = (id: Section) =>
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

  function run(g: Grid, size: Size, scroll: boolean) {
    window.clearTimeout(timer.current);
    const read = readGrid(g, size);
    setFlagged(new Set([...read.empty, ...read.bad]));
    const names = (keys: string[]) =>
      keys.map((k) => { const [r, c] = k.split("-").map(Number); return cellName(size, r, c); }).join(", ");
    if (read.bad.length) {
      setMessage(`${names(read.bad)} ${read.bad.length === 1 ? "is" : "are"} not a number. Try 2, -0.5 or 3/4.`);
      return;
    }
    if (read.empty.length) {
      setMessage(`Fill in ${names(read.empty)} first.`);
      return;
    }
    setMessage("");
    setDirty(false);
    setLoading(true);
    if (scroll) go("answer");
    timer.current = window.setTimeout(() => {
      setOutcome(read.outcome);
      setLoading(false);
    }, prefersReducedMotion() ? 150 : 700);
  }

  function changeSize(s: Size) {
    if (s === n) return;
    setN(s);
    setMessage("");
    setFlagged(new Set());
    setDirty(false);
    if (readGrid(grids[s], s).outcome) {
      run(grids[s], s, false);
    } else {
      window.clearTimeout(timer.current);
      setLoading(false);
      setOutcome(null);
    }
  }

  function editCell(r: number, c: number, value: string) {
    setGrids((prev) => {
      const g = cloneGrid(prev[n]);
      if (c === n) g.b[r] = value;
      else g.A[r][c] = value;
      return { ...prev, [n]: g };
    });
    setFlagged((prev) => {
      const key = `${r}-${c}`;
      const isBad = value.trim() !== "" && !parseValue(value);
      if (prev.has(key) === isBad) return prev;
      const next = new Set(prev);
      if (isBad) next.add(key);
      else next.delete(key);
      return next;
    });
    setMessage("");
    if (outcome) setDirty(true);
  }

  function loadExample() {
    const g = cloneGrid(EXAMPLES[n]);
    setGrids((prev) => ({ ...prev, [n]: g }));
    run(g, n, false);
  }

  function clearGrid() {
    window.clearTimeout(timer.current);
    setGrids((prev) => ({ ...prev, [n]: emptyGrid(n) }));
    setOutcome(null);
    setLoading(false);
    setDirty(false);
    setFlagged(new Set());
    setMessage("");
    window.setTimeout(() => document.getElementById(cellId(0, 0))?.focus(), 0);
  }

  /* Breadcrumbs and the active nav link follow the section in the middle of the screen */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setSection(entry.target.getAttribute("data-section") as Section);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    document.querySelectorAll("[data-section]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* Cursor: a soft light follows the pointer behind the glass. The normal cursor stays. */
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    let frame = 0;
    let x = 0;
    let y = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--mx", `${x}px`);
        root.style.setProperty("--my", `${y}px`);
        root.classList.add("has-pointer");
        frame = 0;
      });
    };
    const leave = () => root.classList.remove("has-pointer");
    window.addEventListener("pointermove", move);
    root.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      root.removeEventListener("mouseleave", leave);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <div className="backdrop" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
        <span className="dots" />
      </div>
      <div className="spotlight" aria-hidden="true" />

      <Nav section={section} n={n} go={go} />

      <main>
        <Hero n={n} onSize={changeSize} />

        <section className="stage" id="solver" data-section="solver">
          <Solver
            n={n}
            grid={grid}
            flagged={flagged}
            message={message}
            canUpdate={dirty && outcome !== null}
            onCell={editCell}
            onSolve={() => run(grid, n, true)}
            onExample={loadExample}
            onClear={clearGrid}
          />
        </section>

        <section className="section" id="answer" data-section="answer" aria-live="polite" aria-busy={loading}>
          <div className="section-head">
            <h2>Answer</h2>
          </div>
          <Answer outcome={outcome} loading={loading} n={n} />
        </section>

        <section className="section" id="steps" data-section="steps">
          <div className="section-head">
            <h2>Step-by-step <em>solution</em></h2>
            <p>The same working you would write on paper, with every multiplication shown.</p>
          </div>
          <Steps outcome={outcome} loading={loading} />
        </section>

        <section className="section" id="how" data-section="how">
          <div className="section-head">
            <h2>How it works</h2>
          </div>
          <div className="how-grid">
            {HOW.map((h, i) => (
              <article className="how-card glass" key={h.title}>
                <div className="how-top">
                  <span className="how-icon">{h.icon}</span>
                  <span className="how-no">0{i + 1}</span>
                </div>
                <h3>{h.title}</h3>
                <p>{h.text}</p>
              </article>
            ))}
          </div>
        </section>
        <div className="end" />
      </main>
    </>
  );
}
