import { useAuth } from '@workos-inc/authkit-react'
import { UserProfile, UserSecurity, UserSessions } from '@workos-inc/widgets'
import { PageHeader, SectionTitle } from '@/components/common'
import { Widgets } from '@/components/widgets'

// The signed-in user's own account, as WorkOS widgets. These are user-scoped,
// so they take the AuthKit access token as-is; UserSessions also reads the
// current session from it to mark "this device".
export default function Account() {
  const { getAccessToken } = useAuth()
  return (
    <>
      <PageHeader title="My account" description="Your name and photo, password and two-factor sign-in, and where you're signed in." />
      <Widgets>
        <div className="space-y-8">
          <section>
            <SectionTitle>Profile</SectionTitle>
            <UserProfile authToken={getAccessToken} />
          </section>
          <section>
            <SectionTitle>Security</SectionTitle>
            <UserSecurity authToken={getAccessToken} />
          </section>
          <section>
            <SectionTitle>Sessions</SectionTitle>
            <UserSessions authToken={getAccessToken} />
          </section>
        </div>
      </Widgets>
    </>
  )
}
