import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {

      // デバッグ用: ログインユーザー情報を出力
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (user && !userError && process.env.NODE_ENV === 'development') {
        console.log('=== ログインユーザー情報 ===')
        console.log('User ID:', user.id)
        console.log('Email:', user.email)
        console.log('User Metadata:', user.user_metadata)
        console.log('App Metadata:', user.app_metadata)
        console.log('Provider:', user.app_metadata?.provider)
        console.log('Created At:', user.created_at)
        console.log('Last Sign In:', user.last_sign_in_at)
        console.log('Full User Object:', JSON.stringify(user, null, 2))
        console.log('========================')
      } else if (userError) {
        console.error('ユーザー情報取得エラー:', userError)
      }
      
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}