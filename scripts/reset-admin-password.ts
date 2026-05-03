/**
 * Reset a user's password using the Supabase service role key.
 * Run with: npx tsx --env-file=.env.local scripts/reset-admin-password.ts <email> <new-password>
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  const [email, newPassword] = process.argv.slice(2)

  if (!email || !newPassword) {
    console.error('Usage: npx tsx --env-file=.env.local scripts/reset-admin-password.ts <email> <new-password>')
    process.exit(1)
  }

  // Find the user by email. Admin API lists users with pagination.
  let userId: string | null = null
  let page = 1
  while (!userId) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (match) {
      userId = match.id
      break
    }
    if (data.users.length < 100) break
    page++
  }

  if (!userId) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  })
  if (updateError) throw updateError

  // Confirm profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  console.log(`✓ Password reset for ${email}`)
  console.log(`  user id: ${userId}`)
  console.log(`  role:    ${profile?.role ?? '(no profile row)'}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
