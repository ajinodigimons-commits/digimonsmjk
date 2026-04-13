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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          has_expiry: boolean
          id: string
          name: string
          period_months: number
        }
        Insert: {
          created_at?: string
          has_expiry?: boolean
          id?: string
          name: string
          period_months?: number
        }
        Update: {
          created_at?: string
          has_expiry?: boolean
          id?: string
          name?: string
          period_months?: number
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          category: string
          created_at: string
          id: string
          options: Json | null
          question: string
          question_type: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          options?: Json | null
          question: string
          question_type?: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          options?: Json | null
          question?: string
          question_type?: string
          sort_order?: number
        }
        Relationships: []
      }
      equipment_field_values: {
        Row: {
          equipment_id: string
          field_name: string
          field_value: string | null
          id: string
        }
        Insert: {
          equipment_id: string
          field_name: string
          field_value?: string | null
          id?: string
        }
        Update: {
          equipment_id?: string
          field_name?: string
          field_value?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_field_values_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_fields: {
        Row: {
          category: string
          created_at: string
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_required: boolean
          options: Json | null
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          sort_order?: number
        }
        Relationships: []
      }
      equipments: {
        Row: {
          berat_netto: number | null
          category: string
          created_at: string
          id: string
          jenis_apar: string | null
          kode: string
          last_check_date: string | null
          lokasi: string
          status: string
          tanggal_kedaluwarsa: string | null
          user_id: string
        }
        Insert: {
          berat_netto?: number | null
          category: string
          created_at?: string
          id?: string
          jenis_apar?: string | null
          kode: string
          last_check_date?: string | null
          lokasi: string
          status?: string
          tanggal_kedaluwarsa?: string | null
          user_id: string
        }
        Update: {
          berat_netto?: number | null
          category?: string
          created_at?: string
          id?: string
          jenis_apar?: string | null
          kode?: string
          last_check_date?: string | null
          lokasi?: string
          status?: string
          tanggal_kedaluwarsa?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inspection_answers: {
        Row: {
          answer: string
          checklist_item_id: string
          id: string
          inspection_id: string
          notes: string | null
        }
        Insert: {
          answer?: string
          checklist_item_id: string
          id?: string
          inspection_id: string
          notes?: string | null
        }
        Update: {
          answer?: string
          checklist_item_id?: string
          id?: string
          inspection_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_answers_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_answers_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          checked_at: string
          checked_by: string
          created_at: string
          equipment_id: string
          id: string
          officer_name: string | null
          signature: string | null
        }
        Insert: {
          checked_at?: string
          checked_by: string
          created_at?: string
          equipment_id: string
          id?: string
          officer_name?: string | null
          signature?: string | null
        }
        Update: {
          checked_at?: string
          checked_by?: string
          created_at?: string
          equipment_id?: string
          id?: string
          officer_name?: string | null
          signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_password: string | null
          email: string | null
          id: string
          name: string
          section: string | null
        }
        Insert: {
          created_at?: string
          default_password?: string | null
          email?: string | null
          id: string
          name: string
          section?: string | null
        }
        Update: {
          created_at?: string
          default_password?: string | null
          email?: string | null
          id?: string
          name?: string
          section?: string | null
        }
        Relationships: []
      }
      schedules: {
        Row: {
          category: string
          id: string
          start_date: string
          user_id: string
        }
        Insert: {
          category: string
          id?: string
          start_date: string
          user_id: string
        }
        Update: {
          category?: string
          id?: string
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
