/* Exact fraction arithmetic, the TypeScript version of Python's Fraction.
   Every value stays exact, so 0.3 stays 0.3 and a zero determinant is exactly zero. */

const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
};

export class Frac {
  readonly n: bigint;
  readonly d: bigint;

  constructor(n: bigint | number, d: bigint | number = 1n) {
    let num = BigInt(n);
    let den = BigInt(d);
    if (den === 0n) throw new Error("Division by zero.");
    if (den < 0n) {
      num = -num;
      den = -den;
    }
    const g = gcd(num, den) || 1n;
    this.n = num / g;
    this.d = den / g;
  }

  static readonly ZERO = new Frac(0n);
  static readonly ONE = new Frac(1n);

  add(o: Frac): Frac { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o: Frac): Frac { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o: Frac): Frac { return new Frac(this.n * o.n, this.d * o.d); }
  div(o: Frac): Frac { return new Frac(this.n * o.d, this.d * o.n); }
  neg(): Frac { return new Frac(-this.n, this.d); }
  abs(): Frac { return this.n < 0n ? this.neg() : this; }
  isZero(): boolean { return this.n === 0n; }
  isNeg(): boolean { return this.n < 0n; }
}

/* ---------- Your Python functions, ported line for line ---------- */

export function det(matrix: Frac[][]): Frac {
  const n = matrix.length;
  if (n === 1) return matrix[0][0];
  if (n === 2) return matrix[0][0].mul(matrix[1][1]).sub(matrix[0][1].mul(matrix[1][0]));
  let total = Frac.ZERO;
  for (let col = 0; col < n; col++) {
    const minor = matrix.slice(1).map((row) => [...row.slice(0, col), ...row.slice(col + 1)]);
    const sign = col % 2 === 0 ? Frac.ONE : Frac.ONE.neg(); // (-1) ** col
    total = total.add(sign.mul(matrix[0][col]).mul(det(minor)));
  }
  return total;
}

export function replaceColumn<T>(matrix: T[][], constants: T[], column: number): T[][] {
  const newMatrix = matrix.map((row) => [...row]);
  for (let i = 0; i < matrix.length; i++) newMatrix[i][column] = constants[i];
  return newMatrix;
}

export interface CramerResult {
  determinant: Frac;
  numerators: Frac[];
  solutions: Frac[];
}

export function cramersRule(matrix: Frac[][], constants: Frac[]): CramerResult {
  const n = matrix.length;
  if (n !== 2 && n !== 3) throw new Error("Only 2x2 and 3x3 matrices are supported.");
  if (matrix.some((row) => row.length !== n) || constants.length !== n) {
    throw new Error("Invalid matrix dimensions.");
  }
  const D = det(matrix);
  if (D.isZero()) throw new Error("The system has no unique solution.");

  const numerators: Frac[] = [];
  const solutions: Frac[] = [];
  for (let col = 0; col < n; col++) {
    const Di = det(replaceColumn(matrix, constants, col));
    numerators.push(Di);
    solutions.push(Di.div(D));
  }
  return { determinant: D, numerators, solutions };
}

/* ---------- Reading what the user typed ---------- */

function parseDecimal(text: string): Frac | null {
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(text);
  if (!m || (m[2] === "" && !m[3])) return null;
  const frac = m[3] ?? "";
  let n = BigInt((m[2] || "0") + frac);
  let d = 10n ** BigInt(frac.length);
  const exp = m[4] ? parseInt(m[4], 10) : 0;
  if (Math.abs(exp) > 300) return null;
  if (exp > 0) n *= 10n ** BigInt(exp);
  if (exp < 0) d *= 10n ** BigInt(-exp);
  return new Frac(m[1] === "-" ? -n : n, d);
}

/** Accepts 2, -0.5, .75, 3/4, -1/3 or 1e-5. Returns null for anything else. */
export function parseValue(raw: string): Frac | null {
  const text = raw.trim().replace(/−/g, "-").replace(/\s+/g, "");
  const parts = text.split("/");
  if (text === "" || parts.length > 2) return null;
  const top = parseDecimal(parts[0]);
  const bottom = parts.length === 2 ? parseDecimal(parts[1]) : Frac.ONE;
  if (!top || !bottom || bottom.isZero()) return null;
  return top.div(bottom);
}

/* ---------- Showing numbers ---------- */

const MINUS = "−";

function decimalPlaces(f: Frac): number {
  let d = f.d;
  let twos = 0;
  let fives = 0;
  while (d % 2n === 0n) { d /= 2n; twos++; }
  while (d % 5n === 0n) { d /= 5n; fives++; }
  return d === 1n ? Math.max(twos, fives) : -1; // -1 means the decimal never ends
}

function fixed(f: Frac, places: number): string {
  const neg = f.n < 0n;
  const n = neg ? -f.n : f.n;
  const q = (n * 10n ** BigInt(places) * 2n + f.d) / (2n * f.d);
  const s = q.toString().padStart(places + 1, "0");
  const whole = s.slice(0, s.length - places);
  const part = s.slice(s.length - places).replace(/0+$/, "");
  const out = part ? `${whole}.${part}` : whole;
  return (neg && out !== "0" ? MINUS : "") + out;
}

export interface Shown {
  text: string;
  approx: boolean;
}

/** Exact decimal when it ends within 12 places, otherwise a rounded value marked approx. */
export function show(f: Frac): Shown {
  const p = decimalPlaces(f);
  if (p >= 0 && p <= 12) return { text: fixed(f, p), approx: false };
  if (f.abs().n * 10000n >= f.abs().d) return { text: fixed(f, 8), approx: true };
  const [mant, exp] = (Number(f.n) / Number(f.d)).toExponential(6).split("e");
  return { text: `${mant.replace(/\.?0+$/, "")}e${exp}`.replace(/-/g, MINUS), approx: p < 0 };
}

export const fracText = (f: Frac): string =>
  (f.isNeg() ? MINUS : "") + f.abs().n.toString() + (f.d === 1n ? "" : `/${f.d}`);

/** Short form for working: a decimal when exact, otherwise a fraction like 1/3. */
export const fmt = (f: Frac): string => (show(f).approx ? fracText(f) : show(f).text);

/* ---------- Data for the step-by-step solution ---------- */

export interface Det2 {
  m: Frac[][];
  p: Frac; // main diagonal product
  q: Frac; // other diagonal product
  value: Frac;
}

export interface Breakdown {
  matrix: Frac[][];
  two: Det2 | null; // set for a 2x2 matrix
  minors: Det2[]; // set for a 3x3 matrix, one per entry of row 1
  terms: Frac[]; // signed products a1j * M1j
  value: Frac;
}

export function det2(m: Frac[][]): Det2 {
  const p = m[0][0].mul(m[1][1]);
  const q = m[0][1].mul(m[1][0]);
  return { m, p, q, value: p.sub(q) };
}

export function breakdown(matrix: Frac[][]): Breakdown {
  if (matrix.length === 2) {
    const two = det2(matrix);
    return { matrix, two, minors: [], terms: [], value: two.value };
  }
  const minors = [0, 1, 2].map((j) => det2(matrix.slice(1).map((row) => row.filter((_, k) => k !== j))));
  const terms = minors.map((m, j) => {
    const t = matrix[0][j].mul(m.value);
    return j % 2 === 1 ? t.neg() : t;
  });
  const value = terms.reduce((sum, t) => sum.add(t), Frac.ZERO);
  return { matrix, two: null, minors, terms, value };
}

interface Base {
  A: Frac[][];
  b: Frac[];
  D: Breakdown;
}
export type Outcome =
  | (Base & { ok: true; numerators: Breakdown[]; solutions: Frac[] })
  | (Base & { ok: false });

export function solveSystem(A: Frac[][], b: Frac[]): Outcome {
  const D = breakdown(A);
  try {
    const result = cramersRule(A, b);
    const numerators = A.map((_, col) => breakdown(replaceColumn(A, b, col)));
    return { A, b, D, ok: true, numerators, solutions: result.solutions };
  } catch {
    return { A, b, D, ok: false };
  }
}
