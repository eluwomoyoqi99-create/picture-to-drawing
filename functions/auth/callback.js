/**
 * GET /auth/callback
 * Exchange Google auth code for tokens, set session cookie
 */
export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)

  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return Response.json({ step: 'google_denied', error })
  }

  if (!code) {
    return Response.json({ step: 'no_code' })
  }

  const clientId = env.GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET
  const redirectUri = env.GOOGLE_REDIRECT_URI || 'https://birdsee.com/auth/callback'

  if (!clientId || !clientSecret) {
    return Response.json({
      step: 'missing_env',
      has_client_id: !!clientId,
      has_client_secret: !!clientSecret,
      redirect_uri: redirectUri,
    })
  }

  let tokenData
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    tokenData = await tokenRes.json()
  } catch (e) {
    return Response.json({ step: 'fetch_failed', message: String(e) })
  }

  if (!tokenData.id_token) {
    return Response.json({
      step: 'token_exchange_failed',
      error: tokenData.error,
      error_description: tokenData.error_description,
    })
  }

  let userInfo
  try {
    const payload = tokenData.id_token.split('.')[1]
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    userInfo = JSON.parse(atob(padded))
  } catch (e) {
    return Response.json({ step: 'decode_failed', message: String(e) })
  }

  const session = {
    sub: userInfo.sub,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
  }

  const sessionCookie = btoa(JSON.stringify(session))

  return new Response(null, {
    status: 302,
    headers: {
      Location: 'https://birdsee.com/?auth=success',
      'Set-Cookie': [
        `oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        `user_session=${sessionCookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${86400 * 7}`,
      ].join(', '),
    },
  })
}
