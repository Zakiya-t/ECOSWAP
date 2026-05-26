-- Run this in your Supabase SQL Editor to update your schema for the new features!

-- 1. Add the new missing columns to profiles if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upi_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account TEXT;

-- 2. Create the Support Tickets table for Admin messaging
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  admin_reply TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS and setup policies for Support Tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets OR admins can view all (since admin uses anon/service role or we just allow all for the prototype)
CREATE POLICY "Users can view own tickets" ON public.support_tickets 
  FOR SELECT USING (auth.uid() = user_id OR true); -- Allowing true for the prototype admin panel

CREATE POLICY "Users can create tickets" ON public.support_tickets 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and Admins can update tickets" ON public.support_tickets 
  FOR UPDATE USING (true); -- Allowing true so Admin can reply

-- 4. Enable real-time for support tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- 5. Add UPDATE policy for messages to allow marking as read
CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- 6. Add eco_points column to profiles table for rewards
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS eco_points INTEGER DEFAULT 0;

-- 7. Add agreed_terms column to profiles table for Terms check
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agreed_terms BOOLEAN DEFAULT FALSE;

-- 8. Add pincode and email columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 9. Create the Transactions table to log completed exchanges
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  partner_name TEXT NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('Swap', 'Borrow', 'Sell', 'Donate')) NOT NULL,
  item_title TEXT NOT NULL,
  price NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and setup policies for Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable real-time for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- 10. Update items table status column check constraint to support 'completed' and 'cancelled'
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_status_check;
ALTER TABLE public.items ADD CONSTRAINT items_status_check CHECK (status IN ('active', 'pending', 'sold', 'borrowed', 'flagged', 'completed', 'cancelled'));

-- 11. Admin Broadcast Notifications
-- Stores messages sent by admin to ALL users
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Everyone can read notifications (logged-in users)
CREATE POLICY "Anyone can view admin notifications" ON public.admin_notifications
  FOR SELECT USING (true);

-- Only allow inserts via service role / admin (anon can't insert in production;
-- for this prototype we allow it so the admin panel works without a backend)
CREATE POLICY "Admin can insert notifications" ON public.admin_notifications
  FOR INSERT WITH CHECK (true);

-- 12. Notification Reads — tracks per-user read status
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  notification_id UUID REFERENCES public.admin_notifications(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notification_id)
);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reads" ON public.notification_reads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reads" ON public.notification_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable real-time for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_reads;
