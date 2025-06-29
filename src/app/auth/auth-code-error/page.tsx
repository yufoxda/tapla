import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div>
      <h1>認証エラー</h1>
      <p>
        認証プロセス中にエラーが発生しました。もう一度お試しください。
      </p>
      <Link href="/auth/login">
        ログインページに戻る
      </Link>
    </div>
  )
}
