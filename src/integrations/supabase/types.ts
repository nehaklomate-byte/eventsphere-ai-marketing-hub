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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          target_id: string
          target_table: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          target_id: string
          target_table: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string
          target_table?: string
        }
        Relationships: []
      }
      customer_bookings: {
        Row: {
          amount: number
          created_at: string
          details: Json
          event_date: string | null
          event_id: string | null
          id: string
          kind: Database["public"]["Enums"]["customer_booking_kind"]
          notes: string | null
          payment_status: Database["public"]["Enums"]["customer_payment_status"]
          status: Database["public"]["Enums"]["customer_booking_status"]
          target_id: string | null
          target_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          details?: Json
          event_date?: string | null
          event_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["customer_booking_kind"]
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["customer_payment_status"]
          status?: Database["public"]["Enums"]["customer_booking_status"]
          target_id?: string | null
          target_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          details?: Json
          event_date?: string | null
          event_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["customer_booking_kind"]
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["customer_payment_status"]
          status?: Database["public"]["Enums"]["customer_booking_status"]
          target_id?: string | null
          target_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "customer_events"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_events: {
        Row: {
          budget: number | null
          created_at: string
          event_date: string | null
          event_type: string | null
          guests: number | null
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["customer_event_status"]
          updated_at: string
          user_id: string
          venue: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string
          event_date?: string | null
          event_type?: string | null
          guests?: number | null
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["customer_event_status"]
          updated_at?: string
          user_id: string
          venue?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string
          event_date?: string | null
          event_type?: string | null
          guests?: number | null
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["customer_event_status"]
          updated_at?: string
          user_id?: string
          venue?: string | null
        }
        Relationships: []
      }
      customer_notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["customer_notification_kind"]
          metadata: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["customer_notification_kind"]
          metadata?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["customer_notification_kind"]
          metadata?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          description: string
          id: string
          invoice_number: string | null
          method: string | null
          paid_at: string | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["customer_payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          description: string
          id?: string
          invoice_number?: string | null
          method?: string | null
          paid_at?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["customer_payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          invoice_number?: string | null
          method?: string | null
          paid_at?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["customer_payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "customer_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          language: string
          marketing_opt_in: boolean
          push_notifications: boolean
          sms_notifications: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          language?: string
          marketing_opt_in?: boolean
          push_notifications?: boolean
          sms_notifications?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          language?: string
          marketing_opt_in?: boolean
          push_notifications?: boolean
          sms_notifications?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["customer_wishlist_kind"]
          rating: number
          target_id: string
          target_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["customer_wishlist_kind"]
          rating: number
          target_id: string
          target_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["customer_wishlist_kind"]
          rating?: number
          target_id?: string
          target_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_wishlist: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["customer_wishlist_kind"]
          target_id: string
          target_image_url: string | null
          target_meta: Json
          target_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["customer_wishlist_kind"]
          target_id: string
          target_image_url?: string | null
          target_meta?: Json
          target_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["customer_wishlist_kind"]
          target_id?: string
          target_image_url?: string | null
          target_meta?: Json
          target_name?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          pincode: string | null
          profile_completion: number
          state: string | null
          status: Database["public"]["Enums"]["customer_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          pincode?: string | null
          profile_completion?: number
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          pincode?: string | null
          profile_completion?: number
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          additional_info: Json
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
          documents: Json
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
          rejection_reason: string | null
          review_count: number
          room_photos: Json
          slug: string | null
          social_links: Json
          stage_photos: Json
          state: string | null
          status: Database["public"]["Enums"]["hall_status"]
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          videos: Json
          washroom_photos: Json
          website: string | null
          working_hours: string | null
        }
        Insert: {
          additional_info?: Json
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
          documents?: Json
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
          rejection_reason?: string | null
          review_count?: number
          room_photos?: Json
          slug?: string | null
          social_links?: Json
          stage_photos?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          videos?: Json
          washroom_photos?: Json
          website?: string | null
          working_hours?: string | null
        }
        Update: {
          additional_info?: Json
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
          documents?: Json
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
          rejection_reason?: string | null
          review_count?: number
          room_photos?: Json
          slug?: string | null
          social_links?: Json
          stage_photos?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          videos?: Json
          washroom_photos?: Json
          website?: string | null
          working_hours?: string | null
        }
        Relationships: []
      }
      org_departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_departments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_event_form_fields: {
        Row: {
          created_at: string
          field_type: string
          form_id: string
          id: string
          is_required: boolean
          label: string
          options: Json
          order_index: number
          placeholder: string | null
        }
        Insert: {
          created_at?: string
          field_type?: string
          form_id: string
          id?: string
          is_required?: boolean
          label: string
          options?: Json
          order_index?: number
          placeholder?: string | null
        }
        Update: {
          created_at?: string
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean
          label?: string
          options?: Json
          order_index?: number
          placeholder?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_event_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "org_event_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      org_event_forms: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_published: boolean
          max_team_size: number
          min_team_size: number
          org_id: string
          team_mode: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_published?: boolean
          max_team_size?: number
          min_team_size?: number
          org_id: string
          team_mode?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_published?: boolean
          max_team_size?: number
          min_team_size?: number
          org_id?: string
          team_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_event_forms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "org_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_event_forms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_events: {
        Row: {
          created_at: string
          created_by: string | null
          custom_location: string | null
          description: string | null
          end_at: string | null
          event_type: string
          id: string
          max_participants: number | null
          mode: string
          org_id: string
          registration_deadline: string | null
          start_at: string | null
          status: string
          title: string
          venue_hall_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_location?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          id?: string
          max_participants?: number | null
          mode?: string
          org_id: string
          registration_deadline?: string | null
          start_at?: string | null
          status?: string
          title: string
          venue_hall_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_location?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string
          id?: string
          max_participants?: number | null
          mode?: string
          org_id?: string
          registration_deadline?: string | null
          start_at?: string | null
          status?: string
          title?: string
          venue_hall_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_events_venue_hall_id_fkey"
            columns: ["venue_hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          department_id: string | null
          full_name: string | null
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_by: string | null
          invited_email: string
          is_admin_role: boolean
          org_id: string
          role_id: string | null
          role_label: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          full_name?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          invited_email: string
          is_admin_role?: boolean
          org_id: string
          role_id?: string | null
          role_label?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          full_name?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          invited_email?: string
          is_admin_role?: boolean
          org_id?: string
          role_id?: string | null
          role_label?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "org_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_admin_role: boolean
          is_default: boolean
          name: string
          org_id: string
          permissions: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_admin_role?: boolean
          is_default?: boolean
          name: string
          org_id: string
          permissions?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_admin_role?: boolean
          is_default?: boolean
          name?: string
          org_id?: string
          permissions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "org_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          additional_info: Json
          address: string | null
          alt_phone: string | null
          business_reg_number: string | null
          city: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          documents: Json
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
          rejection_reason: string | null
          state: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          additional_info?: Json
          address?: string | null
          alt_phone?: string | null
          business_reg_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          documents?: Json
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
          rejection_reason?: string | null
          state?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          additional_info?: Json
          address?: string | null
          alt_phone?: string | null
          business_reg_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          documents?: Json
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
          rejection_reason?: string | null
          state?: string | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: []
      }
      platform_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_rejection_reason: string | null
          account_status: Database["public"]["Enums"]["account_status"] | null
          alt_phone: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          email_verified: boolean
          full_name: string | null
          id: string
          payout_upi_id: string | null
          phone: string | null
          phone_verified: boolean
          primary_role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          account_rejection_reason?: string | null
          account_status?: Database["public"]["Enums"]["account_status"] | null
          alt_phone?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id: string
          payout_upi_id?: string | null
          phone?: string | null
          phone_verified?: boolean
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          account_rejection_reason?: string | null
          account_status?: Database["public"]["Enums"]["account_status"] | null
          alt_phone?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          payout_upi_id?: string | null
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
      vendor_job_applications: {
        Row: {
          applied_at: string
          cover_note: string | null
          id: string
          posting_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["application_status"]
          vendor_id: string
          vendor_user_id: string
        }
        Insert: {
          applied_at?: string
          cover_note?: string | null
          id?: string
          posting_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          vendor_id: string
          vendor_user_id: string
        }
        Update: {
          applied_at?: string
          cover_note?: string | null
          id?: string
          posting_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          vendor_id?: string
          vendor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_job_applications_posting_id_fkey"
            columns: ["posting_id"]
            isOneToOne: false
            referencedRelation: "vendor_job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_job_applications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_job_postings: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_date: string
          hall_id: string | null
          id: string
          org_id: string | null
          pay_amount: number | null
          pay_type: Database["public"]["Enums"]["pay_type"]
          slots_filled: number
          slots_needed: number
          start_time: string | null
          status: Database["public"]["Enums"]["posting_status"]
          title: string
          updated_at: string
          venue: string | null
          venue_address: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          event_date: string
          hall_id?: string | null
          id?: string
          org_id?: string | null
          pay_amount?: number | null
          pay_type?: Database["public"]["Enums"]["pay_type"]
          slots_filled?: number
          slots_needed?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["posting_status"]
          title: string
          updated_at?: string
          venue?: string | null
          venue_address?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          hall_id?: string | null
          id?: string
          org_id?: string | null
          pay_amount?: number | null
          pay_type?: Database["public"]["Enums"]["pay_type"]
          slots_filled?: number
          slots_needed?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["posting_status"]
          title?: string
          updated_at?: string
          venue?: string | null
          venue_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_job_postings_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_job_postings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_notifications: {
        Row: {
          action_url: string | null
          body: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string
          id: string
          metadata: Json
          read_at: string | null
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "vendor_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_tasks: {
        Row: {
          accepted_at: string | null
          assigned_by: string
          assigner_role: Database["public"]["Enums"]["app_role"] | null
          completed_at: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_name: string
          id: string
          organization_id: string | null
          organization_name: string | null
          paused_at: string | null
          payment_amount: number | null
          payment_status: string
          priority: Database["public"]["Enums"]["task_priority"]
          rejected_at: string | null
          rejection_reason: string | null
          resumed_at: string | null
          start_time: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_name: string
          updated_at: string
          vendor_id: string
          vendor_notes: string | null
          vendor_user_id: string
          venue: string | null
          venue_address: string | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_by: string
          assigner_role?: Database["public"]["Enums"]["app_role"] | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_name: string
          id?: string
          organization_id?: string | null
          organization_name?: string | null
          paused_at?: string | null
          payment_amount?: number | null
          payment_status?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          rejected_at?: string | null
          rejection_reason?: string | null
          resumed_at?: string | null
          start_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_name: string
          updated_at?: string
          vendor_id: string
          vendor_notes?: string | null
          vendor_user_id: string
          venue?: string | null
          venue_address?: string | null
        }
        Update: {
          accepted_at?: string | null
          assigned_by?: string
          assigner_role?: Database["public"]["Enums"]["app_role"] | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_name?: string
          id?: string
          organization_id?: string | null
          organization_name?: string | null
          paused_at?: string | null
          payment_amount?: number | null
          payment_status?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          rejected_at?: string | null
          rejection_reason?: string | null
          resumed_at?: string | null
          start_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_name?: string
          updated_at?: string
          vendor_id?: string
          vendor_notes?: string | null
          vendor_user_id?: string
          venue?: string | null
          venue_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_tasks_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          additional_info: Json
          address: string | null
          available_days: Json
          blocked_dates: Json
          business_name: string
          category: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          documents: Json
          email: string | null
          facebook: string | null
          gst_number: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          marketplace_visible: boolean
          max_travel_km: number | null
          owner_full_name: string | null
          owner_id: string
          pan_number: string | null
          payout_upi_id: string | null
          phone: string | null
          pincode: string | null
          portfolio: Json
          price_catalogue_url: string | null
          profile_completion: number
          rating: number
          rejection_reason: string | null
          review_count: number
          service_areas: Json
          state: string | null
          status: Database["public"]["Enums"]["hall_status"]
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          website: string | null
          willing_to_travel: boolean
          working_hours_end: string | null
          working_hours_start: string | null
          years_experience: number | null
        }
        Insert: {
          additional_info?: Json
          address?: string | null
          available_days?: Json
          blocked_dates?: Json
          business_name: string
          category?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          documents?: Json
          email?: string | null
          facebook?: string | null
          gst_number?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          marketplace_visible?: boolean
          max_travel_km?: number | null
          owner_full_name?: string | null
          owner_id: string
          pan_number?: string | null
          payout_upi_id?: string | null
          phone?: string | null
          pincode?: string | null
          portfolio?: Json
          price_catalogue_url?: string | null
          profile_completion?: number
          rating?: number
          rejection_reason?: string | null
          review_count?: number
          service_areas?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          willing_to_travel?: boolean
          working_hours_end?: string | null
          working_hours_start?: string | null
          years_experience?: number | null
        }
        Update: {
          additional_info?: Json
          address?: string | null
          available_days?: Json
          blocked_dates?: Json
          business_name?: string
          category?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          documents?: Json
          email?: string | null
          facebook?: string | null
          gst_number?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          marketplace_visible?: boolean
          max_travel_km?: number | null
          owner_full_name?: string | null
          owner_id?: string
          pan_number?: string | null
          payout_upi_id?: string | null
          phone?: string | null
          pincode?: string | null
          portfolio?: Json
          price_catalogue_url?: string | null
          profile_completion?: number
          rating?: number
          rejection_reason?: string | null
          review_count?: number
          service_areas?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          willing_to_travel?: boolean
          working_hours_end?: string | null
          working_hours_start?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      worker_job_applications: {
        Row: {
          applied_at: string
          cover_note: string | null
          id: string
          posting_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["application_status"]
          worker_id: string
          worker_user_id: string
        }
        Insert: {
          applied_at?: string
          cover_note?: string | null
          id?: string
          posting_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          worker_id: string
          worker_user_id: string
        }
        Update: {
          applied_at?: string
          cover_note?: string | null
          id?: string
          posting_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          worker_id?: string
          worker_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_job_applications_posting_id_fkey"
            columns: ["posting_id"]
            isOneToOne: false
            referencedRelation: "worker_job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_job_applications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_job_postings: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_date: string
          hall_id: string | null
          id: string
          org_id: string | null
          pay_amount: number | null
          pay_type: Database["public"]["Enums"]["pay_type"]
          slots_filled: number
          slots_needed: number
          start_time: string | null
          status: Database["public"]["Enums"]["posting_status"]
          title: string
          updated_at: string
          vendor_id: string | null
          venue: string | null
          venue_address: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          event_date: string
          hall_id?: string | null
          id?: string
          org_id?: string | null
          pay_amount?: number | null
          pay_type?: Database["public"]["Enums"]["pay_type"]
          slots_filled?: number
          slots_needed?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["posting_status"]
          title: string
          updated_at?: string
          vendor_id?: string | null
          venue?: string | null
          venue_address?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          hall_id?: string | null
          id?: string
          org_id?: string | null
          pay_amount?: number | null
          pay_type?: Database["public"]["Enums"]["pay_type"]
          slots_filled?: number
          slots_needed?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["posting_status"]
          title?: string
          updated_at?: string
          vendor_id?: string | null
          venue?: string | null
          venue_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_job_postings_hall_id_fkey"
            columns: ["hall_id"]
            isOneToOne: false
            referencedRelation: "halls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_job_postings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_job_postings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_notifications: {
        Row: {
          action_url: string | null
          body: string | null
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string
          id: string
          metadata: Json
          read_at: string | null
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "worker_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_tasks: {
        Row: {
          accepted_at: string | null
          assigned_by: string
          assigner_role: Database["public"]["Enums"]["app_role"] | null
          check_in_at: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_photo_url: string | null
          check_out_at: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_photo_url: string | null
          completed_at: string | null
          completion_notes: string | null
          completion_photo_urls: Json
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_name: string
          id: string
          organization_id: string | null
          organization_name: string | null
          paused_at: string | null
          payment_amount: number | null
          payment_status: string
          priority: Database["public"]["Enums"]["task_priority"]
          rejected_at: string | null
          rejection_reason: string | null
          resumed_at: string | null
          start_time: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_name: string
          updated_at: string
          venue: string | null
          venue_address: string | null
          worker_id: string
          worker_notes: string | null
          worker_user_id: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_by: string
          assigner_role?: Database["public"]["Enums"]["app_role"] | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_photo_url?: string | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_photo_url?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_photo_urls?: Json
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_name: string
          id?: string
          organization_id?: string | null
          organization_name?: string | null
          paused_at?: string | null
          payment_amount?: number | null
          payment_status?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          rejected_at?: string | null
          rejection_reason?: string | null
          resumed_at?: string | null
          start_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_name: string
          updated_at?: string
          venue?: string | null
          venue_address?: string | null
          worker_id: string
          worker_notes?: string | null
          worker_user_id: string
        }
        Update: {
          accepted_at?: string | null
          assigned_by?: string
          assigner_role?: Database["public"]["Enums"]["app_role"] | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_photo_url?: string | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_photo_url?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_photo_urls?: Json
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_name?: string
          id?: string
          organization_id?: string | null
          organization_name?: string | null
          paused_at?: string | null
          payment_amount?: number | null
          payment_status?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          rejected_at?: string | null
          rejection_reason?: string | null
          resumed_at?: string | null
          start_time?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_name?: string
          updated_at?: string
          venue?: string | null
          venue_address?: string | null
          worker_id?: string
          worker_notes?: string | null
          worker_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          additional_info: Json
          address: string | null
          agency_description: string | null
          agency_gst: string | null
          agency_logo_url: string | null
          agency_name: string | null
          agency_reg_no: string | null
          agency_services: Json
          agency_team_size: number | null
          agency_years: number | null
          available_days: Json
          bio: string | null
          blocked_dates: Json
          category: string | null
          certificates: Json
          city: string | null
          country: string | null
          created_at: string
          daily_charges: number | null
          date_of_birth: string | null
          deleted_at: string | null
          district: string | null
          documents: Json
          email: string | null
          emergency_contact: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          full_name: string
          gender: string | null
          hourly_charges: number | null
          id: string
          id_proof_number: string | null
          id_proof_type: string | null
          id_proof_url: string | null
          languages: Json
          marketplace_visible: boolean
          max_travel_km: number | null
          min_booking_price: number | null
          monthly_charges: number | null
          nationality: string | null
          owner_id: string
          payment_type: Database["public"]["Enums"]["payment_type"] | null
          payout_upi_id: string | null
          per_event_charges: number | null
          phone: string | null
          photo_url: string | null
          pincode: string | null
          preferred_cities: Json
          preferred_language: string | null
          profile_completion: number
          rating: number
          rejection_reason: string | null
          review_count: number
          selfie_url: string | null
          skills: Json
          state: string | null
          status: Database["public"]["Enums"]["hall_status"]
          updated_at: string
          verification_notes: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          willing_to_travel: boolean
          work_images: Json
          work_videos: Json
          worker_type: Database["public"]["Enums"]["worker_type"]
          working_hours_end: string | null
          working_hours_start: string | null
          years_experience: number | null
        }
        Insert: {
          additional_info?: Json
          address?: string | null
          agency_description?: string | null
          agency_gst?: string | null
          agency_logo_url?: string | null
          agency_name?: string | null
          agency_reg_no?: string | null
          agency_services?: Json
          agency_team_size?: number | null
          agency_years?: number | null
          available_days?: Json
          bio?: string | null
          blocked_dates?: Json
          category?: string | null
          certificates?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          daily_charges?: number | null
          date_of_birth?: string | null
          deleted_at?: string | null
          district?: string | null
          documents?: Json
          email?: string | null
          emergency_contact?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          full_name: string
          gender?: string | null
          hourly_charges?: number | null
          id?: string
          id_proof_number?: string | null
          id_proof_type?: string | null
          id_proof_url?: string | null
          languages?: Json
          marketplace_visible?: boolean
          max_travel_km?: number | null
          min_booking_price?: number | null
          monthly_charges?: number | null
          nationality?: string | null
          owner_id: string
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          payout_upi_id?: string | null
          per_event_charges?: number | null
          phone?: string | null
          photo_url?: string | null
          pincode?: string | null
          preferred_cities?: Json
          preferred_language?: string | null
          profile_completion?: number
          rating?: number
          rejection_reason?: string | null
          review_count?: number
          selfie_url?: string | null
          skills?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          willing_to_travel?: boolean
          work_images?: Json
          work_videos?: Json
          worker_type?: Database["public"]["Enums"]["worker_type"]
          working_hours_end?: string | null
          working_hours_start?: string | null
          years_experience?: number | null
        }
        Update: {
          additional_info?: Json
          address?: string | null
          agency_description?: string | null
          agency_gst?: string | null
          agency_logo_url?: string | null
          agency_name?: string | null
          agency_reg_no?: string | null
          agency_services?: Json
          agency_team_size?: number | null
          agency_years?: number | null
          available_days?: Json
          bio?: string | null
          blocked_dates?: Json
          category?: string | null
          certificates?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          daily_charges?: number | null
          date_of_birth?: string | null
          deleted_at?: string | null
          district?: string | null
          documents?: Json
          email?: string | null
          emergency_contact?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          full_name?: string
          gender?: string | null
          hourly_charges?: number | null
          id?: string
          id_proof_number?: string | null
          id_proof_type?: string | null
          id_proof_url?: string | null
          languages?: Json
          marketplace_visible?: boolean
          max_travel_km?: number | null
          min_booking_price?: number | null
          monthly_charges?: number | null
          nationality?: string | null
          owner_id?: string
          payment_type?: Database["public"]["Enums"]["payment_type"] | null
          payout_upi_id?: string | null
          per_event_charges?: number | null
          phone?: string | null
          photo_url?: string | null
          pincode?: string | null
          preferred_cities?: Json
          preferred_language?: string | null
          profile_completion?: number
          rating?: number
          rejection_reason?: string | null
          review_count?: number
          selfie_url?: string | null
          skills?: Json
          state?: string | null
          status?: Database["public"]["Enums"]["hall_status"]
          updated_at?: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          willing_to_travel?: boolean
          work_images?: Json
          work_videos?: Json
          worker_type?: Database["public"]["Enums"]["worker_type"]
          working_hours_end?: string | null
          working_hours_start?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_verification_queue: {
        Row: {
          city: string | null
          created_at: string | null
          documents: Json | null
          email: string | null
          id: string | null
          phone: string | null
          rejection_reason: string | null
          role: string | null
          state: string | null
          title: string | null
          user_id: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_manager: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      org_member_has_permission: {
        Args: { p_org_id: string; p_permission: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "pending_approval" | "approved" | "rejected"
      app_role:
        | "admin"
        | "organization"
        | "hall_owner"
        | "vendor"
        | "worker"
        | "customer"
      application_status:
        | "applied"
        | "shortlisted"
        | "accepted"
        | "rejected"
        | "withdrawn"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      customer_booking_kind: "hall" | "vendor" | "worker"
      customer_booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "reschedule_requested"
      customer_event_status: "planning" | "upcoming" | "completed" | "cancelled"
      customer_notification_kind:
        | "booking"
        | "payment"
        | "offer"
        | "system"
        | "review"
      customer_payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "partial"
      customer_status: "active" | "inactive" | "suspended" | "deleted"
      customer_wishlist_kind: "hall" | "vendor" | "worker"
      enquiry_status:
        | "new"
        | "contacted"
        | "quoted"
        | "booked"
        | "declined"
        | "closed"
      hall_status: "draft" | "published" | "archived"
      notification_category:
        | "task_assigned"
        | "task_updated"
        | "task_cancelled"
        | "task_deadline"
        | "task_completed"
        | "payment_received"
        | "profile_approved"
        | "profile_rejected"
        | "admin_message"
        | "system"
      pay_type: "hourly" | "daily" | "per_event"
      payment_type: "hourly" | "daily" | "per_event" | "monthly"
      posting_status: "open" | "closed" | "cancelled"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status:
        | "pending"
        | "accepted"
        | "in_progress"
        | "paused"
        | "completed"
        | "rejected"
        | "cancelled"
      verification_status:
        | "unsubmitted"
        | "pending"
        | "approved"
        | "rejected"
        | "suspended"
        | "blacklisted"
      worker_type: "individual" | "agency"
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
      account_status: ["pending_approval", "approved", "rejected"],
      app_role: [
        "admin",
        "organization",
        "hall_owner",
        "vendor",
        "worker",
        "customer",
      ],
      application_status: [
        "applied",
        "shortlisted",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      customer_booking_kind: ["hall", "vendor", "worker"],
      customer_booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "reschedule_requested",
      ],
      customer_event_status: ["planning", "upcoming", "completed", "cancelled"],
      customer_notification_kind: [
        "booking",
        "payment",
        "offer",
        "system",
        "review",
      ],
      customer_payment_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partial",
      ],
      customer_status: ["active", "inactive", "suspended", "deleted"],
      customer_wishlist_kind: ["hall", "vendor", "worker"],
      enquiry_status: [
        "new",
        "contacted",
        "quoted",
        "booked",
        "declined",
        "closed",
      ],
      hall_status: ["draft", "published", "archived"],
      notification_category: [
        "task_assigned",
        "task_updated",
        "task_cancelled",
        "task_deadline",
        "task_completed",
        "payment_received",
        "profile_approved",
        "profile_rejected",
        "admin_message",
        "system",
      ],
      pay_type: ["hourly", "daily", "per_event"],
      payment_type: ["hourly", "daily", "per_event", "monthly"],
      posting_status: ["open", "closed", "cancelled"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: [
        "pending",
        "accepted",
        "in_progress",
        "paused",
        "completed",
        "rejected",
        "cancelled",
      ],
      verification_status: [
        "unsubmitted",
        "pending",
        "approved",
        "rejected",
        "suspended",
        "blacklisted",
      ],
      worker_type: ["individual", "agency"],
    },
  },
} as const
