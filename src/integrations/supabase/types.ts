export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      enquiries: {
        Row: {
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          event_date: string | null
          guest_count: number | null
          hall_id: string | null
          id: string
          message: string | null
          requester_id: string | null
          status: Database["public"]["Enums"]["enquiry_status"]
          vendor_id: string | null
          worker_id: string | null
        }
        Insert: {
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          event_date?: string | null
          guest_count?: number | null
          hall_id?: string | null
          id?: string
          message?: string | null
          requester_id?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          vendor_id?: string | null
          worker_id?: string | null
        }
        Update: {
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          event_date?: string | null
          guest_count?: number | null
          hall_id?: string | null
          id?: string
          message?: string | null
          requester_id?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          vendor_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      hall_reviews: {
        Row: {
          author_id: string
          comment: string | null
          created_at: string
          hall_id: string
          id: string
          rating: number
        }
        Insert: {
          author_id: string
          comment?: string | null
          created_at?: string
          hall_id: string
          id?: string
          rating: number
        }
        Update: {
          author_id?: string
          comment?: string | null
          created_at?: string
          hall_id?: string
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "hall_reviews_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
        ]
      }
      halls: {
        Row: {
          address: string | null
          advance_amount: number | null
          alt_phone: string | null
          availability: Json
          cancellation_policy: string | null
          category: string | null
          changing_rooms: number | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          dining_capacity: number | null
          dining_photos: Json
          drone_photos: Json
          email: string | null
          facilities: Json
          gallery: Json
          google_maps_url: string | null
          id: string
          indoor_capacity: number | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          max_guests: number | null
          min_guests: number | null
          name: string
          num_rooms: number | null
          outdoor_capacity: number | null
          owner_full_name: string | null
          owner_id: string
          parking_photos: Json
          parking_slots: number | null
          phone: string | null
          pincode: string | null
          price_per_day: number | null
          price_per_hour: number | null
          rating: number
          review_count: number
          room_photos: Json
          slug: string | null
          social_links: Json
          stage_photos: Json
          state: string | null
          status: Database["public"]["Enums"]["hall_status"]
          updated_at: string
          verified: boolean
          videos: Json
          washroom_photos: Json
          website: string | null
          working_hours: string | null
        }
        Insert: {
          address?: string | null
          advance_amount?: number | null
          alt_phone?: string | null
          availability?: Json
          cancellation_policy?: string | null
          category?: string | null
          changing_rooms?: number | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          dining_capacity?: number | null
          dining_photos?: Json
          drone_photos?: Json
          email?: string | null
          facilities?: Json
          gallery?: Json
          google_maps_url?: string | null
          id?: string
          indoor_capacity?: number | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          max_guests?: number | null
          min_guests?: number | null
          name: string
          num_rooms?: number | null
          outdoor_capacity?: number | null
          owner_full_name?: string | null
          owner_id: string
          parking_photos?: Json
          parking_slots?: number | null
          phone?: string | null
          pincode?: string | null
          price_per_day?: number | null
          price_per_hour?: number | null
          rating?: number
          review_count?: number
          room_photos?: Json
          slug?: string | null
          social_links?: Json
          stage_photos?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verified?: boolean
          videos?: Json
          washroom_photos?: Json
          website?: string | null
          working_hours?: string | null
        }
        Update: {
          address?: string | null
          advance_amount?: number | null
          alt_phone?: string | null
          availability?: Json
          cancellation_policy?: string | null
          category?: string | null
          changing_rooms?: number | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          dining_capacity?: number | null
          dining_photos?: Json
          drone_photos?: Json
          email?: string | null
          facilities?: Json
          gallery?: Json
          google_maps_url?: string | null
          id?: string
          indoor_capacity?: number | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          max_guests?: number | null
          min_guests?: number | null
          name?: string
          num_rooms?: number | null
          outdoor_capacity?: number | null
          owner_full_name?: string | null
          owner_id?: string
          parking_photos?: Json
          parking_slots?: number | null
          phone?: string | null
          pincode?: string | null
          price_per_day?: number | null
          price_per_hour?: number | null
          rating?: number
          review_count?: number
          room_photos?: Json
          slug?: string | null
          social_links?: Json
          stage_photos?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verified?: boolean
          videos?: Json
          washroom_photos?: Json
          website?: string | null
          working_hours?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          alt_phone: string | null
          business_reg_number: string | null
          city: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          gst_number: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          org_type: string | null
          owner_full_name: string | null
          owner_id: string
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address?: string | null
          alt_phone?: string | null
          business_reg_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          org_type?: string | null
          owner_full_name?: string | null
          owner_id: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address?: string | null
          alt_phone?: string | null
          business_reg_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          org_type?: string | null
          owner_full_name?: string | null
          owner_id?: string
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          alt_phone: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          email_verified: boolean
          full_name: string | null
          id: string
          phone: string | null
          phone_verified: boolean
          primary_role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          alt_phone?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id: string
          phone?: string | null
          phone_verified?: boolean
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          alt_phone?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          phone?: string | null
          phone_verified?: boolean
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          available_days: Json
          business_name: string
          category: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          facebook: string | null
          gst_number: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          owner_full_name: string | null
          owner_id: string
          pan_number: string | null
          phone: string | null
          pincode: string | null
          portfolio: Json
          price_catalogue_url: string | null
          rating: number
          review_count: number
          service_areas: Json
          state: string | null
          status: Database["public"]["Enums"]["hall_status"]
          updated_at: string
          verified: boolean
          website: string | null
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          available_days?: Json
          business_name: string
          category?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          facebook?: string | null
          gst_number?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          owner_full_name?: string | null
          owner_id: string
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          portfolio?: Json
          price_catalogue_url?: string | null
          rating?: number
          review_count?: number
          service_areas?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verified?: boolean
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          available_days?: Json
          business_name?: string
          category?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          facebook?: string | null
          gst_number?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          owner_full_name?: string | null
          owner_id?: string
          pan_number?: string | null
          phone?: string | null
          pincode?: string | null
          portfolio?: Json
          price_catalogue_url?: string | null
          rating?: number
          review_count?: number
          service_areas?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verified?: boolean
          website?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      workers: {
        Row: {
          address: string | null
          available_days: Json
          category: string | null
          city: string | null
          created_at: string
          daily_charges: number | null
          deleted_at: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string
          hourly_charges: number | null
          id: string
          languages: Json
          owner_id: string
          phone: string | null
          photo_url: string | null
          pincode: string | null
          rating: number
          review_count: number
          skills: Json
          state: string | null
          status: Database["public"]["Enums"]["hall_status"]
          updated_at: string
          verified: boolean
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          available_days?: Json
          category?: string | null
          city?: string | null
          created_at?: string
          daily_charges?: number | null
          deleted_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          hourly_charges?: number | null
          id?: string
          languages?: Json
          owner_id: string
          phone?: string | null
          photo_url?: string | null
          pincode?: string | null
          rating?: number
          review_count?: number
          skills?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verified?: boolean
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          available_days?: Json
          category?: string | null
          city?: string | null
          created_at?: string
          daily_charges?: number | null
          deleted_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          hourly_charges?: number | null
          id?: string
          languages?: Json
          owner_id?: string
          phone?: string | null
          photo_url?: string | null
          pincode?: string | null
          rating?: number
          review_count?: number
          skills?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verified?: boolean
          years_experience?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "organization"
        | "hall_owner"
        | "vendor"
        | "worker"
        | "customer"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      enquiry_status:
        | "new"
        | "contacted"
        | "quoted"
        | "booked"
        | "declined"
        | "closed"
      hall_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "organization",
        "hall_owner",
        "vendor",
        "worker",
        "customer",
      ],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      enquiry_status: [
        "new",
        "contacted",
        "quoted",
        "booked",
        "declined",
        "closed",
      ],
      hall_status: ["draft", "published", "archived"],
    },
  },
} as const
