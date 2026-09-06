import { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { Icon } from '../components/ui.jsx'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    cadence: 'forever',
    blurb: 'Diagnostics, Learning GPS, peer swaps, and the semester certificate.',
    features: ['Scripted peer checks', 'Questions board', 'Peer Teaching certificate'],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 7.99,
    cadence: 'month',
    blurb: 'Priority matching when a unit is busy, plus extra diagnostics each week.',
    features: ['Everything in Free', 'Priority match queue', '5 extra diagnostics / week'],
  },
]

function formatCardNumber(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function Payment() {
  const { user } = useAuth()
  const [planId, setPlanId] = useState('plus')
  const [name, setName] = useState(user?.name || '')
  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const plan = PLANS.find((p) => p.id === planId) || PLANS[0]
  const due = plan.price === 0 ? 'A$0.00' : `A$${plan.price.toFixed(2)}`

  function onSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="page stack">
      <div>
        <h1 className="page-title">Payment</h1>
        <p className="page-sub">
          Choose a plan and add a card. Charges are not processed yet — this is the checkout UI for the demo.
        </p>
      </div>

      <div className="pay-plans">
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`pay-plan${planId === p.id ? ' active' : ''}`}
            onClick={() => {
              setPlanId(p.id)
              setSubmitted(false)
            }}
          >
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <b>{p.name}</b>
              {p.id === 'free' && <span className="tag">Current</span>}
            </div>
            <p className="pay-price">
              {p.price === 0 ? 'A$0' : `A$${p.price.toFixed(2)}`}
              <small>{p.price === 0 ? ' forever' : ` / ${p.cadence}`}</small>
            </p>
            <p className="muted">{p.blurb}</p>
            <ul className="pay-features">
              {p.features.map((f) => (
                <li key={f}>
                  <Icon name="check" size={14} />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="grid-2">
        <form className="card pad stack" onSubmit={onSubmit}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>Card details</h3>
            <span className="muted" style={{ fontSize: 13 }}>
              Visa · Mastercard · Amex
            </span>
          </div>
          <label className="field">
            <span>Name on card</span>
            <input
              name="cc-name"
              autoComplete="cc-name"
              placeholder="Maya Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={plan.price > 0}
            />
          </label>
          <label className="field">
            <span>Card number</span>
            <input
              name="cc-number"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
              value={card}
              onChange={(e) => setCard(formatCardNumber(e.target.value))}
              required={plan.price > 0}
            />
          </label>
          <div className="pay-split">
            <label className="field">
              <span>Expiry</span>
              <input
                name="cc-exp"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                required={plan.price > 0}
              />
            </label>
            <label className="field">
              <span>CVC</span>
              <input
                name="cc-csc"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                maxLength={4}
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required={plan.price > 0}
              />
            </label>
          </div>
          {plan.price === 0 ? (
            <button className="btn btn-secondary btn-lg" type="submit">
              Stay on Free
            </button>
          ) : (
            <button className="btn btn-primary btn-lg" type="submit">
              Pay {due}
            </button>
          )}
        </form>

        <div className="stack">
          <div className="card pad stack">
            <h3>Order summary</h3>
            <div className="pay-line">
              <span>GapSwap {plan.name}</span>
              <b>{due}</b>
            </div>
            <div className="pay-line">
              <span>GST</span>
              <span>{plan.price === 0 ? 'A$0.00' : 'Included'}</span>
            </div>
            <div className="pay-line pay-total">
              <span>Due today</span>
              <b>{due}</b>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              Receipts would go to {user?.email || 'your university email'}. Cancel anytime from this page once
              billing is live.
            </p>
          </div>
          {submitted && (
            <div className="card pad success-card stack">
              <h3>Nothing was charged</h3>
              <p>
                {plan.price === 0
                  ? 'You are staying on the Free student plan. Payment processing will plug in here later.'
                  : `${plan.name} checkout is wired for the UI only. No card was stored or billed.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
