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
      affectations: {
        Row: {
          actif: boolean
          created_at: string
          date_debut: string
          date_fin: string | null
          enfant_id: string
          id: string
          maitre_id: string
          motif_remplacement: string | null
          remplace_affectation_id: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          enfant_id: string
          id?: string
          maitre_id: string
          motif_remplacement?: string | null
          remplace_affectation_id?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          enfant_id?: string
          id?: string
          maitre_id?: string
          motif_remplacement?: string | null
          remplace_affectation_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affectations_enfant_id_fkey"
            columns: ["enfant_id"]
            isOneToOne: false
            referencedRelation: "enfants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_maitre_id_fkey"
            columns: ["maitre_id"]
            isOneToOne: false
            referencedRelation: "maitres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_remplace_affectation_id_fkey"
            columns: ["remplace_affectation_id"]
            isOneToOne: false
            referencedRelation: "affectations"
            referencedColumns: ["id"]
          },
        ]
      }
      alertes: {
        Row: {
          created_at: string
          famille_id: string | null
          id: string
          lue: boolean
          maitre_id: string | null
          message: string
          severite: string
          type: string
        }
        Insert: {
          created_at?: string
          famille_id?: string | null
          id?: string
          lue?: boolean
          maitre_id?: string | null
          message: string
          severite?: string
          type: string
        }
        Update: {
          created_at?: string
          famille_id?: string | null
          id?: string
          lue?: boolean
          maitre_id?: string | null
          message?: string
          severite?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertes_famille_id_fkey"
            columns: ["famille_id"]
            isOneToOne: false
            referencedRelation: "familles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertes_maitre_id_fkey"
            columns: ["maitre_id"]
            isOneToOne: false
            referencedRelation: "maitres"
            referencedColumns: ["id"]
          },
        ]
      }
      avis_mensuels: {
        Row: {
          commentaire: string | null
          created_at: string
          enfant_id: string
          id: string
          maitre_id: string
          mois: string
          note: number | null
          points_a_travailler: string | null
          points_forts: string | null
          updated_at: string
          visible_famille: boolean
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          enfant_id: string
          id?: string
          maitre_id: string
          mois: string
          note?: number | null
          points_a_travailler?: string | null
          points_forts?: string | null
          updated_at?: string
          visible_famille?: boolean
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          enfant_id?: string
          id?: string
          maitre_id?: string
          mois?: string
          note?: number | null
          points_a_travailler?: string | null
          points_forts?: string | null
          updated_at?: string
          visible_famille?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "avis_mensuels_enfant_id_fkey"
            columns: ["enfant_id"]
            isOneToOne: false
            referencedRelation: "enfants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avis_mensuels_maitre_id_fkey"
            columns: ["maitre_id"]
            isOneToOne: false
            referencedRelation: "maitres"
            referencedColumns: ["id"]
          },
        ]
      }
      cours: {
        Row: {
          compte_rendu: string | null
          created_at: string
          date_cours: string
          debut_reel: string | null
          distance_m: number | null
          enfant_id: string
          fin_reelle: string | null
          gps_lat: number | null
          gps_lng: number | null
          heure_debut: string
          heure_fin: string
          id: string
          maitre_id: string
          maitre_remplacant_id: string | null
          matiere: string | null
          position_incoherente: boolean
          saisie_manuelle: boolean
          statut: Database["public"]["Enums"]["cours_statut"]
          updated_at: string
        }
        Insert: {
          compte_rendu?: string | null
          created_at?: string
          date_cours: string
          debut_reel?: string | null
          distance_m?: number | null
          enfant_id: string
          fin_reelle?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          maitre_id: string
          maitre_remplacant_id?: string | null
          matiere?: string | null
          position_incoherente?: boolean
          saisie_manuelle?: boolean
          statut?: Database["public"]["Enums"]["cours_statut"]
          updated_at?: string
        }
        Update: {
          compte_rendu?: string | null
          created_at?: string
          date_cours?: string
          debut_reel?: string | null
          distance_m?: number | null
          enfant_id?: string
          fin_reelle?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          heure_debut?: string
          heure_fin?: string
          id?: string
          maitre_id?: string
          maitre_remplacant_id?: string | null
          matiere?: string | null
          position_incoherente?: boolean
          saisie_manuelle?: boolean
          statut?: Database["public"]["Enums"]["cours_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cours_enfant_id_fkey"
            columns: ["enfant_id"]
            isOneToOne: false
            referencedRelation: "enfants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cours_maitre_id_fkey"
            columns: ["maitre_id"]
            isOneToOne: false
            referencedRelation: "maitres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cours_maitre_remplacant_id_fkey"
            columns: ["maitre_remplacant_id"]
            isOneToOne: false
            referencedRelation: "maitres"
            referencedColumns: ["id"]
          },
        ]
      }
      enfants: {
        Row: {
          actif: boolean
          created_at: string
          date_naissance: string | null
          famille_id: string
          id: string
          niveau: string | null
          nom: string | null
          prenom: string
          remarques: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          date_naissance?: string | null
          famille_id: string
          id?: string
          niveau?: string | null
          nom?: string | null
          prenom: string
          remarques?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          date_naissance?: string | null
          famille_id?: string
          id?: string
          niveau?: string | null
          nom?: string | null
          prenom?: string
          remarques?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enfants_famille_id_fkey"
            columns: ["famille_id"]
            isOneToOne: false
            referencedRelation: "familles"
            referencedColumns: ["id"]
          },
        ]
      }
      familles: {
        Row: {
          actif: boolean
          adresse: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          nom: string
          notes_admin: string | null
          quartier: string | null
          telephone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nom?: string
          notes_admin?: string | null
          quartier?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nom?: string
          notes_admin?: string | null
          quartier?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      maitres: {
        Row: {
          bio: string | null
          cni_path: string | null
          created_at: string
          cv_path: string | null
          diplome_path: string | null
          id: string
          motif_refus: string | null
          niveau_etudes: string | null
          specialites: string | null
          statut: Database["public"]["Enums"]["maitre_statut"]
          updated_at: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
          zone: string | null
        }
        Insert: {
          bio?: string | null
          cni_path?: string | null
          created_at?: string
          cv_path?: string | null
          diplome_path?: string | null
          id?: string
          motif_refus?: string | null
          niveau_etudes?: string | null
          specialites?: string | null
          statut?: Database["public"]["Enums"]["maitre_statut"]
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          zone?: string | null
        }
        Update: {
          bio?: string | null
          cni_path?: string | null
          created_at?: string
          cv_path?: string | null
          diplome_path?: string | null
          id?: string
          motif_refus?: string | null
          niveau_etudes?: string | null
          specialites?: string | null
          statut?: Database["public"]["Enums"]["maitre_statut"]
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      paiements: {
        Row: {
          created_at: string
          date_paiement: string | null
          famille_id: string
          id: string
          methode: Database["public"]["Enums"]["paiement_methode"]
          mois: string
          montant_du: number
          montant_paye: number
          reference_transaction: string | null
          statut: Database["public"]["Enums"]["paiement_statut"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_paiement?: string | null
          famille_id: string
          id?: string
          methode?: Database["public"]["Enums"]["paiement_methode"]
          mois: string
          montant_du?: number
          montant_paye?: number
          reference_transaction?: string | null
          statut?: Database["public"]["Enums"]["paiement_statut"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_paiement?: string | null
          famille_id?: string
          id?: string
          methode?: Database["public"]["Enums"]["paiement_methode"]
          mois?: string
          montant_du?: number
          montant_paye?: number
          reference_transaction?: string | null
          statut?: Database["public"]["Enums"]["paiement_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paiements_famille_id_fkey"
            columns: ["famille_id"]
            isOneToOne: false
            referencedRelation: "familles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          telephone?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_admin_role: { Args: never; Returns: boolean }
      current_maitre_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_famille_owner: { Args: { _famille_id: string }; Returns: boolean }
      maitre_suit_enfant: { Args: { _enfant_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "maitre" | "famille"
      cours_statut: "planifie" | "effectue" | "annule" | "remplace"
      maitre_statut: "en_attente" | "valide" | "refuse" | "suspendu"
      paiement_methode: "especes" | "virement" | "wave" | "autre"
      paiement_statut: "a_jour" | "partiel" | "en_retard" | "annule"
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
      app_role: ["admin", "maitre", "famille"],
      cours_statut: ["planifie", "effectue", "annule", "remplace"],
      maitre_statut: ["en_attente", "valide", "refuse", "suspendu"],
      paiement_methode: ["especes", "virement", "wave", "autre"],
      paiement_statut: ["a_jour", "partiel", "en_retard", "annule"],
    },
  },
} as const
