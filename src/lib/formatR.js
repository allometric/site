// Client-side R expression formatter for prediction-function code blocks.
//
// Prediction functions are stored as single-line R expressions (statements
// separated by top-level semicolons). This module rewraps them for display:
//   - statements split onto their own lines at top-level semicolons;
//   - lines break after binary operators (+, -, *, /, ,), keeping the
//     operator at the end of the line as R's parser expects;
//   - unary operators are never break points: `<-`, `(-x)` and exponents
//     such as `1e-5` stay intact;
//   - continuation lines are indented two spaces (tidyverse convention);
//   - `if (cond) { ... } else { ... }` is expanded to block form.
// Source tabs/newlines are normalized to single spaces and the output never
// contains tab characters.

const CODE_WIDTH = 66;
// The wide content column fits ~68 monospace characters at the site's 15px
// code font; 66 leaves headroom for the two-space continuation indent.

const INDENT = '  ';

/**
 * True when `ch` is a binary operator we can break after. `-`/`+` are binary
 * only when the previous significant character is an operand; `-` after `<`
 * (the `<-` assignment), after `(`/`,`/another operator (unary minus) or in
 * scientific notation (`1e-5`, where the preceding `e` follows a digit) is
 * not.
 */
function isBinaryOp(ch, prev, prev2) {
	if (ch === '+' || ch === '-') {
		if (!/[a-zA-Z0-9_)\]}]/.test(prev)) return false;
		if (ch === '-' && /[eE]/.test(prev) && /\d/.test(prev2)) return false;
		return true;
	}
	return ch === '*' || ch === '/' || ch === ',';
}

/**
 * Characters from `from` up to (but not including) the next binary operator,
 * counting spaces. Stops early at `;` so a lookahead never crosses a
 * statement boundary.
 */
function runLen(expr, from, prev, prev2) {
	let n = 0;
	let p = prev;
	let p2 = prev2;
	for (let j = from; j < expr.length; j++) {
		const c = expr[j];
		if (c === ' ') {
			n++;
			continue;
		}
		if (c === ';' || isBinaryOp(c, p, p2)) return n;
		p2 = p;
		p = c;
		n++;
	}
	return n;
}

/**
 * Split an expression into statements at top-level semicolons (outside parens
 * and braces). Returns trimmed, non-empty statements.
 */
function splitStatements(expr) {
	const out = [];
	let depth = 0;
	let braceDepth = 0;
	let cur = '';
	for (const ch of expr) {
		if (ch === '(') depth++;
		else if (ch === ')') depth--;
		else if (ch === '{') braceDepth++;
		else if (ch === '}') braceDepth--;
		if (ch === ';' && depth === 0 && braceDepth === 0) {
			if (cur.trim()) out.push(cur.trim());
			cur = '';
		} else {
			cur += ch;
		}
	}
	if (cur.trim()) out.push(cur.trim());
	return out;
}

/**
 * Wrap a single statement (already split on top-level semicolons) to `width`,
 * breaking after binary operators. Returns the rendered lines; the first line
 * starts at `startIndent` and continuation lines at `startIndent + INDENT`
 * (so the width math includes the indent, e.g. inside if/else bodies). A line
 * breaks at an operator when continuing to the next operator would exceed the
 * width, so no line ever overflows.
 */
function wrapStatement(expr, width, startIndent = '') {
	const lines = [];
	let line = startIndent;
	let prev = '';
	let prev2 = '';
	for (let i = 0; i < expr.length; i++) {
		const ch = expr[i];
		const breakOp = ch !== ' ' && isBinaryOp(ch, prev, prev2);
		if (ch !== ' ') {
			prev2 = prev;
			prev = ch;
		}
		line += ch;

		if (breakOp && i < expr.length - 1 && line.length + runLen(expr, i + 1, prev, prev2) + 1 > width) {
			lines.push(line.trimEnd());
			line = startIndent + INDENT;
			prev = '';
			prev2 = '';
			while (i + 1 < expr.length && expr[i + 1] === ' ') i++;
		}
	}
	if (line.trim()) lines.push(line.trimEnd());
	return lines;
}

/** Index of the `}` matching the `{` at `open`, or -1 if unbalanced. */
function matchBrace(s, open) {
	let depth = 0;
	for (let i = open; i < s.length; i++) {
		if (s[i] === '{') depth++;
		else if (s[i] === '}') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

/**
 * Expand `if (cond) { body } else { body }` into block form. Returns the
 * rendered lines, or null when the statement isn't exactly that shape (no
 * braces, no `else`, trailing junk), in which case the caller falls back to
 * plain line wrapping.
 */
function tryIfElse(s, width, indent = '') {
	if (!/^if\s*\(/.test(s)) return null;
	let depth = 0;
	let i = s.indexOf('(');
	for (; i < s.length; i++) {
		if (s[i] === '(') depth++;
		else if (s[i] === ')') {
			depth--;
			if (depth === 0) break;
		}
	}
	if (i === s.length) return null;
	const cond = s.slice(0, i + 1);

	let j = i + 1;
	while (j < s.length && s[j] === ' ') j++;
	if (s[j] !== '{') return null;
	const body1End = matchBrace(s, j);
	if (body1End === -1) return null;

	let k = body1End + 1;
	while (k < s.length && s[k] === ' ') k++;
	const m = s.slice(k).match(/^else\s*\{/);
	if (!m) return null;

	const body2End = matchBrace(s, k + m[0].length - 1);
	if (body2End === -1) return null;
	if (s.slice(body2End + 1).trim() !== '') return null;

	const bodyIndent = indent + INDENT;
	return [
		`${indent}${cond} {`,
		...formatStatements(s.slice(j + 1, body1End), width, bodyIndent).split('\n'),
		`${indent}} else {`,
		...formatStatements(s.slice(k + m[0].length, body2End), width, bodyIndent).split('\n'),
		`${indent}}`,
	];
}

/** Format a semicolon-separated expression: one statement per line. */
function formatStatements(text, width, indent = '') {
	return splitStatements(text)
		.map((s) => (tryIfElse(s, width, indent) ?? wrapStatement(s, width, indent)).join('\n'))
		.join('\n');
}

/**
 * Format a prediction-function expression for display: normalize whitespace,
 * split statements, wrap each to `width`, expand if/else blocks. Returns the
 * rendered R source (spaces only — never tab characters).
 */
export function formatR(expr, width = CODE_WIDTH) {
	const clean = expr.trim().replace(/\s+/g, ' ');
	if (!clean) return '';
	return formatStatements(clean, width);
}
