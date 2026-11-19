// src/types/database.ts
// Авторитетные типы базы данных Supabase (PostgreSQL)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          agent_name: string;
          avatar_id: string;
          mmr: number;
          matches_played: number;
          wins_detective: number;
          wins_maniac: number;
          cash: number;
          xp: number;
          level: number;
          rank: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          agent_name: string;
          avatar_id?: string;
          mmr?: number;
          matches_played?: number;
          wins_detective?: number;
          wins_maniac?: number;
          cash?: number;
          xp?: number;
          level?: number;
          rank?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_name?: string;
          avatar_id?: string;
          mmr?: number;
          matches_played?: number;
          wins_detective?: number;
          wins_maniac?: number;
          cash?: number;
          xp?: number;
          level?: number;
          rank?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          mode: string;
          winner_role: string;
          duration_seconds: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          mode: string;
          winner_role: string;
          duration_seconds?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          mode?: string;
          winner_role?: string;
          duration_seconds?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      match_participants: {
        Row: {
          id: string;
          match_id: string;
          profile_id: string;
          role: string;
          is_winner: boolean;
          mmr_delta: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          profile_id: string;
          role: string;
          is_winner?: boolean;
          mmr_delta?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          profile_id?: string;
          role?: string;
          is_winner?: boolean;
          mmr_delta?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_participants_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_participants_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      feedback: {
        Row: {
          id: string;
          user_id: string | null;
          category: "bug" | "idea" | "other";
          message: string;
          app_version: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          category: "bug" | "idea" | "other";
          message: string;
          app_version?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          category?: "bug" | "idea" | "other";
          message?: string;
          app_version?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      record_match_result: {
        Args: {
          p_mode: string;
          p_winner_role: string;
          p_duration_seconds: number;
          p_role: string;
          p_is_winner: boolean;
          p_mmr_delta?: number;
        };
        Returns: {
          ok: boolean;
          match_id: string;
          new_mmr: number;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
