/**
 * POST /api/paypal/create-subscription
 * Returns { subscriptionId } after PayPal approves
 */
export async function onRequestPost(context) {
  const { request, env } = context

  // Verify user is logged in
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    })
  )
  const sessionCookie = cookies.user_session
  if (!sessionCookie) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let session
  try {
    session = JSON.parse(atob(sessionCookie))
  } catch {
    return Response.json({ error: 'Invalid session' }, { status: 401 })
  }

  const { plan } = await request.json() // 'monthly' | 'annual'

  const planId = plan === 'annual'
    ? env.PAYPAL_PLAN_ID_ANNUAL
    : env.PAYPAL_PLAN_ID_MONTHLY

  if (!planId) {
    return Response.json({ error: 'Plan not configured' }, { status: 500 })
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

  // Create subscription
  const subRes = await fetch(
    `${env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'}/v1/billing/subscriptions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        subscriber: { email_address: session.email },
        application_context: {
          brand_name: 'Picture to Drawing',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: 'https://birdsee.com/api/paypal/success',
          cancel_url: 'https://birdsee.com/?payment=cancelled',
        },
      }),
    }
  )
  const subscription = await subRes.json()

  if (!subscription.id) {
    return Response.json({ error: 'Failed to create subscription', details: subscription }, { status: 500 })
  }

  return Response.json({ subscriptionId: subscription.id })
}
