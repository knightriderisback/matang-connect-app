export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          m_pin_hash: string;
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
          failed_mpin_attempts: number;
          mpin_locked_until: string | null;
          created_at: string;
        };
        Insert: { [key: string]: any };
        Update: { [key: string]: any };
      };
      cities: {
        Row: { id: string; name: string; state: string; is_active: boolean; created_at: string };
        Insert: { id?: string; name: string; state: string; is_active?: boolean };
        Update: { [key: string]: any };
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
          is_duplicate_flag: boolean;
          contact_phone: string | null;
          created_at: string;
        };
        Insert: { [key: string]: any };
        Update: { [key: string]: any };
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
          education_level: string | null;
          occupation: string | null;
          blood_group: string | null;
          marital_status: string | null;
          phone: string | null;
          photo_url: string | null;
          is_unemployed: boolean;
          needs_care: boolean;
          linked_user_id: string | null;
          created_at: string;
        };
        Insert: { [key: string]: any };
        Update: { [key: string]: any };
      };
      sos_alerts: {
        Row: {
          id: string;
          raised_by: string;
          type: string;
          status: string;
          city_id: string | null;
          message: string | null;
          created_at: string;
        };
        Insert: { [key: string]: any };
        Update: { [key: string]: any };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_id: string | null;
          meta: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: { [key: string]: any };
        Update: { [key: string]: any };
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
        Insert: { [key: string]: any };
        Update: { [key: string]: any };
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
        Insert: { [key: string]: any };
        Update: { [key: string]: any };
      };
      [key: string]: {
        Row: { [key: string]: any };
        Insert: { [key: string]: any };
        Update: { [key: string]: any };
      };
    };
    Functions: {
      login_with_mpin: {
        Args: { p_phone: string; p_mpin: string };
        Returns: any;
      };
      register_user: {
        Args: {
          p_full_name: string;
          p_phone: string;
          p_mpin: string;
          p_city_id: string;
          p_native_village: string;
        };
        Returns: any;
      };
      admin_reset_mpin: {
        Args: { p_user_id: string; p_new_mpin: string };
        Returns: undefined;
      };
    };
  };
}
