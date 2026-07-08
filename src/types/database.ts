/**
 * Supabase database types for the ElevenPay schema.
 *
 * Mirrors supabase/migrations (10 tables + views + RPCs). Once a hosted
 * project exists, regenerate with:
 *   npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 * (or locally: npx supabase gen types typescript --local > src/types/database.ts)
 *
 * Table design: docs/database-design.md.
 *
 * NOTE: Postgres numeric(20,6) columns are typed as `number` here (PostgREST
 * JSON serialization). App code must not do float math on money — convert to
 * decimal strings at the repository boundary (see src/services/supabase/
 * repositories) per the "amounts travel as decimal strings" rule.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TransactionType =
  | 'SEND'
  | 'WATCH_PARTY'
  | 'POOL_ENTRY'
  | 'POOL_REWARD'
  | 'SPLIT_BILL'
  | 'TIP'
  | 'FAUCET';

export type TransactionStatus = 'PENDING' | 'BROADCAST' | 'SUCCESS' | 'FAILED';

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED';

export type WatchPartyStatus = 'OPEN' | 'FULL' | 'PAST' | 'CANCELLED';

export type MemberPaymentStatus = 'RESERVED' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export type PoolStatus = 'OPEN' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export type SplitStatus = 'OPEN' | 'SETTLED' | 'CANCELLED';

export type SplitLegStatus = 'REQUESTED' | 'PAID' | 'CANCELLED';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string | null;
          full_name: string;
          email: string | null;
          avatar_url: string | null;
          favorite_team: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string;
          email?: string | null;
          avatar_url?: string | null;
          favorite_team?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string | null;
          full_name?: string;
          avatar_url?: string | null;
          favorite_team?: string | null;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          wallet_address: string;
          blockchain: string;
          balance: number;
          balance_updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_address: string;
          blockchain?: string;
          balance?: number;
          balance_updated_at?: string | null;
          created_at?: string;
        };
        Update: {
          balance?: number;
          balance_updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'wallets_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          sender_wallet: string | null;
          receiver_wallet: string | null;
          amount: number;
          fee: number;
          currency: string;
          transaction_hash: string | null;
          type: TransactionType;
          status: TransactionStatus;
          reference_id: string | null;
          idempotency_key: string | null;
          memo: string | null;
          created_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          sender_wallet?: string | null;
          receiver_wallet?: string | null;
          amount: number;
          fee?: number;
          currency?: string;
          transaction_hash?: string | null;
          type: TransactionType;
          status?: TransactionStatus;
          reference_id?: string | null;
          idempotency_key?: string | null;
          memo?: string | null;
          created_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          status?: TransactionStatus;
          transaction_hash?: string | null;
          memo?: string | null;
          fee?: number;
          confirmed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_sender_wallet_fkey';
            columns: ['sender_wallet'];
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_receiver_wallet_fkey';
            columns: ['receiver_wallet'];
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
        ];
      };
      matches: {
        Row: {
          id: string;
          team_a: string;
          team_b: string;
          kickoff_at: string;
          status: MatchStatus;
          winner_team: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_a: string;
          team_b: string;
          kickoff_at: string;
          status?: MatchStatus;
          winner_team?: string | null;
          created_at?: string;
        };
        Update: {
          status?: MatchStatus;
          winner_team?: string | null;
          kickoff_at?: string;
        };
        Relationships: [];
      };
      watch_parties: {
        Row: {
          id: string;
          organizer_id: string;
          match_id: string | null;
          title: string;
          venue: string;
          city: string;
          match_name: string | null;
          entry_fee: number;
          max_participants: number;
          event_date: string;
          image_url: string | null;
          status: WatchPartyStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organizer_id: string;
          match_id?: string | null;
          title: string;
          venue: string;
          city: string;
          match_name?: string | null;
          entry_fee?: number;
          max_participants: number;
          event_date: string;
          image_url?: string | null;
          status?: WatchPartyStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          venue?: string;
          city?: string;
          match_name?: string | null;
          entry_fee?: number;
          max_participants?: number;
          event_date?: string;
          image_url?: string | null;
          status?: WatchPartyStatus;
        };
        Relationships: [
          {
            foreignKeyName: 'watch_parties_organizer_id_fkey';
            columns: ['organizer_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'watch_parties_match_id_fkey';
            columns: ['match_id'];
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
        ];
      };
      watch_party_members: {
        Row: {
          id: string;
          watch_party_id: string;
          user_id: string;
          payment_status: MemberPaymentStatus;
          reserved_until: string | null;
          transaction_id: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          watch_party_id: string;
          user_id: string;
          payment_status?: MemberPaymentStatus;
          reserved_until?: string | null;
          transaction_id?: string | null;
          joined_at?: string;
        };
        Update: {
          payment_status?: MemberPaymentStatus;
          reserved_until?: string | null;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'watch_party_members_watch_party_id_fkey';
            columns: ['watch_party_id'];
            referencedRelation: 'watch_parties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'watch_party_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'watch_party_members_transaction_id_fkey';
            columns: ['transaction_id'];
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      prediction_pools: {
        Row: {
          id: string;
          match_id: string | null;
          watch_party_id: string | null;
          match_name: string;
          team_a: string;
          team_b: string;
          entry_fee: number;
          prize_pool: number;
          status: PoolStatus;
          winner_team: string | null;
          closes_at: string;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id?: string | null;
          watch_party_id?: string | null;
          match_name: string;
          team_a: string;
          team_b: string;
          entry_fee: number;
          prize_pool?: number;
          status?: PoolStatus;
          winner_team?: string | null;
          closes_at: string;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: PoolStatus;
          winner_team?: string | null;
          prize_pool?: number;
          closes_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prediction_pools_match_id_fkey';
            columns: ['match_id'];
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prediction_pools_watch_party_id_fkey';
            columns: ['watch_party_id'];
            referencedRelation: 'watch_parties';
            referencedColumns: ['id'];
          },
        ];
      };
      predictions: {
        Row: {
          id: string;
          pool_id: string;
          user_id: string;
          selected_team: string;
          is_winner: boolean | null;
          transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pool_id: string;
          user_id: string;
          selected_team: string;
          is_winner?: boolean | null;
          transaction_id?: string | null;
          created_at?: string;
        };
        Update: {
          is_winner?: boolean | null;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'predictions_pool_id_fkey';
            columns: ['pool_id'];
            referencedRelation: 'prediction_pools';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'predictions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'predictions_transaction_id_fkey';
            columns: ['transaction_id'];
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      splits: {
        Row: {
          id: string;
          creator_id: string;
          total_amount: number;
          currency: string;
          memo: string | null;
          status: SplitStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          total_amount: number;
          currency?: string;
          memo?: string | null;
          status?: SplitStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: SplitStatus;
          memo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'splits_creator_id_fkey';
            columns: ['creator_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      split_members: {
        Row: {
          id: string;
          split_id: string;
          user_id: string | null;
          external_ref: string | null;
          share_amount: number;
          status: SplitLegStatus;
          transaction_id: string | null;
          reminded_at: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          split_id: string;
          user_id?: string | null;
          external_ref?: string | null;
          share_amount: number;
          status?: SplitLegStatus;
          transaction_id?: string | null;
          reminded_at?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: SplitLegStatus;
          transaction_id?: string | null;
          reminded_at?: string | null;
          paid_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'split_members_split_id_fkey';
            columns: ['split_id'];
            referencedRelation: 'splits';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'split_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'split_members_transaction_id_fkey';
            columns: ['transaction_id'];
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string;
          avatar_url: string | null;
          favorite_team: string | null;
        };
        Relationships: [];
      };
      party_attendance: {
        Row: {
          watch_party_id: string;
          max_participants: number;
          seats_taken: number;
          seats_left: number;
        };
        Relationships: [];
      };
      party_attendee_previews: {
        Row: {
          watch_party_id: string;
          joined_at: string;
          user_id: string;
          username: string | null;
          full_name: string;
          avatar_url: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      resolve_wallet: {
        Args: { p_username: string };
        Returns: {
          user_id: string;
          username: string | null;
          wallet_address: string;
          blockchain: string;
        }[];
      };
      join_party: {
        Args: { p_party_id: string };
        Returns: Json;
      };
      confirm_party_payment: {
        Args: { p_party_id: string };
        Returns: Json;
      };
      enter_pool: {
        Args: { p_pool_id: string; p_selected_team: string };
        Returns: Json;
      };
      create_split: {
        Args: { p_total_amount: number; p_memo: string | null; p_members: Json };
        Returns: Json;
      };
      pay_split_leg: {
        Args: { p_leg_id: string };
        Returns: Json;
      };
      confirm_split_payment: {
        Args: { p_split_id: string };
        Returns: Json;
      };
      create_pool: {
        Args: {
          p_match_name: string;
          p_team_a: string;
          p_team_b: string;
          p_entry_fee: number;
          p_closes_at: string;
          p_match_id?: string | null;
          p_watch_party_id?: string | null;
        };
        Returns: Json;
      };
      simulate_pool_result: {
        Args: { p_pool_id: string };
        Returns: Json;
      };
      resolve_pool: {
        Args: { p_pool_id: string; p_winner_team?: string | null; p_simulate?: boolean };
        Returns: Json;
      };
      demo_faucet: {
        Args: Record<string, never>;
        Returns: Json;
      };
      expire_party_reservations: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];

export type Views<T extends keyof PublicSchema['Views']> =
  PublicSchema['Views'][T]['Row'];
