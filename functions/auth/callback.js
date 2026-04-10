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
    return Response.redirect('https://birdsee.com/?auth=cancelled', 302)
  }

  if (!code) {
    return Response.redirect('https://birdsee.com/?auth=error', 302)
  }

  const clientId = env.GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET
  const redirectUri = env.GOOGLE_REDIRECT_URI || 'https://birdsee.com/auth/callback'

  if (!clientId || !clientSecret) {
    return Response.redirect('https://birdsee.com/?auth=error', 302)
  }

  // Exchange code for tokens
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
    return Response.redirect('https://birdsee.com/?auth=error', 302)
  }

  if (!tokenData.id_token) {
    return Response.redirect('https://birdsee.com/?auth=error', 302)
  }

  // Decode id_token payload (JWT)
  let userInfo
  try {
    const payload = tokenData.id_token.split('.')[1]
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    userInfo = JSON.parse(atob(padded))
  } catch (e) {
    return Response.redirect('https://birdsee.com/?auth=error', 302)
  }

  // Build session payload
  const session = {
    sub: userInfo.sub,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
  }

  const sessionCookie = btoa(JSON.stringify(session))

  // ✅ Use Headers.append() to set multiple Set-Cookie headers correctly
  const headers = new Headers({
    Location: 'https://birdsee.com/?auth=success',
  })
  headers.append(
    'Set-Cookie',
    `oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  )
  headers.append(
    'Set-Cookie',
    `user_session=${sessionCookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${86400 * 7}`
  )

  return new Response(null, { status: 302, headers })
}
