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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      buyer_requests: {
        Row: {
          buyer_id: string
          buyer_name: string | null
          contact_number: string | null
          created_at: string
          delivery_location: string | null
          fulfilment_preference: string
          id: string
          listing_id: string
          message: string | null
          order_instructions: string | null
          proposed_price: number | null
          quantity_requested: number
          rejection_reason: string | null
          request_type: string
          requested_harvest_date: string | null
          status: Database["public"]["Enums"]["request_status"]
        }
        Insert: {
          buyer_id: string
          buyer_name?: string | null
          contact_number?: string | null
          created_at?: string
          delivery_location?: string | null
          fulfilment_preference?: string
          id?: string
          listing_id: string
          message?: string | null
          order_instructions?: string | null
          proposed_price?: number | null
          quantity_requested: number
          rejection_reason?: string | null
          request_type?: string
          requested_harvest_date?: string | null
          status?: Database["public"]["Enums"]["request_status"]
        }
        Update: {
          buyer_id?: string
          buyer_name?: string | null
          contact_number?: string | null
          created_at?: string
          delivery_location?: string | null
          fulfilment_preference?: string
          id?: string
          listing_id?: string
          message?: string | null
          order_instructions?: string | null
          proposed_price?: number | null
          quantity_requested?: number
          rejection_reason?: string | null
          request_type?: string
          requested_harvest_date?: string | null
          status?: Database["public"]["Enums"]["request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "buyer_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "produce_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          consent_type: string
          consent_version: string
          granted: boolean
          granted_at: string
          id: string
          method: string
          profile_id: string
          withdrawn_at: string | null
        }
        Insert: {
          consent_type: string
          consent_version: string
          granted: boolean
          granted_at?: string
          id?: string
          method: string
          profile_id: string
          withdrawn_at?: string | null
        }
        Update: {
          consent_type?: string
          consent_version?: string
          granted?: boolean
          granted_at?: string
          id?: string
          method?: string
          profile_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperatives: {
        Row: {
          created_at: string
          id: string
          locality: string | null
          name: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          locality?: string | null
          name: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          locality?: string | null
          name?: string
          verification_status?: string
        }
        Relationships: []
      }
      cvs: {
        Row: {
          cover_letter: string | null
          created_at: string | null
          cv_text: string | null
          experience: string | null
          id: string
          job_title: string
          name: string
          skills: string | null
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string | null
          cv_text?: string | null
          experience?: string | null
          id?: string
          job_title: string
          name: string
          skills?: string | null
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string | null
          cv_text?: string | null
          experience?: string | null
          id?: string
          job_title?: string
          name?: string
          skills?: string | null
          user_id?: string
        }
        Relationships: []
      }
      farm_field_profiles: {
        Row: {
          created_at: string
          drainage: string
          farmer_id: string
          field_name: string
          field_notes: string | null
          id: string
          locality: string
          previous_crop: string | null
          soil_ph: number | null
          soil_ph_source: string
          soil_test_date: string | null
          soil_texture: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          drainage?: string
          farmer_id: string
          field_name: string
          field_notes?: string | null
          id?: string
          locality: string
          previous_crop?: string | null
          soil_ph?: number | null
          soil_ph_source?: string
          soil_test_date?: string | null
          soil_texture?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          drainage?: string
          farmer_id?: string
          field_name?: string
          field_notes?: string | null
          id?: string
          locality?: string
          previous_crop?: string | null
          soil_ph?: number | null
          soil_ph_source?: string
          soil_test_date?: string | null
          soil_texture?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_field_profiles_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_product_content: {
        Row: {
          description: string
          product_id: string
          safety_notes: string
          updated_at: string
          usage_guidance: string
        }
        Insert: {
          description: string
          product_id: string
          safety_notes?: string
          updated_at?: string
          usage_guidance?: string
        }
        Update: {
          description?: string
          product_id?: string
          safety_notes?: string
          updated_at?: string
          usage_guidance?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_product_content_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "farmer_products"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_products: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          required_plan: string
          summary: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          required_plan?: string
          summary: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          required_plan?: string
          summary?: string
        }
        Relationships: []
      }
      farmer_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          farmer_id: string
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          farmer_id: string
          id?: string
          plan: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          farmer_id?: string
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_subscriptions_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      indigenous_knowledge_posts: {
        Row: {
          attribution: string | null
          category: string
          consent_to_share: boolean
          content: string
          created_at: string
          crop_or_subject: string | null
          farmer_id: string
          id: string
          language: string
          locality: string | null
          sharing_scope: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attribution?: string | null
          category: string
          consent_to_share?: boolean
          content: string
          created_at?: string
          crop_or_subject?: string | null
          farmer_id: string
          id?: string
          language?: string
          locality?: string | null
          sharing_scope: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attribution?: string | null
          category?: string
          consent_to_share?: boolean
          content?: string
          created_at?: string
          crop_or_subject?: string | null
          farmer_id?: string
          id?: string
          language?: string
          locality?: string | null
          sharing_scope?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indigenous_knowledge_posts_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_private_details: {
        Row: {
          contact_phone: string
          farmer_id: string
          fulfilment_details: string
          listing_id: string
          updated_at: string
        }
        Insert: {
          contact_phone: string
          farmer_id: string
          fulfilment_details: string
          listing_id: string
          updated_at?: string
        }
        Update: {
          contact_phone?: string
          farmer_id?: string
          fulfilment_details?: string
          listing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_private_details_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_private_details_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "produce_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          notification_type: string
          order_id: string | null
          read_at: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          notification_type: string
          order_id?: string | null
          read_at?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          notification_type?: string
          order_id?: string | null
          read_at?: string | null
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_allocations: {
        Row: {
          agreed_unit_price: number
          farmer_id: string
          id: string
          listing_id: string
          order_id: string
          quantity_allocated: number
          status: string
        }
        Insert: {
          agreed_unit_price: number
          farmer_id: string
          id?: string
          listing_id: string
          order_id: string
          quantity_allocated: number
          status?: string
        }
        Update: {
          agreed_unit_price?: number
          farmer_id?: string
          id?: string
          listing_id?: string
          order_id?: string
          quantity_allocated?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_allocations_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_allocations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "produce_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_comments: {
        Row: {
          author_display_name: string
          author_id: string
          author_role: string
          body: string
          created_at: string
          id: string
          order_id: string
        }
        Insert: {
          author_display_name: string
          author_id: string
          author_role: string
          body: string
          created_at?: string
          id?: string
          order_id: string
        }
        Update: {
          author_display_name?: string
          author_id?: string
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_comments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          note: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          event_type: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id: string
          to_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_schedule_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          event_type: string
          id: string
          new_schedule: Json
          note: string | null
          order_id: string
          previous_schedule: Json | null
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          new_schedule?: Json
          note?: string | null
          order_id: string
          previous_schedule?: Json | null
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          new_schedule?: Json
          note?: string | null
          order_id?: string
          previous_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_schedule_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_schedule_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_contact_number: string | null
          buyer_id: string
          buyer_name: string | null
          collection_method: string | null
          collection_point: string | null
          collection_window_end: string | null
          collection_window_start: string | null
          created_at: string
          currency: string
          delivery_fee: number
          delivery_fee_accepted_at: string | null
          delivery_location: string | null
          fulfilment_location: string | null
          fulfilment_method: string
          fulfilment_preference: string
          fulfilment_state: string
          id: string
          listing_id: string | null
          order_instructions: string | null
          quantity_agreed: number
          scheduled_end: string | null
          scheduled_start: string | null
          seller_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          buyer_contact_number?: string | null
          buyer_id: string
          buyer_name?: string | null
          collection_method?: string | null
          collection_point?: string | null
          collection_window_end?: string | null
          collection_window_start?: string | null
          created_at?: string
          currency?: string
          delivery_fee?: number
          delivery_fee_accepted_at?: string | null
          delivery_location?: string | null
          fulfilment_location?: string | null
          fulfilment_method?: string
          fulfilment_preference?: string
          fulfilment_state?: string
          id?: string
          listing_id?: string | null
          order_instructions?: string | null
          quantity_agreed: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          seller_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          unit: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          buyer_contact_number?: string | null
          buyer_id?: string
          buyer_name?: string | null
          collection_method?: string | null
          collection_point?: string | null
          collection_window_end?: string | null
          collection_window_start?: string | null
          created_at?: string
          currency?: string
          delivery_fee?: number
          delivery_fee_accepted_at?: string | null
          delivery_location?: string | null
          fulfilment_location?: string | null
          fulfilment_method?: string
          fulfilment_preference?: string
          fulfilment_state?: string
          id?: string
          listing_id?: string | null
          order_instructions?: string | null
          quantity_agreed?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          seller_instructions?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "produce_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      produce_listings: {
        Row: {
          asking_price: number
          available_from: string
          category: string
          client_submission_id: string | null
          cooperative_id: string | null
          created_at: string
          currency: string
          district: string | null
          expires_at: string | null
          farmer_id: string
          harvest_date: string | null
          id: string
          image_path: string | null
          image_urls: string[]
          is_organic: boolean | null
          locality: string
          moderation_log: Json
          municipality: string | null
          price_unit: string
          produce_name: string
          quality_notes: string | null
          quantity_available: number
          quantity_sold: number
          reserved_quantity: number
          source_channel: Database["public"]["Enums"]["source_channel"]
          status: Database["public"]["Enums"]["listing_status"]
          unit: string
          updated_at: string
        }
        Insert: {
          asking_price: number
          available_from?: string
          category: string
          client_submission_id?: string | null
          cooperative_id?: string | null
          created_at?: string
          currency?: string
          district?: string | null
          expires_at?: string | null
          farmer_id: string
          harvest_date?: string | null
          id?: string
          image_path?: string | null
          image_urls?: string[]
          is_organic?: boolean | null
          locality: string
          moderation_log?: Json
          municipality?: string | null
          price_unit?: string
          produce_name: string
          quality_notes?: string | null
          quantity_available: number
          quantity_sold?: number
          reserved_quantity?: number
          source_channel?: Database["public"]["Enums"]["source_channel"]
          status?: Database["public"]["Enums"]["listing_status"]
          unit: string
          updated_at?: string
        }
        Update: {
          asking_price?: number
          available_from?: string
          category?: string
          client_submission_id?: string | null
          cooperative_id?: string | null
          created_at?: string
          currency?: string
          district?: string | null
          expires_at?: string | null
          farmer_id?: string
          harvest_date?: string | null
          id?: string
          image_path?: string | null
          image_urls?: string[]
          is_organic?: boolean | null
          locality?: string
          moderation_log?: Json
          municipality?: string | null
          price_unit?: string
          produce_name?: string
          quality_notes?: string | null
          quantity_available?: number
          quantity_sold?: number
          reserved_quantity?: number
          source_channel?: Database["public"]["Enums"]["source_channel"]
          status?: Database["public"]["Enums"]["listing_status"]
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produce_listings_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produce_listings_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          order_id: string
          rating: number
          review_text: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          order_id: string
          rating: number
          review_text: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          order_id?: string
          rating?: number
          review_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "produce_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cooperative_id: string | null
          created_at: string
          created_by_agent_id: string | null
          display_name: string
          district: string | null
          id: string
          locality: string | null
          municipality: string | null
          onboarding_status: string
          phone_e164: string | null
          preferred_language: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          cooperative_id?: string | null
          created_at?: string
          created_by_agent_id?: string | null
          display_name: string
          district?: string | null
          id: string
          locality?: string | null
          municipality?: string | null
          onboarding_status?: string
          phone_e164?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          cooperative_id?: string | null
          created_at?: string
          created_by_agent_id?: string | null
          display_name?: string
          district?: string | null
          id?: string
          locality?: string | null
          municipality?: string | null
          onboarding_status?: string
          phone_e164?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coop_fk"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_created_by_agent_id_fkey"
            columns: ["created_by_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_buyer_request: {
        Args: { p_request_id: string }
        Returns: {
          buyer_contact_number: string | null
          buyer_id: string
          buyer_name: string | null
          collection_method: string | null
          collection_point: string | null
          collection_window_end: string | null
          collection_window_start: string | null
          created_at: string
          currency: string
          delivery_fee: number
          delivery_fee_accepted_at: string | null
          delivery_location: string | null
          fulfilment_location: string | null
          fulfilment_method: string
          fulfilment_preference: string
          fulfilment_state: string
          id: string
          listing_id: string | null
          order_instructions: string | null
          quantity_agreed: number
          scheduled_end: string | null
          scheduled_start: string | null
          seller_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          unit: string
          unit_price: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      accept_buyer_request_with_schedule: {
        Args: {
          p_delivery_fee: number
          p_fulfilment_location: string
          p_fulfilment_method: string
          p_request_id: string
          p_scheduled_end: string
          p_scheduled_start: string
          p_seller_instructions: string
        }
        Returns: {
          buyer_contact_number: string | null
          buyer_id: string
          buyer_name: string | null
          collection_method: string | null
          collection_point: string | null
          collection_window_end: string | null
          collection_window_start: string | null
          created_at: string
          currency: string
          delivery_fee: number
          delivery_fee_accepted_at: string | null
          delivery_location: string | null
          fulfilment_location: string | null
          fulfilment_method: string
          fulfilment_preference: string
          fulfilment_state: string
          id: string
          listing_id: string | null
          order_instructions: string | null
          quantity_agreed: number
          scheduled_end: string | null
          scheduled_start: string | null
          seller_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          unit: string
          unit_price: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_order_delivery_fee: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      confirm_preorder_request: {
        Args: { p_request_id: string }
        Returns: string
      }
      create_aggregate_order: {
        Args: { p_allocations: Json; p_buyer_id: string }
        Returns: {
          buyer_contact_number: string | null
          buyer_id: string
          buyer_name: string | null
          collection_method: string | null
          collection_point: string | null
          collection_window_end: string | null
          collection_window_start: string | null
          created_at: string
          currency: string
          delivery_fee: number
          delivery_fee_accepted_at: string | null
          delivery_location: string | null
          fulfilment_location: string | null
          fulfilment_method: string
          fulfilment_preference: string
          fulfilment_state: string
          id: string
          listing_id: string | null
          order_instructions: string | null
          quantity_agreed: number
          scheduled_end: string | null
          scheduled_start: string | null
          seller_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          unit: string
          unit_price: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_cooperative_id: { Args: never; Returns: string }
      current_created_by_agent_id: { Args: never; Returns: string }
      current_role_name: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      fulfill_order_allocation: {
        Args: { p_allocation_id: string }
        Returns: {
          buyer_contact_number: string | null
          buyer_id: string
          buyer_name: string | null
          collection_method: string | null
          collection_point: string | null
          collection_window_end: string | null
          collection_window_start: string | null
          created_at: string
          currency: string
          delivery_fee: number
          delivery_fee_accepted_at: string | null
          delivery_location: string | null
          fulfilment_location: string | null
          fulfilment_method: string
          fulfilment_preference: string
          fulfilment_state: string
          id: string
          listing_id: string | null
          order_instructions: string | null
          quantity_agreed: number
          scheduled_end: string | null
          scheduled_start: string | null
          seller_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          unit: string
          unit_price: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_order_participant: { Args: { p_order_id: string }; Returns: boolean }
      reject_buyer_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      reject_buyer_request_with_reason: {
        Args: { p_reason: string; p_request_id: string }
        Returns: undefined
      }
      switch_account_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: undefined
      }
      update_buyer_order_details: {
        Args: {
          p_buyer_name: string
          p_contact_number: string
          p_delivery_location: string
          p_fulfilment_preference: string
          p_order_id: string
          p_order_instructions: string
        }
        Returns: undefined
      }
      update_order_fulfilment_schedule: {
        Args: {
          p_delivery_fee: number
          p_fulfilment_location: string
          p_fulfilment_method: string
          p_order_id: string
          p_scheduled_end: string
          p_scheduled_start: string
          p_seller_instructions: string
        }
        Returns: {
          buyer_contact_number: string | null
          buyer_id: string
          buyer_name: string | null
          collection_method: string | null
          collection_point: string | null
          collection_window_end: string | null
          collection_window_start: string | null
          created_at: string
          currency: string
          delivery_fee: number
          delivery_fee_accepted_at: string | null
          delivery_location: string | null
          fulfilment_location: string | null
          fulfilment_method: string
          fulfilment_preference: string
          fulfilment_state: string
          id: string
          listing_id: string | null
          order_instructions: string | null
          quantity_agreed: number
          scheduled_end: string | null
          scheduled_start: string | null
          seller_instructions: string | null
          status: Database["public"]["Enums"]["order_status"]
          unit: string
          unit_price: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      listing_status:
        | "draft"
        | "active"
        | "paused"
        | "sold"
        | "expired"
        | "moderated"
      order_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "cancelled"
        | "fulfilled"
        | "disputed"
      request_status: "pending" | "accepted" | "rejected" | "cancelled"
      source_channel: "app" | "agent" | "sms" | "ussd" | "import"
      user_role: "farmer" | "buyer" | "agent" | "cooperative_manager" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      listing_status: [
        "draft",
        "active",
        "paused",
        "sold",
        "expired",
        "moderated",
      ],
      order_status: [
        "pending",
        "accepted",
        "rejected",
        "cancelled",
        "fulfilled",
        "disputed",
      ],
      request_status: ["pending", "accepted", "rejected", "cancelled"],
      source_channel: ["app", "agent", "sms", "ussd", "import"],
      user_role: ["farmer", "buyer", "agent", "cooperative_manager", "admin"],
    },
  },
} as const
