import { useLayoutEffect, useRef, useState } from 'react'
import type { IllustrationRowDTO } from '@app/core'
import { formatINR, formatINRCompact } from '../lib/format'

const HEIGHT = 300
const M = { top: 20, right: 104, bottom: 40, left: 64 }

function niceStep(max: number, ticks: number) {
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  return step
}

const SERIES = [
  { key: 'deathBenefit', label: 'Death benefit', color: 'var(--series-1)' },
  { key: 'cumulativePremium', label: 'Premiums paid to date', color: 'var(--series-2)' },
] as const

export function BenefitChart({ rows, maturityBenefit }: { rows: IllustrationRowDTO[]; maturityBenefit: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const [hover, setHover] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(entry!.contentRect.width, 320)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = rows.length
  const innerW = width - M.left - M.right
  const innerH = HEIGHT - M.top - M.bottom
  const maturity = Number(maturityBenefit)
  const peak = Math.max(maturity, ...rows.flatMap((r) => SERIES.map((s) => Number(r[s.key]))))
  const step = niceStep(peak, 4)
  const yMax = Math.ceil(peak / step) * step
  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step)

  const x = (year: number) => M.left + (n === 1 ? innerW / 2 : ((year - 1) / (n - 1)) * innerW)
  const y = (v: number) => M.top + innerH - (v / yMax) * innerH

  const xEvery = n <= 12 ? 1 : n <= 20 ? 2 : 5
  const xTicks = rows
    .map((r) => r.policyYear)
    .filter((yr) => (xEvery === 1 ? true : yr % xEvery === 0 || (yr === n && n % xEvery >= xEvery / 2)))

  const path = (key: (typeof SERIES)[number]['key']) =>
    rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.policyYear).toFixed(1)},${y(Number(r[key])).toFixed(1)}`).join('')

  const last = rows[n - 1]!
  const endYs = SERIES.map((s) => y(Number(last[s.key])))
  const maturityY = y(maturity)
  const clear = (a: number, b: number) => Math.abs(a - b) >= 16
  const showEndLabel = SERIES.map((_, i) => clear(endYs[i]!, maturityY) && clear(endYs[0]!, endYs[1]!))

  function onPointerMove(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - box.left
    const year = Math.round((px / box.width) * (n - 1)) + 1
    setHover(Math.min(Math.max(year, 1), n))
  }

  const hovered = hover ? rows[hover - 1] : undefined
  const tipLeft = hovered ? x(hovered.policyYear) : 0
  const flip = tipLeft > width - 230

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="legend">
        {SERIES.map((s) => (
          <span className="legend-item" key={s.key}>
            <span className="legend-key" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--series-3)' }} />
          Maturity benefit
        </span>
      </div>

      <div className="chart" ref={wrapRef}>
        <svg width={width} height={HEIGHT} role="img" aria-label="Death benefit and premiums paid by policy year">
          <g className="axis">
            {yTicks.map((t) => (
              <g key={t}>
                <line className="gridline" x1={M.left} x2={M.left + innerW} y1={y(t)} y2={y(t)} />
                <text x={M.left - 10} y={y(t)} dy="0.32em" textAnchor="end">
                  {t === 0 ? '0' : formatINRCompact(t)}
                </text>
              </g>
            ))}
            {xTicks.map((yr) => (
              <text key={yr} x={x(yr)} y={M.top + innerH + 18} textAnchor="middle">
                {yr}
              </text>
            ))}
            <text x={M.left + innerW} y={HEIGHT - 2} textAnchor="end">
              Policy year
            </text>
          </g>

          {SERIES.map((s) => (
            <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {SERIES.map(
            (s, i) =>
              showEndLabel[i] && (
                <text key={s.key} className="label" x={x(n) + 10} y={endYs[i]} dy="0.32em">
                  {formatINRCompact(last[s.key])}
                </text>
              ),
          )}

          <circle cx={x(n)} cy={maturityY} r={5} fill="var(--series-3)" stroke="var(--surface)" strokeWidth={2} />
          <text className="label" x={x(n) + 10} y={maturityY} dy="0.32em">
            Maturity {formatINRCompact(maturity)}
          </text>

          {hovered && (
            <g pointerEvents="none">
              <line className="crosshair" x1={tipLeft} x2={tipLeft} y1={M.top} y2={M.top + innerH} />
              {SERIES.map((s) => (
                <circle key={s.key} cx={tipLeft} cy={y(Number(hovered[s.key]))} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ))}
            </g>
          )}

          <rect
            x={M.left}
            y={M.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {hovered && (
          <div
            className="tooltip"
            style={{
              top: M.top,
              left: flip ? undefined : tipLeft + 14,
              right: flip ? width - tipLeft + 14 : undefined,
            }}
          >
            <div className="tooltip-title">
              Year {hovered.policyYear} · age {hovered.age}
            </div>
            {SERIES.map((s) => (
              <div className="tooltip-row" key={s.key}>
                <span>
                  <span className="legend-key" style={{ background: s.color }} />
                  {s.label}
                </span>
                <strong className="num">{formatINR(hovered[s.key])}</strong>
              </div>
            ))}
            <div className="tooltip-row">
              <span>Accrued bonus</span>
              <strong className="num">{formatINR(hovered.accruedBonus)}</strong>
            </div>
            {hovered.policyYear === n && (
              <div className="tooltip-row">
                <span>
                  <span className="legend-dot" style={{ background: 'var(--series-3)' }} />
                  Maturity benefit
                </span>
                <strong className="num">{formatINR(maturity)}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
