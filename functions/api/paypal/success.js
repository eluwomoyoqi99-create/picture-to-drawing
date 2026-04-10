/**
 * GET /api/paypal/success?subscription_id=...
 * Called after PayPal approval — activate Pro for user
 */
export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const subscriptionId = url.searchParams.get('subscription_id')

  if (!subscriptionId) {
    return Response.redirect('https://birdsee.com/?payment=error', 302)
  }

  // Get PayPal access token
  const tokenRes = await fetch(
    `${env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'}/v1/oauth2/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      },
      body: 'grant_type=client_credentials',
    }
  )
  const { access_token } = await tokenRes.json()

  // Verify subscription is ACTIVE
  const subRes = await fetch(
    `${env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'}/v1/billing/subscriptions/${subscriptionId}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  )
  const sub = await subRes.json()

  if (sub.status !== 'ACTIVE') {
    return Response.redirect('https://birdsee.com/?payment=error', 302)
  }

  // Determine plan type from plan_id
  const isAnnual = sub.plan_id === env.PAYPAL_PLAN_ID_ANNUAL
  const plan = isAnnual ? 'pro_annual' : 'pro_monthly'

  // Read current session cookie
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    })
  )

  let session = {}
  try {
    if (cookies.user_session) session = JSON.parse(atob(cookies.user_session))
  } catch {}

  // Update session with Pro status
  session.plan = plan
  session.subscription_id = subscriptionId
  session.plan_expires = isAnnual
    ? Math.floor(Date.now() / 1000) + 86400 * 366
    : Math.floor(Date.now() / 1000) + 86400 * 32
  session.exp = Math.floor(Date.now() / 1000) + 86400 * 7

  const newCookie = btoa(JSON.stringify(session))

  const headers = new Headers({ Location: 'https://birdsee.com/?payment=success' })
  headers.append('Set-Cookie',
    `user_session=${newCookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${86400 * 7}`
  )

  return new Response(null, { status: 302, headers })
}
