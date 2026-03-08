import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { newsletterSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = newsletterSchema.parse(body)

    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email })

    if (error) {
      // Unique constraint = already subscribed
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Already subscribed!' })
      }
      throw error
    }

    return NextResponse.json({ message: 'Subscribed successfully!' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
