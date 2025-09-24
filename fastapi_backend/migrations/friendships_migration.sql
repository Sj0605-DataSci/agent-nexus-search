-- Create FriendshipStatus enum type
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create InviteStatus enum type
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- Create friendships table
CREATE TABLE public.friendships (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status friendship_status NOT NULL DEFAULT 'pending'::friendship_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT friendships_pkey PRIMARY KEY (id),
  CONSTRAINT friendship_requester_addressee_unique UNIQUE (requester_id, addressee_id),
  CONSTRAINT friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT friendships_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create invites table
CREATE TABLE public.invites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  inviter_id uuid NOT NULL,
  invitee_email text,
  invitee_phone text,
  invite_token text NOT NULL,
  group_id uuid,
  status invite_status NOT NULL DEFAULT 'pending'::invite_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '7 days'::interval),
  CONSTRAINT invites_pkey PRIMARY KEY (id),
  CONSTRAINT invites_invite_token_key UNIQUE (invite_token),
  CONSTRAINT invites_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_friendships_requester_id ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee_id ON public.friendships(addressee_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);
CREATE INDEX idx_invites_inviter_id ON public.invites(inviter_id);
CREATE INDEX idx_invites_invite_token ON public.invites(invite_token);
CREATE INDEX idx_invites_status ON public.invites(status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for friendships table
CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for invites table
CREATE TRIGGER update_invites_updated_at
BEFORE UPDATE ON public.invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
