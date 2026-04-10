/**
 * GET /auth/me
 * Return current logged-in user info from session cookie (JSON)
 */
export async function onRequestGet(context) {
  const { request } = context
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    })
  )

  const sessionCookie = cookies.user_session
  if (!sessionCookie) {
    return Response.json({ user: null })
  }

  try {
    const session = JSON.parse(atob(sessionCookie))
    // Check expiry
    if (session.exp && session.exp < Math.floor(Date.now() / 1000)) {
      return Response.json({ user: null })
    }
    return Response.json({
      user: {
        email: session.email,
        name: session.name,
        picture: session.picture,
      },
    })
  } catch {
    return Response.json({ user: null })
  }
}
