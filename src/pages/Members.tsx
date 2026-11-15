import { UsersManagement } from '@workos-inc/widgets'
import { PageHeader } from '@/components/common'
import { Widgets } from '@/components/widgets'
import { useStore } from '@/store'

// WorkOS's Users Management widget: list the CIC organization, invite people,
// change roles and remove members. It talks to WorkOS directly with a token
// from /api/widget-token, so nothing here goes through D1. Loaded lazily, so
// only admins download it.
export default function Members() {
  const { widgetToken } = useStore()
  return (
    <>
      <PageHeader
        title="Board members"
        description="Invite board members and choose their role. Admin sees every donor and can import; Member sees only their own donors. Changes take up to a minute to reach the rest of the app."
      />
      <Widgets>
        <UsersManagement authToken={widgetToken} />
      </Widgets>
    </>
  )
}
