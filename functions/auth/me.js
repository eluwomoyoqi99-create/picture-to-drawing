/**
 * GET /auth/me — returns current user info including Pro status
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
  if (!sessionCookie) return Response.json({ user: null })

  try {
    const session = JSON.parse(atob(sessionCookie))
    if (session.exp && session.exp < Math.floor(Date.now() / 1000)) {
      return Response.json({ user: null })
    }

    // Check if Pro plan is still valid
    const isPro = session.plan &&
      session.plan.startsWith('pro') &&
      session.plan_expires > Math.floor(Date.now() / 1000)

    return Response.json({
      user: {
        email: session.email,
        name: session.name,
        picture: session.picture,
        plan: isPro ? session.plan : 'free',
        isPro,
      },
    })
  } catch {
    return Response.json({ user: null })
  }
}
