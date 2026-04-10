/**
 * GET /auth/logout
 * Clear session cookie and redirect home
 */
export async function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: 'https://birdsee.com/',
      'Set-Cookie': `user_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  })
}
