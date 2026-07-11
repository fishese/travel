// Napkin math: each line of freeform shopping notes may contain an
// arithmetic expression buried in descriptive text. We extract it two ways:
//
// 1. Contiguous: "sweater 32 x 5" — the digits/operators sit next to each
//    other, so grab the longest run of math-only characters.
// 2. Gap-chained: "30 per bottle /5" — the operator is separated from its
//    number by words. We find all numbers in the line, and connect
//    consecutive ones whenever the text between them contains an operator
//    symbol anywhere (ignoring the surrounding words). A gap with no
//    operator breaks the chain — the numbers are treated as unrelated.
//
// Pure comment lines (no operator found at all) return null and are left
// alone, per "ignore text comments."

function evaluateExpression(expr: string): number | null {
  const tokens = expr.match(/\d+(\.\d+)?|[+\-*/()]/g)
  if (!tokens || tokens.length === 0) return null
  let pos = 0
  const peek = () => tokens[pos]
  const consume = () => tokens[pos++]

  function parseExpr(): number {
    let value = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = consume()
      value = op === '+' ? value + parseTerm() : value - parseTerm()
    }
    return value
  }
  function parseTerm(): number {
    let value = parseFactor()
    while (peek() === '*' || peek() === '/') {
      const op = consume()
      value = op === '*' ? value * parseFactor() : value / parseFactor()
    }
    return value
  }
  function parseFactor(): number {
    if (peek() === '(') {
      consume()
      const value = parseExpr()
      if (peek() === ')') consume()
      return value
    }
    const n = parseFloat(consume())
    if (Number.isNaN(n)) throw new Error('bad token')
    return n
  }

  try {
    const value = parseExpr()
    if (pos !== tokens.length) return null // leftover/malformed tokens
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

const CONTIGUOUS_RUN = /[0-9.,\s+\-*/×÷xX()]+/g

function findContiguousExpression(line: string): string | null {
  const runs = line.match(CONTIGUOUS_RUN) ?? []
  let best: string | null = null
  for (const run of runs) {
    const trimmed = run.trim()
    if (/\d/.test(trimmed) && /[+\-*/×÷xX]/.test(trimmed)) {
      if (!best || trimmed.length > best.length) best = trimmed
    }
  }
  if (!best) return null
  return best.replace(/,/g, '').replace(/[×xX]/g, '*').replace(/÷/g, '/')
}

function findOperatorInGap(gap: string): string | null {
  const symbol = gap.match(/[+\-*/×÷]/)
  if (symbol) {
    const s = symbol[0]
    return s === '×' ? '*' : s === '÷' ? '/' : s
  }
  // 'x' is ambiguous with the letter x, so only count it as multiply when
  // it stands alone as a word (surrounded by whitespace/boundaries) — this
  // is what keeps "next" or "Box 5" from being misread.
  if (/(?:^|\s)[xX](?:\s|$)/.test(gap)) return '*'
  return null
}

function findGapChainedExpression(line: string): string | null {
  const numbers = [...line.matchAll(/\d[\d,]*(\.\d+)?/g)]
  if (numbers.length < 2) return null

  let chain: string[] = []
  let lastCandidate: string | null = null

  const flush = () => {
    if (chain.length >= 3) lastCandidate = chain.join('')
    chain = []
  }

  for (let i = 0; i < numbers.length; i++) {
    if (chain.length === 0) chain.push(numbers[i][0].replace(/,/g, ''))
    if (i === numbers.length - 1) break
    const gapStart = numbers[i].index! + numbers[i][0].length
    const gapEnd = numbers[i + 1].index!
    const op = findOperatorInGap(line.slice(gapStart, gapEnd))
    if (op) {
      chain.push(op, numbers[i + 1][0].replace(/,/g, ''))
    } else {
      flush()
    }
  }
  flush()
  return lastCandidate
}

/** Returns the calculated result for a line, or null if it's just a note. */
export function calculateLine(line: string): number | null {
  const contiguous = findContiguousExpression(line)
  if (contiguous) {
    const result = evaluateExpression(contiguous)
    if (result !== null) return result
  }
  const chained = findGapChainedExpression(line)
  if (chained) return evaluateExpression(chained)
  return null
}
