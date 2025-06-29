import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <h1>たぷら</h1>
      <h2>tap++</h2>
      <ul className="list-disc pl-6 space-y-3 text-gray-700">
        <li>新規予定を作成するには、上の「新規予定作成」ボタンをクリックします。</li>
        <li>予定を作成すると、参加者が日程を選択できるようになります。</li>
        <li>参加者は、予定の詳細ページから自分の名前と選択した日程を登録できます。</li>
        <li>登録後、予定の確認ページで参加者の一覧と日程ごとの参加人数を確認できます。</li>
        <li><strong>認証済みユーザー</strong>は、投票パターンの学習機能と自動提案機能が利用できます。</li>
        <li>このアプリは、Next.js、TypeScript、Supabase、Keycloakを使用して開発されています。</li>
      </ul>
    </>
  );
}
