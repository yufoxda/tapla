import { login, signup, loginWithKeycloak } from './actions'

export default function LoginPage() {
  return (
    <div>
      <h1>ログイン</h1>
      
      {/* Keycloak Login */}
      <form action={loginWithKeycloak}>
        <button type="submit">
          Keycloakでログイン
        </button>
      </form>
    </div>
  )
}