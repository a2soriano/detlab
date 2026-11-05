# DetLab

A Cramer's rule solver for 2 × 2 and 3 × 3 linear systems. Type the coefficients straight into the matrix, press **Solve**, and get the answer along with the full worked solution: every 2 × 2 minor, the determinant D, each numerator determinant (Dx, Dy, Dz) with the swapped column highlighted, the final division, and a check that puts the answers back into the original equations.

Built with React, TypeScript and Vite.

## Features

**Tap-to-type matrix.** Click any cell (a₁₁, a₁₂, …, b₃) and type. Enter moves to the next cell, Shift+Enter goes back, and the arrow keys move up and down rows.

**Live equation preview.** The system you are building is written out under the matrix as you type.

**Exact arithmetic.** Every value is stored as a fraction (like Python's `Fraction`), so `0.3` stays `0.3`, answers print without floating point noise, and a zero determinant is detected exactly.

**Flexible input.** Whole numbers, decimals (`0.52`, `.75`), negatives, fractions (`3/4`) and scientific notation (`1e-5`) all work.

**Step-by-step working** is written the way you would do it on paper. Singular systems (D = 0) are reported as having no unique solution, and the working stops there.

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Then open the address Vite prints, usually http://localhost:5173.

To make a production build in `dist/`:

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  cramer.ts    Exact fractions, det(), replaceColumn(), cramersRule(), and the data for the worked steps
  App.tsx      The page: navigation, hero, solver, answer, step-by-step solution, how it works
  index.css    All styles
  main.tsx     Entry point
```

## How the math works

`det`, `replaceColumn` and `cramersRule` in `src/cramer.ts` follow the original Python version line for line. `det` uses cofactor expansion along the first row. `replaceColumn` copies the matrix and swaps one column for the constants b. `cramersRule` checks the size, computes D, rejects D = 0, then divides each numerator determinant by D.

Example, using the default 3 × 3 system:

```
0.3x + 0.52y +   1z = −0.01
0.5x +    1y + 1.9z =  0.67
0.1x +  0.3y + 0.5z = −0.44

D  = −0.0022
Dx = 0.03278    x = −14.9
Dy = 0.0649     y = −29.5
Dz = −0.04356   z = 19.8
```
