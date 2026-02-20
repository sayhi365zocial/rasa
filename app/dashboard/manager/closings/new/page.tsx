import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/lib/db'
import ManagerClosingForm from './ManagerClosingForm'

export const dynamic = 'force-dynamic'

export default async function ManagerNewClosingPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  if (currentUser.role !== 'MANAGER' && currentUser.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  // Get all active branches for dropdown
  const branches = await db.branch.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { branchName: 'asc' },
    select: {
      id: true,
      branchCode: true,
      branchName: true,
    },
  })

  return (
    <ManagerClosingForm
      branches={branches.map((b: typeof branches[0]) => ({
        id: b.id,
        branchCode: b.branchCode,
        branchName: b.branchName,
      }))}
    />
  )
}
