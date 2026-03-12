
-- Create message_requests table
CREATE TABLE public.message_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message_preview text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT message_requests_unique UNIQUE (sender_id, receiver_id)
);

-- Enable RLS
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can send message requests"
  ON public.message_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view their message requests"
  ON public.message_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Receiver can update request status"
  ON public.message_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their requests"
  ON public.message_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Indexes
CREATE INDEX idx_message_requests_receiver ON public.message_requests(receiver_id, status);
CREATE INDEX idx_message_requests_sender ON public.message_requests(sender_id, created_at);

-- Add indexes to messages table for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- Enable realtime for message_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_requests;
