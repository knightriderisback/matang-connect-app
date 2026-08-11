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
      users: {
        Row: {
          id: string;
          mpin_hash: string;
          full_name: string;
          phone: string;
          role: string;
          city_id: string | null;
          native_village: string;
          verification_status: string;
          verified_by: string | null;
          verified_at: string | null;
          qr_code_id: string | null;
          title: string | null;
          photo_url: string | null;
          // Prefer these (migration Stage 1)
          failed_login_attempts: number;
          locked_until: string | null;
          // Legacy aliases that may still exist in some DBs
          failed_mpin_attempts?: number;
          mpin_locked_until?: string | null;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          mpin_hash?: string;
          full_name: string;
          phone: string;
          role?: string;
          city_id?: string | null;
          native_village: string;
          verification_status?: string;
          [key: string]: unknown;
        };
        Update: { [key: string]: unknown };
      };
      cities: {
        Row: {
          id: string;
          name: string;
          state: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          state: string;
          is_active?: boolean;
        };
        Update: { [key: string]: unknown };
      };
      families: {
        Row: {
          id: string;
          head_of_family: string;
          native_village: string;
          address: string;
          education_summary: string | null;
          employment_status: string;
          needs: string[];
          contact_phone: string | null;
          is_duplicate_flag: boolean;
          duplicate_flag?: boolean;
          created_at: string;
        };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
      };
      family_members: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          relation: string;
          age: number | null;
          date_of_birth: string | null;
          gender: string | null;
          blood_group: string | null;
          marital_status: string | null;
          phone: string | null;
          education_level: string | null;
          occupation: string | null;
          is_unemployed: boolean;
          needs_care: boolean;
          disability: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
      };
      sos_alerts: {
        Row: {
          id: string;
          raised_by: string;
          type: string;
          status: string;
          city_id: string | null;
          details?: Json;
          created_at: string;
        };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
      };
      titles: {
        Row: {
          id: string;
          city_id: string;
          title_key: string;
          title_label: string;
          user_id: string | null;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
      };
      notices: {
        Row: {
          id: string;
          city_id: string | null;
          title: string;
          body: string;
          priority: string;
          created_by: string | null;
          is_global: boolean;
          created_at: string;
        };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
      };
      jobs: {
        Row: {
          id: string;
          city_id: string | null;
          title: string;
          description: string | null;
          location: string | null;
          contact_phone: string | null;
          salary_range: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
      };
      care_requests: {
        Row: {
          id: string;
          city_id: string | null;
          requester_id: string | null;
          request_type: string;
          title: string;
          description: string | null;
          contact_phone: string | null;
          location: string | null;
          urgency: string;
          status: string;
          created_at: string;
        };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
      };
      kosh_entries: {
        Row: {
          id: string;
          city_id: string | null;
          entry_type: string;
          amount: number;
          description: string | null;
          entry_date: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
      };
      app_settings: {
        Row: {
          setting_key: string;
          setting_value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_id: string | null;
          meta: Json | null;
          created_at: string;
        };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
      };
      [key: string]: {
        Row: { [key: string]: unknown };
        Insert: { [key: string]: unknown };
        Update: { [key: string]: unknown };
      };
    };
    Functions: {
      login_with_mpin: {
        Args: { p_phone: string; p_mpin: string };
        Returns: unknown;
      };
      register_user: {
        Args: {
          p_full_name: string;
          p_phone: string;
          p_mpin: string;
          p_city_id: string;
          p_native_village: string;
        };
        Returns: unknown;
      };
      admin_reset_mpin: {
        Args: { p_user_id: string; p_new_mpin: string };
        Returns: undefined;
      };
      [key: string]: { Args: unknown; Returns: unknown };
    };
  };
}
