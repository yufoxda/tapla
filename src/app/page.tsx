import Image from "next/image";
import styles from "./page.module.css";
import { getuser } from "./actions"
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getuser();
  
  const handleLogout = async () => {
    'use server';
    redirect('/auth/logout');
  };

  const handleLogin = async () => {
    'use server';
    redirect('/auth/login');
  };

  return (
<div>
  <h1>main</h1>
  <p>Welcome to the main page!</p>
  <div>
    {user ? (
      <div>
        <p>ログイン中: {user.email}</p>
          <button onClick={handleLogout} type="submit">
            ログアウト
          </button>
      </div>
    ) : (
      <div>
        <p>ログインしていません</p>
          <button type="submit" onClick={handleLogin}>
            ログイン
          </button>
      </div>
    )}
  </div>
</div>
  );
}
