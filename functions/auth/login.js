/**
 * GET /auth/login
 * Redirect user to Google OAuth consent screen
 */
export async function onRequestGet(context) {
  const { env } = context

  const clientId = env.GOOGLE_CLIENT_ID
  const redirectUri = env.GOOGLE_REDIRECT_URI || 'https://birdsee.com/auth/callback'

  // Generate a random state to prevent CSRF
  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

  // Store state in a short-lived cookie to verify on callback
  return new Response(null, {
    status: 302,
    headers: {
      Location: googleAuthUrl,
      'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  })
}
