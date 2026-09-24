// Generated from supabase/migrations. Regenerate with `npm run db:types`
// (uses a local Supabase stack) after any schema change. Do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      brand: {
        Row: {
          id: string
          name: string
          owner_organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      category: {
        Row: {
          id: string
          industry: string
          parent_id: string | null
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          industry?: string
          parent_id?: string | null
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          industry?: string
          parent_id?: string | null
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      change_log: {
        Row: {
          id: string
          organization_id: string | null
          table_name: string
          row_id: string
          action: string
          changes: Json
          actor_user_id: string | null
          actor_type: string
          reason: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          table_name: string
          row_id: string
          action: string
          changes: Json
          actor_user_id?: string | null
          actor_type: string
          reason?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          table_name?: string
          row_id?: string
          action?: string
          changes?: Json
          actor_user_id?: string | null
          actor_type?: string
          reason?: string | null
          changed_at?: string
        }
        Relationships: []
      }
      connection: {
        Row: {
          id: string
          organization_id: string
          connection_type: string
          provider: string
          method: string
          supplier_market_id: string | null
          capabilities: string[]
          status: string
          display_name: string | null
          external_account_id: string | null
          credentials_secret_id: string | null
          raw_payload_retention: string
          raw_payload_retention_hours: number | null
          observation_retention: string
          observation_retention_hours: number | null
          retention_basis: string | null
          last_synced_at: string | null
          last_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          connection_type: string
          provider: string
          method: string
          supplier_market_id?: string | null
          capabilities?: string[]
          status?: string
          display_name?: string | null
          external_account_id?: string | null
          credentials_secret_id?: string | null
          raw_payload_retention?: string
          raw_payload_retention_hours?: number | null
          observation_retention?: string
          observation_retention_hours?: number | null
          retention_basis?: string | null
          last_synced_at?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          connection_type?: string
          provider?: string
          method?: string
          supplier_market_id?: string | null
          capabilities?: string[]
          status?: string
          display_name?: string | null
          external_account_id?: string | null
          credentials_secret_id?: string | null
          raw_payload_retention?: string
          raw_payload_retention_hours?: number | null
          observation_retention?: string
          observation_retention_hours?: number | null
          retention_basis?: string | null
          last_synced_at?: string | null
          last_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      context_item: {
        Row: {
          id: string
          organization_id: string
          scope_type: string
          location_id: string | null
          supplier_relationship_id: string | null
          program_id: string | null
          recommendation_id: string | null
          purchase_order_id: string | null
          lifespan: string
          category: string | null
          statement: string
          structured_data: Json
          source_type: string
          confidence: number | null
          source_reference: Json
          valid_from: string
          expires_at: string | null
          status: string
          superseded_by_id: string | null
          retailer_confirmed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          category_id: string | null
          product_id: string | null
          review_at: string | null
          source_message_id: string | null
          source_document_id: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          scope_type: string
          location_id?: string | null
          supplier_relationship_id?: string | null
          program_id?: string | null
          recommendation_id?: string | null
          purchase_order_id?: string | null
          lifespan: string
          category?: string | null
          statement: string
          structured_data?: Json
          source_type: string
          confidence?: number | null
          source_reference?: Json
          valid_from?: string
          expires_at?: string | null
          status?: string
          superseded_by_id?: string | null
          retailer_confirmed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          category_id?: string | null
          product_id?: string | null
          review_at?: string | null
          source_message_id?: string | null
          source_document_id?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          scope_type?: string
          location_id?: string | null
          supplier_relationship_id?: string | null
          program_id?: string | null
          recommendation_id?: string | null
          purchase_order_id?: string | null
          lifespan?: string
          category?: string | null
          statement?: string
          structured_data?: Json
          source_type?: string
          confidence?: number | null
          source_reference?: Json
          valid_from?: string
          expires_at?: string | null
          status?: string
          superseded_by_id?: string | null
          retailer_confirmed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          category_id?: string | null
          product_id?: string | null
          review_at?: string | null
          source_message_id?: string | null
          source_document_id?: string | null
        }
        Relationships: []
      }
      document: {
        Row: {
          id: string
          organization_id: string
          storage_bucket: string
          storage_path: string
          file_name: string
          mime_type: string | null
          size_bytes: number | null
          content_sha256: string | null
          document_type: string
          uploaded_by: string | null
          uploaded_at: string
          retain_until: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          storage_bucket?: string
          storage_path: string
          file_name: string
          mime_type?: string | null
          size_bytes?: number | null
          content_sha256?: string | null
          document_type?: string
          uploaded_by?: string | null
          uploaded_at?: string
          retain_until?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          storage_bucket?: string
          storage_path?: string
          file_name?: string
          mime_type?: string | null
          size_bytes?: number | null
          content_sha256?: string | null
          document_type?: string
          uploaded_by?: string | null
          uploaded_at?: string
          retain_until?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_batch: {
        Row: {
          id: string
          organization_id: string | null
          connection_id: string | null
          document_id: string | null
          source_type: string
          data_type: string
          status: string
          requested_from: string | null
          requested_to: string | null
          started_at: string
          completed_at: string | null
          record_counts: Json
          error_summary: string | null
          raw_storage_bucket: string | null
          raw_storage_path: string | null
          raw_content_sha256: string | null
          raw_size_bytes: number | null
          raw_retention: string | null
          raw_expires_at: string | null
          raw_purged_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          connection_id?: string | null
          document_id?: string | null
          source_type: string
          data_type: string
          status?: string
          requested_from?: string | null
          requested_to?: string | null
          started_at?: string
          completed_at?: string | null
          record_counts?: Json
          error_summary?: string | null
          raw_storage_bucket?: string | null
          raw_storage_path?: string | null
          raw_content_sha256?: string | null
          raw_size_bytes?: number | null
          raw_retention?: string | null
          raw_expires_at?: string | null
          raw_purged_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          connection_id?: string | null
          document_id?: string | null
          source_type?: string
          data_type?: string
          status?: string
          requested_from?: string | null
          requested_to?: string | null
          started_at?: string
          completed_at?: string | null
          record_counts?: Json
          error_summary?: string | null
          raw_storage_bucket?: string | null
          raw_storage_path?: string | null
          raw_content_sha256?: string | null
          raw_size_bytes?: number | null
          raw_retention?: string | null
          raw_expires_at?: string | null
          raw_purged_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      intelligence_message: {
        Row: {
          id: string
          organization_id: string
          author_type: string
          author_user_id: string | null
          kind: string
          body: string | null
          question_id: string | null
          answer_choice: string | null
          document_id: string | null
          surface: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          author_type: string
          author_user_id?: string | null
          kind: string
          body?: string | null
          question_id?: string | null
          answer_choice?: string | null
          document_id?: string | null
          surface?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          author_type?: string
          author_user_id?: string | null
          kind?: string
          body?: string | null
          question_id?: string | null
          answer_choice?: string | null
          document_id?: string | null
          surface?: string | null
          created_at?: string
        }
        Relationships: []
      }
      intelligence_question: {
        Row: {
          id: string
          organization_id: string
          prompt: string
          choices: Json
          reason: string | null
          priority: number
          scope_type: string
          location_id: string | null
          supplier_relationship_id: string | null
          category_id: string | null
          product_id: string | null
          purchase_order_id: string | null
          status: string
          deferred_until: string | null
          answered_at: string | null
          answered_by: string | null
          answer_message_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          prompt: string
          choices?: Json
          reason?: string | null
          priority?: number
          scope_type?: string
          location_id?: string | null
          supplier_relationship_id?: string | null
          category_id?: string | null
          product_id?: string | null
          purchase_order_id?: string | null
          status?: string
          deferred_until?: string | null
          answered_at?: string | null
          answered_by?: string | null
          answer_message_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          prompt?: string
          choices?: Json
          reason?: string | null
          priority?: number
          scope_type?: string
          location_id?: string | null
          supplier_relationship_id?: string | null
          category_id?: string | null
          product_id?: string | null
          purchase_order_id?: string | null
          status?: string
          deferred_until?: string | null
          answered_at?: string | null
          answered_by?: string | null
          answer_message_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_history: {
        Row: {
          id: string
          organization_id: string
          location_id: string
          retailer_item_id: string
          quantity_on_hand: number
          valid_from: string
          valid_to: string | null
          valid_from_business_date: string
          valid_to_business_date: string | null
          last_confirmed_at: string
          import_batch_id: string | null
          last_confirmed_import_batch_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          location_id: string
          retailer_item_id: string
          quantity_on_hand: number
          valid_from: string
          valid_to?: string | null
          valid_from_business_date: string
          valid_to_business_date?: string | null
          last_confirmed_at: string
          import_batch_id?: string | null
          last_confirmed_import_batch_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          location_id?: string
          retailer_item_id?: string
          quantity_on_hand?: number
          valid_from?: string
          valid_to?: string | null
          valid_from_business_date?: string
          valid_to_business_date?: string | null
          last_confirmed_at?: string
          import_batch_id?: string | null
          last_confirmed_import_batch_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      location: {
        Row: {
          id: string
          organization_id: string
          name: string
          code: string | null
          location_type: string
          sells: boolean
          stocks: boolean
          receives: boolean
          address_line1: string | null
          address_line2: string | null
          city: string | null
          region: string | null
          postal_code: string | null
          country: string
          timezone: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          code?: string | null
          location_type?: string
          sells?: boolean
          stocks?: boolean
          receives?: boolean
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          region?: string | null
          postal_code?: string | null
          country: string
          timezone: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          code?: string | null
          location_type?: string
          sells?: boolean
          stocks?: boolean
          receives?: boolean
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          region?: string | null
          postal_code?: string | null
          country?: string
          timezone?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      membership: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization: {
        Row: {
          id: string
          kind: string
          name: string
          legal_name: string | null
          industry: string
          default_country: string | null
          website: string | null
          primary_contact_name: string | null
          primary_contact_email: string | null
          primary_contact_phone: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_region: string | null
          billing_postal_code: string | null
          billing_country: string | null
          public_profile: Json
          created_at: string
          updated_at: string
          created_by: string | null
          creation_request_id: string | null
        }
        Insert: {
          id?: string
          kind: string
          name: string
          legal_name?: string | null
          industry?: string
          default_country?: string | null
          website?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_region?: string | null
          billing_postal_code?: string | null
          billing_country?: string | null
          public_profile?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          creation_request_id?: string | null
        }
        Update: {
          id?: string
          kind?: string
          name?: string
          legal_name?: string | null
          industry?: string
          default_country?: string | null
          website?: string | null
          primary_contact_name?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_region?: string | null
          billing_postal_code?: string | null
          billing_country?: string | null
          public_profile?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
          creation_request_id?: string | null
        }
        Relationships: []
      }
      organization_agreement: {
        Row: {
          id: string
          organization_id: string
          agreement_type: string
          agreement_version: string
          decision: string
          decided_by: string
          decided_at: string
          presentation_id: string | null
          context: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          agreement_type: string
          agreement_version: string
          decision: string
          decided_by: string
          decided_at?: string
          presentation_id?: string | null
          context?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          agreement_type?: string
          agreement_version?: string
          decision?: string
          decided_by?: string
          decided_at?: string
          presentation_id?: string | null
          context?: string | null
          created_at?: string
        }
        Relationships: []
      }
      product: {
        Row: {
          id: string
          product_group_id: string | null
          brand_id: string | null
          category_id: string | null
          name: string
          model_year: number | null
          attributes: Json
          status: string
          merged_into_product_id: string | null
          origin_organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_group_id?: string | null
          brand_id?: string | null
          category_id?: string | null
          name: string
          model_year?: number | null
          attributes?: Json
          status?: string
          merged_into_product_id?: string | null
          origin_organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_group_id?: string | null
          brand_id?: string | null
          category_id?: string | null
          name?: string
          model_year?: number | null
          attributes?: Json
          status?: string
          merged_into_product_id?: string | null
          origin_organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_group: {
        Row: {
          id: string
          brand_id: string | null
          category_id: string | null
          name: string
          model_year: number | null
          attributes: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id?: string | null
          category_id?: string | null
          name: string
          model_year?: number | null
          attributes?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string | null
          category_id?: string | null
          name?: string
          model_year?: number | null
          attributes?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_identifier: {
        Row: {
          id: string
          product_id: string
          identifier_type: string
          value: string
          brand_id: string | null
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          identifier_type: string
          value: string
          brand_id?: string | null
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          identifier_type?: string
          value?: string
          brand_id?: string | null
          source?: string
          created_at?: string
        }
        Relationships: []
      }
      product_match: {
        Row: {
          id: string
          organization_id: string | null
          retailer_item_id: string | null
          supplier_item_id: string | null
          product_id: string
          status: string
          confidence: number
          method: string
          evidence: Json
          decided_by_type: string
          decided_by: string | null
          decided_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          retailer_item_id?: string | null
          supplier_item_id?: string | null
          product_id: string
          status?: string
          confidence: number
          method: string
          evidence?: Json
          decided_by_type?: string
          decided_by?: string | null
          decided_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          retailer_item_id?: string | null
          supplier_item_id?: string | null
          product_id?: string
          status?: string
          confidence?: number
          method?: string
          evidence?: Json
          decided_by_type?: string
          decided_by?: string | null
          decided_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_relationship: {
        Row: {
          id: string
          from_product_id: string
          to_product_id: string
          relationship_type: string
          source_type: string
          country: string | null
          confidence: number | null
          evidence: Json
          status: string
          effective_from: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          from_product_id: string
          to_product_id: string
          relationship_type: string
          source_type: string
          country?: string | null
          confidence?: number | null
          evidence?: Json
          status?: string
          effective_from?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          from_product_id?: string
          to_product_id?: string
          relationship_type?: string
          source_type?: string
          country?: string | null
          confidence?: number | null
          evidence?: Json
          status?: string
          effective_from?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      program: {
        Row: {
          id: string
          owner_organization_id: string
          supplier_market_id: string
          name: string
          season_label: string | null
          visibility: string
          provenance: string
          external_program_code: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_organization_id: string
          supplier_market_id: string
          name: string
          season_label?: string | null
          visibility?: string
          provenance: string
          external_program_code?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_organization_id?: string
          supplier_market_id?: string
          name?: string
          season_label?: string | null
          visibility?: string
          provenance?: string
          external_program_code?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_eligibility: {
        Row: {
          id: string
          program_version_id: string
          program_rule_id: string | null
          target_type: string
          product_id: string | null
          product_group_id: string | null
          category_id: string | null
          brand_id: string | null
          supplier_item_id: string | null
          raw_description: string | null
          raw_identifier: string | null
          special_price: number | null
          currency: string | null
          minimum_quantity: number | null
          source_text: string | null
          match_confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          program_version_id: string
          program_rule_id?: string | null
          target_type: string
          product_id?: string | null
          product_group_id?: string | null
          category_id?: string | null
          brand_id?: string | null
          supplier_item_id?: string | null
          raw_description?: string | null
          raw_identifier?: string | null
          special_price?: number | null
          currency?: string | null
          minimum_quantity?: number | null
          source_text?: string | null
          match_confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          program_version_id?: string
          program_rule_id?: string | null
          target_type?: string
          product_id?: string | null
          product_group_id?: string | null
          category_id?: string | null
          brand_id?: string | null
          supplier_item_id?: string | null
          raw_description?: string | null
          raw_identifier?: string | null
          special_price?: number | null
          currency?: string | null
          minimum_quantity?: number | null
          source_text?: string | null
          match_confidence?: number | null
          created_at?: string
        }
        Relationships: []
      }
      program_link: {
        Row: {
          id: string
          organization_id: string
          private_program_id: string
          official_program_id: string
          status: string
          confidence: number | null
          evidence: Json
          decided_by: string | null
          decided_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          private_program_id: string
          official_program_id: string
          status?: string
          confidence?: number | null
          evidence?: Json
          decided_by?: string | null
          decided_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          private_program_id?: string
          official_program_id?: string
          status?: string
          confidence?: number | null
          evidence?: Json
          decided_by?: string | null
          decided_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_rule: {
        Row: {
          id: string
          program_version_id: string
          sequence: number
          rule_type: string
          tier_label: string | null
          threshold_type: string | null
          threshold_value: number | null
          threshold_currency: string | null
          benefit_type: string | null
          benefit_value: number | null
          benefit_details: Json
          source_text: string | null
          confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          program_version_id: string
          sequence?: number
          rule_type: string
          tier_label?: string | null
          threshold_type?: string | null
          threshold_value?: number | null
          threshold_currency?: string | null
          benefit_type?: string | null
          benefit_value?: number | null
          benefit_details?: Json
          source_text?: string | null
          confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          program_version_id?: string
          sequence?: number
          rule_type?: string
          tier_label?: string | null
          threshold_type?: string | null
          threshold_value?: number | null
          threshold_currency?: string | null
          benefit_type?: string | null
          benefit_value?: number | null
          benefit_details?: Json
          source_text?: string | null
          confidence?: number | null
          created_at?: string
        }
        Relationships: []
      }
      program_version: {
        Row: {
          id: string
          program_id: string
          version_number: number
          status: string
          extraction_method: string
          extraction_confidence: number | null
          source_document_id: string | null
          source_import_batch_id: string | null
          summary: string | null
          order_window_start: string | null
          order_window_end: string | null
          ship_window_start: string | null
          ship_window_end: string | null
          delivery_options: Json
          currency: string | null
          core_terms: Json
          additional_terms: Json
          confirmed_by: string | null
          confirmed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          program_id: string
          version_number: number
          status?: string
          extraction_method: string
          extraction_confidence?: number | null
          source_document_id?: string | null
          source_import_batch_id?: string | null
          summary?: string | null
          order_window_start?: string | null
          order_window_end?: string | null
          ship_window_start?: string | null
          ship_window_end?: string | null
          delivery_options?: Json
          currency?: string | null
          core_terms?: Json
          additional_terms?: Json
          confirmed_by?: string | null
          confirmed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          version_number?: number
          status?: string
          extraction_method?: string
          extraction_confidence?: number | null
          source_document_id?: string | null
          source_import_batch_id?: string | null
          summary?: string | null
          order_window_start?: string | null
          order_window_end?: string | null
          ship_window_start?: string | null
          ship_window_end?: string | null
          delivery_options?: Json
          currency?: string | null
          core_terms?: Json
          additional_terms?: Json
          confirmed_by?: string | null
          confirmed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order: {
        Row: {
          id: string
          organization_id: string
          origin: string
          status: string
          supplier_market_id: string | null
          supplier_relationship_id: string | null
          vendor_name_raw: string | null
          program_version_id: string | null
          recommendation_id: string | null
          ship_to_location_id: string | null
          currency: string | null
          reference_number: string | null
          notes: string | null
          approved_at: string | null
          approved_by: string | null
          submitted_at: string | null
          submitted_by: string | null
          submission_method: string | null
          submission_reference: string | null
          discarded_at: string | null
          discarded_by: string | null
          discard_reason: string | null
          connection_id: string | null
          import_batch_id: string | null
          external_id: string | null
          external_number: string | null
          external_status: string | null
          external_status_at: string | null
          external_data: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          origin?: string
          status?: string
          supplier_market_id?: string | null
          supplier_relationship_id?: string | null
          vendor_name_raw?: string | null
          program_version_id?: string | null
          recommendation_id?: string | null
          ship_to_location_id?: string | null
          currency?: string | null
          reference_number?: string | null
          notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          submission_method?: string | null
          submission_reference?: string | null
          discarded_at?: string | null
          discarded_by?: string | null
          discard_reason?: string | null
          connection_id?: string | null
          import_batch_id?: string | null
          external_id?: string | null
          external_number?: string | null
          external_status?: string | null
          external_status_at?: string | null
          external_data?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          origin?: string
          status?: string
          supplier_market_id?: string | null
          supplier_relationship_id?: string | null
          vendor_name_raw?: string | null
          program_version_id?: string | null
          recommendation_id?: string | null
          ship_to_location_id?: string | null
          currency?: string | null
          reference_number?: string | null
          notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          submission_method?: string | null
          submission_reference?: string | null
          discarded_at?: string | null
          discarded_by?: string | null
          discard_reason?: string | null
          connection_id?: string | null
          import_batch_id?: string | null
          external_id?: string | null
          external_number?: string | null
          external_status?: string | null
          external_status_at?: string | null
          external_data?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_line: {
        Row: {
          id: string
          organization_id: string
          purchase_order_id: string
          line_number: number
          recommendation_line_id: string | null
          product_id: string | null
          supplier_item_id: string | null
          retailer_item_id: string | null
          description: string | null
          for_location_id: string | null
          ship_to_location_id: string | null
          requested_ship_date: string | null
          units_per_order_unit: number
          recommended_quantity: number | null
          quantity: number
          unit_cost: number | null
          currency: string | null
          approved_quantity: number | null
          approved_unit_cost: number | null
          submitted_quantity: number | null
          submitted_unit_cost: number | null
          validation_status: string
          validated_at: string | null
          validation_details: Json
          external_line_id: string | null
          received_quantity: number | null
          last_received_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          purchase_order_id: string
          line_number: number
          recommendation_line_id?: string | null
          product_id?: string | null
          supplier_item_id?: string | null
          retailer_item_id?: string | null
          description?: string | null
          for_location_id?: string | null
          ship_to_location_id?: string | null
          requested_ship_date?: string | null
          units_per_order_unit?: number
          recommended_quantity?: number | null
          quantity?: number
          unit_cost?: number | null
          currency?: string | null
          approved_quantity?: number | null
          approved_unit_cost?: number | null
          submitted_quantity?: number | null
          submitted_unit_cost?: number | null
          validation_status?: string
          validated_at?: string | null
          validation_details?: Json
          external_line_id?: string | null
          received_quantity?: number | null
          last_received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          purchase_order_id?: string
          line_number?: number
          recommendation_line_id?: string | null
          product_id?: string | null
          supplier_item_id?: string | null
          retailer_item_id?: string | null
          description?: string | null
          for_location_id?: string | null
          ship_to_location_id?: string | null
          requested_ship_date?: string | null
          units_per_order_unit?: number
          recommended_quantity?: number | null
          quantity?: number
          unit_cost?: number | null
          currency?: string | null
          approved_quantity?: number | null
          approved_unit_cost?: number | null
          submitted_quantity?: number | null
          submitted_unit_cost?: number | null
          validation_status?: string
          validated_at?: string | null
          validation_details?: Json
          external_line_id?: string | null
          received_quantity?: number | null
          last_received_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendation: {
        Row: {
          id: string
          organization_id: string
          recommendation_type: string
          supplier_market_id: string | null
          supplier_relationship_id: string | null
          program_version_id: string | null
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          status_reason: string | null
          generated_at: string
          actionable_until: string | null
          method_version: string
          inputs: Json
          summary: string | null
          currency: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          recommendation_type: string
          supplier_market_id?: string | null
          supplier_relationship_id?: string | null
          program_version_id?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          generated_at?: string
          actionable_until?: string | null
          method_version: string
          inputs?: Json
          summary?: string | null
          currency?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          recommendation_type?: string
          supplier_market_id?: string | null
          supplier_relationship_id?: string | null
          program_version_id?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_reason?: string | null
          generated_at?: string
          actionable_until?: string | null
          method_version?: string
          inputs?: Json
          summary?: string | null
          currency?: string | null
          created_at?: string
        }
        Relationships: []
      }
      recommendation_line: {
        Row: {
          id: string
          organization_id: string
          recommendation_id: string
          line_number: number
          product_id: string | null
          retailer_item_id: string | null
          supplier_item_id: string | null
          for_location_id: string
          ship_to_location_id: string | null
          recommended_quantity: number
          units_per_order_unit: number
          requested_ship_date: string | null
          forecast_demand: number | null
          coverage_start: string | null
          coverage_end: string | null
          on_hand_at_generation: number | null
          on_order_at_generation: number | null
          assumed_unit_cost: number | null
          currency: string | null
          assumed_availability: string | null
          assumed_available_quantity: number | null
          assumptions_observed_at: string | null
          assumption_observation_id: string | null
          reason_code: string | null
          explanation: string | null
          evidence: Json
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          recommendation_id: string
          line_number: number
          product_id?: string | null
          retailer_item_id?: string | null
          supplier_item_id?: string | null
          for_location_id: string
          ship_to_location_id?: string | null
          recommended_quantity: number
          units_per_order_unit?: number
          requested_ship_date?: string | null
          forecast_demand?: number | null
          coverage_start?: string | null
          coverage_end?: string | null
          on_hand_at_generation?: number | null
          on_order_at_generation?: number | null
          assumed_unit_cost?: number | null
          currency?: string | null
          assumed_availability?: string | null
          assumed_available_quantity?: number | null
          assumptions_observed_at?: string | null
          assumption_observation_id?: string | null
          reason_code?: string | null
          explanation?: string | null
          evidence?: Json
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          recommendation_id?: string
          line_number?: number
          product_id?: string | null
          retailer_item_id?: string | null
          supplier_item_id?: string | null
          for_location_id?: string
          ship_to_location_id?: string | null
          recommended_quantity?: number
          units_per_order_unit?: number
          requested_ship_date?: string | null
          forecast_demand?: number | null
          coverage_start?: string | null
          coverage_end?: string | null
          on_hand_at_generation?: number | null
          on_order_at_generation?: number | null
          assumed_unit_cost?: number | null
          currency?: string | null
          assumed_availability?: string | null
          assumed_available_quantity?: number | null
          assumptions_observed_at?: string | null
          assumption_observation_id?: string | null
          reason_code?: string | null
          explanation?: string | null
          evidence?: Json
          created_at?: string
        }
        Relationships: []
      }
      retailer_item: {
        Row: {
          id: string
          organization_id: string
          connection_id: string
          external_id: string
          sku: string | null
          upc: string | null
          ean: string | null
          manufacturer_part_number: string | null
          brand_name_raw: string | null
          description: string | null
          pos_category_raw: string | null
          vendor_name_raw: string | null
          vendor_sku_raw: string | null
          selling_uom_raw: string | null
          selling_unit_type: string
          units_per_selling_unit: number
          default_cost: number | null
          default_price: number | null
          currency: string | null
          item_kind: string
          stocking_intent: string
          stocking_intent_source: string | null
          status: string
          import_batch_id: string | null
          first_seen_at: string
          last_seen_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          connection_id: string
          external_id: string
          sku?: string | null
          upc?: string | null
          ean?: string | null
          manufacturer_part_number?: string | null
          brand_name_raw?: string | null
          description?: string | null
          pos_category_raw?: string | null
          vendor_name_raw?: string | null
          vendor_sku_raw?: string | null
          selling_uom_raw?: string | null
          selling_unit_type?: string
          units_per_selling_unit?: number
          default_cost?: number | null
          default_price?: number | null
          currency?: string | null
          item_kind?: string
          stocking_intent?: string
          stocking_intent_source?: string | null
          status?: string
          import_batch_id?: string | null
          first_seen_at?: string
          last_seen_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          connection_id?: string
          external_id?: string
          sku?: string | null
          upc?: string | null
          ean?: string | null
          manufacturer_part_number?: string | null
          brand_name_raw?: string | null
          description?: string | null
          pos_category_raw?: string | null
          vendor_name_raw?: string | null
          vendor_sku_raw?: string | null
          selling_uom_raw?: string | null
          selling_unit_type?: string
          units_per_selling_unit?: number
          default_cost?: number | null
          default_price?: number | null
          currency?: string | null
          item_kind?: string
          stocking_intent?: string
          stocking_intent_source?: string | null
          status?: string
          import_batch_id?: string | null
          first_seen_at?: string
          last_seen_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_line: {
        Row: {
          id: string
          organization_id: string
          location_id: string
          retailer_item_id: string | null
          connection_id: string
          import_batch_id: string | null
          external_sale_id: string | null
          external_line_id: string
          sold_at: string
          business_date: string
          quantity: number
          unit_price: number | null
          extended_price: number | null
          discount_amount: number | null
          unit_cost: number | null
          currency: string
          is_special_order: boolean | null
          description_raw: string | null
          attributes: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          location_id: string
          retailer_item_id?: string | null
          connection_id: string
          import_batch_id?: string | null
          external_sale_id?: string | null
          external_line_id: string
          sold_at: string
          business_date: string
          quantity: number
          unit_price?: number | null
          extended_price?: number | null
          discount_amount?: number | null
          unit_cost?: number | null
          currency: string
          is_special_order?: boolean | null
          description_raw?: string | null
          attributes?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          location_id?: string
          retailer_item_id?: string | null
          connection_id?: string
          import_batch_id?: string | null
          external_sale_id?: string | null
          external_line_id?: string
          sold_at?: string
          business_date?: string
          quantity?: number
          unit_price?: number | null
          extended_price?: number | null
          discount_amount?: number | null
          unit_cost?: number | null
          currency?: string
          is_special_order?: boolean | null
          description_raw?: string | null
          attributes?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_item: {
        Row: {
          id: string
          supplier_market_id: string
          supplier_sku: string
          supplier_part_number: string | null
          manufacturer_part_number: string | null
          upc: string | null
          ean: string | null
          brand_name_raw: string | null
          brand_id: string | null
          description: string | null
          category_raw: string | null
          uom_raw: string | null
          unit_type: string
          pack_quantity: number
          order_multiple: number
          minimum_order_quantity: number | null
          uom_normalization: string
          msrp: number | null
          msrp_currency: string | null
          attributes: Json
          status: string
          import_batch_id: string | null
          first_seen_at: string
          last_seen_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_market_id: string
          supplier_sku: string
          supplier_part_number?: string | null
          manufacturer_part_number?: string | null
          upc?: string | null
          ean?: string | null
          brand_name_raw?: string | null
          brand_id?: string | null
          description?: string | null
          category_raw?: string | null
          uom_raw?: string | null
          unit_type?: string
          pack_quantity?: number
          order_multiple?: number
          minimum_order_quantity?: number | null
          uom_normalization?: string
          msrp?: number | null
          msrp_currency?: string | null
          attributes?: Json
          status?: string
          import_batch_id?: string | null
          first_seen_at?: string
          last_seen_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_market_id?: string
          supplier_sku?: string
          supplier_part_number?: string | null
          manufacturer_part_number?: string | null
          upc?: string | null
          ean?: string | null
          brand_name_raw?: string | null
          brand_id?: string | null
          description?: string | null
          category_raw?: string | null
          uom_raw?: string | null
          unit_type?: string
          pack_quantity?: number
          order_multiple?: number
          minimum_order_quantity?: number | null
          uom_normalization?: string
          msrp?: number | null
          msrp_currency?: string | null
          attributes?: Json
          status?: string
          import_batch_id?: string | null
          first_seen_at?: string
          last_seen_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_market: {
        Row: {
          id: string
          supplier_organization_id: string
          supplier_kind: string
          name: string
          country: string
          currency: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_organization_id: string
          supplier_kind?: string
          name: string
          country: string
          currency: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_organization_id?: string
          supplier_kind?: string
          name?: string
          country?: string
          currency?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_offer_observation: {
        Row: {
          id: string
          organization_id: string
          supplier_relationship_id: string
          supplier_item_id: string
          supplier_warehouse_id: string | null
          unit_cost: number | null
          currency: string | null
          price_type: string | null
          available_quantity: number | null
          availability_status: string | null
          expected_available_date: string | null
          lead_time_days: number | null
          observed_at: string
          expires_at: string | null
          import_batch_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          supplier_relationship_id: string
          supplier_item_id: string
          supplier_warehouse_id?: string | null
          unit_cost?: number | null
          currency?: string | null
          price_type?: string | null
          available_quantity?: number | null
          availability_status?: string | null
          expected_available_date?: string | null
          lead_time_days?: number | null
          observed_at: string
          expires_at?: string | null
          import_batch_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          supplier_relationship_id?: string
          supplier_item_id?: string
          supplier_warehouse_id?: string | null
          unit_cost?: number | null
          currency?: string | null
          price_type?: string | null
          available_quantity?: number | null
          availability_status?: string | null
          expected_available_date?: string | null
          lead_time_days?: number | null
          observed_at?: string
          expires_at?: string | null
          import_batch_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      supplier_relationship: {
        Row: {
          id: string
          organization_id: string
          retailer_kind: string
          supplier_market_id: string
          status: string
          preference: string
          preference_notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          retailer_kind?: string
          supplier_market_id: string
          status?: string
          preference?: string
          preference_notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          retailer_kind?: string
          supplier_market_id?: string
          status?: string
          preference?: string
          preference_notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_terms: {
        Row: {
          id: string
          organization_id: string
          supplier_relationship_id: string
          location_id: string | null
          term_type: string
          description: string | null
          value: Json
          amount: number | null
          currency: string | null
          valid_from: string | null
          valid_to: string | null
          source_type: string
          document_id: string | null
          import_batch_id: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          supplier_relationship_id: string
          location_id?: string | null
          term_type: string
          description?: string | null
          value?: Json
          amount?: number | null
          currency?: string | null
          valid_from?: string | null
          valid_to?: string | null
          source_type?: string
          document_id?: string | null
          import_batch_id?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          supplier_relationship_id?: string
          location_id?: string | null
          term_type?: string
          description?: string | null
          value?: Json
          amount?: number | null
          currency?: string | null
          valid_from?: string | null
          valid_to?: string | null
          source_type?: string
          document_id?: string | null
          import_batch_id?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_warehouse: {
        Row: {
          id: string
          supplier_market_id: string
          code: string
          name: string | null
          region: string | null
          postal_code: string | null
          country: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_market_id: string
          code: string
          name?: string | null
          region?: string | null
          postal_code?: string | null
          country?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_market_id?: string
          code?: string
          name?: string | null
          region?: string | null
          postal_code?: string | null
          country?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_coverage: {
        Row: {
          id: string
          organization_id: string
          connection_id: string
          import_batch_id: string
          data_type: string
          location_id: string | null
          coverage_type: string
          covered_from: string
          covered_to: string
          completeness: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          connection_id: string
          import_batch_id: string
          data_type: string
          location_id?: string | null
          coverage_type: string
          covered_from: string
          covered_to: string
          completeness?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          connection_id?: string
          import_batch_id?: string
          data_type?: string
          location_id?: string | null
          coverage_type?: string
          covered_from?: string
          covered_to?: string
          completeness?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      organization_agreement_current: {
        Row: {
          organization_id: string | null
          agreement_type: string | null
          agreement_version: string | null
          decision: string | null
          decided_by: string | null
          decided_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      answer_intelligence_question: {
        Args: {
          p_question_id: string
          p_choice: string | null
          p_body: string | null
          p_surface?: string
        }
        Returns: string
      }
      bootstrap_retailer_organization: {
        Args: {
          p_user_id: string
          p_request_id: string
          p_name: string
          p_default_country: string
          p_legal_name?: string | null
          p_website?: string | null
        }
        Returns: string
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
