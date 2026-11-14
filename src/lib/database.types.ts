// Generato da Supabase (generate_typescript_types) il 2026-11-14: non modificare a mano.
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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_eliminati: {
        Row: {
          codice_conferma: string
          eliminato_il: string
          id: string
          origine: string
          provider: string[]
          utente_eliminato_id: string | null
        }
        Insert: {
          codice_conferma: string
          eliminato_il?: string
          id?: string
          origine: string
          provider?: string[]
          utente_eliminato_id?: string | null
        }
        Update: {
          codice_conferma?: string
          eliminato_il?: string
          id?: string
          origine?: string
          provider?: string[]
          utente_eliminato_id?: string | null
        }
        Relationships: []
      }
      album_foto: {
        Row: {
          consenso_verificato: boolean
          data_scatto: string | null
          id: string
          pubblicato: boolean
          titolo: string
          url_copertina: string | null
        }
        Insert: {
          consenso_verificato?: boolean
          data_scatto?: string | null
          id?: string
          pubblicato?: boolean
          titolo: string
          url_copertina?: string | null
        }
        Update: {
          consenso_verificato?: boolean
          data_scatto?: string | null
          id?: string
          pubblicato?: boolean
          titolo?: string
          url_copertina?: string | null
        }
        Relationships: []
      }
      azioni_punto: {
        Row: {
          azione: string
          creato_il: string
          evento_id: string
          fase: string
          formazione_id: string | null
          frase_ai: boolean
          giocatrice_id: string | null
          id: string
          nome_giocatrice: string | null
          numero_set: number
          partita_id: string
          punteggio_avversario: number
          punteggio_nostro: number
          squadra: string
          zona: number | null
        }
        Insert: {
          azione: string
          creato_il?: string
          evento_id: string
          fase: string
          formazione_id?: string | null
          frase_ai?: boolean
          giocatrice_id?: string | null
          id?: string
          nome_giocatrice?: string | null
          numero_set: number
          partita_id: string
          punteggio_avversario: number
          punteggio_nostro: number
          squadra: string
          zona?: number | null
        }
        Update: {
          azione?: string
          creato_il?: string
          evento_id?: string
          fase?: string
          formazione_id?: string | null
          frase_ai?: boolean
          giocatrice_id?: string | null
          id?: string
          nome_giocatrice?: string | null
          numero_set?: number
          partita_id?: string
          punteggio_avversario?: number
          punteggio_nostro?: number
          squadra?: string
          zona?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "azioni_punto_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: true
            referencedRelation: "eventi_live"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azioni_punto_giocatrice_id_fkey"
            columns: ["giocatrice_id"]
            isOneToOne: false
            referencedRelation: "giocatrici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azioni_punto_giocatrice_id_fkey"
            columns: ["giocatrice_id"]
            isOneToOne: false
            referencedRelation: "giocatrici_pubbliche"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azioni_punto_partita_id_fkey"
            columns: ["partita_id"]
            isOneToOne: false
            referencedRelation: "partite"
            referencedColumns: ["id"]
          },
        ]
      }
      campionati: {
        Row: {
          creato_il: string
          federazione: string | null
          id: string
          logo_url: string | null
          nome: string
        }
        Insert: {
          creato_il?: string
          federazione?: string | null
          id?: string
          logo_url?: string | null
          nome: string
        }
        Update: {
          creato_il?: string
          federazione?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
        }
        Relationships: []
      }
      categorie_giovanili: {
        Row: {
          descrizione: string | null
          id: string
          nome: string
          ordine: number | null
        }
        Insert: {
          descrizione?: string | null
          id?: string
          nome: string
          ordine?: number | null
        }
        Update: {
          descrizione?: string | null
          id?: string
          nome?: string
          ordine?: number | null
        }
        Relationships: []
      }
      classifiche: {
        Row: {
          aggiornato_il: string
          giocate: number
          girone: string | null
          id: string
          nome_squadra: string
          nostra_squadra: boolean
          penalita: number
          perse: number
          perse_0_3_1_3: number
          perse_2_3: number
          posizione: number
          punti: number
          punti_fatti: number
          punti_subiti: number
          quoziente_punti: number | null
          quoziente_set: number | null
          set_persi: number
          set_vinti: number
          squadra_id: string | null
          stagione_id: string
          vinte: number
          vinte_3_0_3_1: number
          vinte_3_2: number
        }
        Insert: {
          aggiornato_il?: string
          giocate?: number
          girone?: string | null
          id?: string
          nome_squadra: string
          nostra_squadra?: boolean
          penalita?: number
          perse?: number
          perse_0_3_1_3?: number
          perse_2_3?: number
          posizione: number
          punti?: number
          punti_fatti?: number
          punti_subiti?: number
          quoziente_punti?: number | null
          quoziente_set?: number | null
          set_persi?: number
          set_vinti?: number
          squadra_id?: string | null
          stagione_id: string
          vinte?: number
          vinte_3_0_3_1?: number
          vinte_3_2?: number
        }
        Update: {
          aggiornato_il?: string
          giocate?: number
          girone?: string | null
          id?: string
          nome_squadra?: string
          nostra_squadra?: boolean
          penalita?: number
          perse?: number
          perse_0_3_1_3?: number
          perse_2_3?: number
          posizione?: number
          punti?: number
          punti_fatti?: number
          punti_subiti?: number
          quoziente_punti?: number | null
          quoziente_set?: number | null
          set_persi?: number
          set_vinti?: number
          squadra_id?: string | null
          stagione_id?: string
          vinte?: number
          vinte_3_0_3_1?: number
          vinte_3_2?: number
        }
        Relationships: [
          {
            foreignKeyName: "classifiche_squadra_id_fkey"
            columns: ["squadra_id"]
            isOneToOne: false
            referencedRelation: "squadre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classifiche_stagione_id_fkey"
            columns: ["stagione_id"]
            isOneToOne: false
            referencedRelation: "stagioni"
            referencedColumns: ["id"]
          },
        ]
      }
      conoscenza: {
        Row: {
          aggiornato_il: string
          fonte_id: string | null
          id: string
          posizione: number
          ricerca: unknown
          testo: string
          titolo: string
          url_origine: string | null
        }
        Insert: {
          aggiornato_il?: string
          fonte_id?: string | null
          id?: string
          posizione?: number
          ricerca?: unknown
          testo: string
          titolo: string
          url_origine?: string | null
        }
        Update: {
          aggiornato_il?: string
          fonte_id?: string | null
          id?: string
          posizione?: number
          ricerca?: unknown
          testo?: string
          titolo?: string
          url_origine?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conoscenza_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fonti"
            referencedColumns: ["id"]
          },
        ]
      }
      consensi_utente: {
        Row: {
          concesso: boolean
          creato_il: string
          id: string
          origine: string
          provider_accesso: string | null
          tipo: Database["public"]["Enums"]["tipo_consenso"]
          utente_id: string
          versione_informativa: string
        }
        Insert: {
          concesso: boolean
          creato_il?: string
          id?: string
          origine?: string
          provider_accesso?: string | null
          tipo: Database["public"]["Enums"]["tipo_consenso"]
          utente_id: string
          versione_informativa: string
        }
        Update: {
          concesso?: boolean
          creato_il?: string
          id?: string
          origine?: string
          provider_accesso?: string | null
          tipo?: Database["public"]["Enums"]["tipo_consenso"]
          utente_id?: string
          versione_informativa?: string
        }
        Relationships: []
      }
      convenzioni: {
        Row: {
          attiva: boolean
          creato_il: string
          id: string
          nome: string
          ordine: number
          promozione: string
          url_logo: string | null
          url_sito: string | null
        }
        Insert: {
          attiva?: boolean
          creato_il?: string
          id?: string
          nome: string
          ordine?: number
          promozione: string
          url_logo?: string | null
          url_sito?: string | null
        }
        Update: {
          attiva?: boolean
          creato_il?: string
          id?: string
          nome?: string
          ordine?: number
          promozione?: string
          url_logo?: string | null
          url_sito?: string | null
        }
        Relationships: []
      }
      demo_diretta: {
        Row: {
          aggiornato_il: string
          chiave: string
          stato: Json
          versione: number
        }
        Insert: {
          aggiornato_il?: string
          chiave: string
          stato: Json
          versione: number
        }
        Update: {
          aggiornato_il?: string
          chiave?: string
          stato?: Json
          versione?: number
        }
        Relationships: []
      }
      dispositivi_push: {
        Row: {
          aggiornato_il: string
          attive: boolean
          categoria_giovanile_id: string | null
          contenuti: boolean
          creato_il: string
          fine_set: boolean
          game_day: boolean
          id: string
          inizio_partita: boolean
          piattaforma: string
          risultato_finale: boolean
          token: string
          user_id: string
          voto_mvp: boolean
        }
        Insert: {
          aggiornato_il?: string
          attive?: boolean
          categoria_giovanile_id?: string | null
          contenuti?: boolean
          creato_il?: string
          fine_set?: boolean
          game_day?: boolean
          id?: string
          inizio_partita?: boolean
          piattaforma: string
          risultato_finale?: boolean
          token: string
          user_id: string
          voto_mvp?: boolean
        }
        Update: {
          aggiornato_il?: string
          attive?: boolean
          categoria_giovanile_id?: string | null
          contenuti?: boolean
          creato_il?: string
          fine_set?: boolean
          game_day?: boolean
          id?: string
          inizio_partita?: boolean
          piattaforma?: string
          risultato_finale?: boolean
          token?: string
          user_id?: string
          voto_mvp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "dispositivi_push_categoria_giovanile_id_fkey"
            columns: ["categoria_giovanile_id"]
            isOneToOne: false
            referencedRelation: "categorie_giovanili"
            referencedColumns: ["id"]
          },
        ]
      }
      eventi_live: {
        Row: {
          creato_il: string
          descrizione: string
          fonte: string | null
          id: string
          numero_set: number
          partita_id: string
          punteggio_avversario: number
          punteggio_nostro: number
          squadra: string | null
        }
        Insert: {
          creato_il?: string
          descrizione: string
          fonte?: string | null
          id?: string
          numero_set: number
          partita_id: string
          punteggio_avversario: number
          punteggio_nostro: number
          squadra?: string | null
        }
        Update: {
          creato_il?: string
          descrizione?: string
          fonte?: string | null
          id?: string
          numero_set?: number
          partita_id?: string
          punteggio_avversario?: number
          punteggio_nostro?: number
          squadra?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventi_live_partita_id_fkey"
            columns: ["partita_id"]
            isOneToOne: false
            referencedRelation: "partite"
            referencedColumns: ["id"]
          },
        ]
      }
      faq: {
        Row: {
          aggiornato_il: string
          attiva: boolean
          categoria: string | null
          domanda: string
          id: string
          ordine: number
          ricerca: unknown
          risposta: string
        }
        Insert: {
          aggiornato_il?: string
          attiva?: boolean
          categoria?: string | null
          domanda: string
          id?: string
          ordine?: number
          ricerca?: unknown
          risposta: string
        }
        Update: {
          aggiornato_il?: string
          attiva?: boolean
          categoria?: string | null
          domanda?: string
          id?: string
          ordine?: number
          ricerca?: unknown
          risposta?: string
        }
        Relationships: []
      }
      fonti: {
        Row: {
          attiva: boolean
          created_at: string
          frequenza_ore: number
          id: string
          nome: string
          tipo: string
          ultimo_esito: string | null
          ultimo_fetch: string | null
          url: string | null
        }
        Insert: {
          attiva?: boolean
          created_at?: string
          frequenza_ore?: number
          id?: string
          nome: string
          tipo?: string
          ultimo_esito?: string | null
          ultimo_fetch?: string | null
          url?: string | null
        }
        Update: {
          attiva?: boolean
          created_at?: string
          frequenza_ore?: number
          id?: string
          nome?: string
          tipo?: string
          ultimo_esito?: string | null
          ultimo_fetch?: string | null
          url?: string | null
        }
        Relationships: []
      }
      formazioni_partita: {
        Row: {
          capitana: boolean
          creato_il: string
          giocatrice_id: string | null
          id: string
          libero: boolean
          nome: string
          numero_maglia: number | null
          ordine: number
          partita_id: string
          ruolo: Database["public"]["Enums"]["ruolo_giocatrice"] | null
          squadra: string
          zona: number | null
        }
        Insert: {
          capitana?: boolean
          creato_il?: string
          giocatrice_id?: string | null
          id?: string
          libero?: boolean
          nome: string
          numero_maglia?: number | null
          ordine?: number
          partita_id: string
          ruolo?: Database["public"]["Enums"]["ruolo_giocatrice"] | null
          squadra: string
          zona?: number | null
        }
        Update: {
          capitana?: boolean
          creato_il?: string
          giocatrice_id?: string | null
          id?: string
          libero?: boolean
          nome?: string
          numero_maglia?: number | null
          ordine?: number
          partita_id?: string
          ruolo?: Database["public"]["Enums"]["ruolo_giocatrice"] | null
          squadra?: string
          zona?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "formazioni_partita_giocatrice_id_fkey"
            columns: ["giocatrice_id"]
            isOneToOne: false
            referencedRelation: "giocatrici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formazioni_partita_giocatrice_id_fkey"
            columns: ["giocatrice_id"]
            isOneToOne: false
            referencedRelation: "giocatrici_pubbliche"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formazioni_partita_partita_id_fkey"
            columns: ["partita_id"]
            isOneToOne: false
            referencedRelation: "partite"
            referencedColumns: ["id"]
          },
        ]
      }
      foto: {
        Row: {
          album_id: string
          id: string
          ordine: number | null
          url_immagine: string
        }
        Insert: {
          album_id: string
          id?: string
          ordine?: number | null
          url_immagine: string
        }
        Update: {
          album_id?: string
          id?: string
          ordine?: number | null
          url_immagine?: string
        }
        Relationships: [
          {
            foreignKeyName: "foto_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "album_foto"
            referencedColumns: ["id"]
          },
        ]
      }
      gare_campionato_backup: {
        Row: {
          aggiornato_il: string
          campionato_id: string
          creato_il: string
          data_partita: string
          fase: string
          fonte: string | null
          giornata: number
          girone: string
          id: string
          numero_gara: number
          partita_id: string | null
          parziali: Json | null
          set_casa: number | null
          set_ospite: number | null
          squadra_casa_id: string
          squadra_ospite_id: string
          stagione_id: string | null
          stato: Database["public"]["Enums"]["stato_partita"]
          url_a3live: string | null
        }
        Insert: {
          aggiornato_il?: string
          campionato_id: string
          creato_il?: string
          data_partita: string
          fase: string
          fonte?: string | null
          giornata: number
          girone: string
          id?: string
          numero_gara: number
          partita_id?: string | null
          parziali?: Json | null
          set_casa?: number | null
          set_ospite?: number | null
          squadra_casa_id: string
          squadra_ospite_id: string
          stagione_id?: string | null
          stato?: Database["public"]["Enums"]["stato_partita"]
          url_a3live?: string | null
        }
        Update: {
          aggiornato_il?: string
          campionato_id?: string
          creato_il?: string
          data_partita?: string
          fase?: string
          fonte?: string | null
          giornata?: number
          girone?: string
          id?: string
          numero_gara?: number
          partita_id?: string | null
          parziali?: Json | null
          set_casa?: number | null
          set_ospite?: number | null
          squadra_casa_id?: string
          squadra_ospite_id?: string
          stagione_id?: string | null
          stato?: Database["public"]["Enums"]["stato_partita"]
          url_a3live?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gare_campionato_campionato_id_fkey"
            columns: ["campionato_id"]
            isOneToOne: false
            referencedRelation: "campionati"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_campionato_partita_id_fkey"
            columns: ["partita_id"]
            isOneToOne: false
            referencedRelation: "partite"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_campionato_squadra_casa_id_fkey"
            columns: ["squadra_casa_id"]
            isOneToOne: false
            referencedRelation: "squadre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_campionato_squadra_ospite_id_fkey"
            columns: ["squadra_ospite_id"]
            isOneToOne: false
            referencedRelation: "squadre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gare_campionato_stagione_id_fkey"
            columns: ["stagione_id"]
            isOneToOne: false
            referencedRelation: "stagioni"
            referencedColumns: ["id"]
          },
        ]
      }
      giocatrici: {
        Row: {
          ace: number | null
          altezza_cm: number | null
          anno_nascita: number | null
          attiva: boolean
          bio: string | null
          capitana: boolean
          categoria_giovanile_id: string | null
          cognome: string
          consenso_foto: boolean
          consenso_foto_data: string | null
          consenso_foto_note: string | null
          data_nascita: string | null
          foto_url: string | null
          id: string
          livello_squadra: Database["public"]["Enums"]["livello_squadra"]
          muri: number | null
          nome: string
          numero_maglia: number | null
          ordine: number | null
          punti: number | null
          ruolo: Database["public"]["Enums"]["ruolo_giocatrice"] | null
          squadra_id: string
          stagione_id: string
        }
        Insert: {
          ace?: number | null
          altezza_cm?: number | null
          anno_nascita?: number | null
          attiva?: boolean
          bio?: string | null
          capitana?: boolean
          categoria_giovanile_id?: string | null
          cognome: string
          consenso_foto?: boolean
          consenso_foto_data?: string | null
          consenso_foto_note?: string | null
          data_nascita?: string | null
          foto_url?: string | null
          id?: string
          livello_squadra?: Database["public"]["Enums"]["livello_squadra"]
          muri?: number | null
          nome: string
          numero_maglia?: number | null
          ordine?: number | null
          punti?: number | null
          ruolo?: Database["public"]["Enums"]["ruolo_giocatrice"] | null
          squadra_id: string
          stagione_id: string
        }
        Update: {
          ace?: number | null
          altezza_cm?: number | null
          anno_nascita?: number | null
          attiva?: boolean
          bio?: string | null
          capitana?: boolean
          categoria_giovanile_id?: string | null
          cognome?: string
          consenso_foto?: boolean
          consenso_foto_data?: string | null
          consenso_foto_note?: string | null
          data_nascita?: string | null
          foto_url?: string | null
          id?: string
          livello_squadra?: Database["public"]["Enums"]["livello_squadra"]
          muri?: number | null
          nome?: string
          numero_maglia?: number | null
          ordine?: number | null
          punti?: number | null
          ruolo?: Database["public"]["Enums"]["ruolo_giocatrice"] | null
          squadra_id?: string
          stagione_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "giocatrici_categoria_giovanile_id_fkey"
            columns: ["categoria_giovanile_id"]
            isOneToOne: false
            referencedRelation: "categorie_giovanili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giocatrici_squadra_id_fkey"
            columns: ["squadra_id"]
            isOneToOne: false
            referencedRelation: "squadre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giocatrici_stagione_id_fkey"
            columns: ["stagione_id"]
            isOneToOne: false
            referencedRelation: "stagioni"
            referencedColumns: ["id"]
          },
        ]
      }
      log_agente: {
        Row: {
          agente: string
          creato_il: string
          dettagli: Json | null
          evento: string
          id: number
          livello: string
          messaggio: string
          numero_gara: number | null
          partita_id: string | null
        }
        Insert: {
          agente: string
          creato_il?: string
          dettagli?: Json | null
          evento: string
          id?: never
          livello?: string
          messaggio: string
          numero_gara?: number | null
          partita_id?: string | null
        }
        Update: {
          agente?: string
          creato_il?: string
          dettagli?: Json | null
          evento?: string
          id?: never
          livello?: string
          messaggio?: string
          numero_gara?: number | null
          partita_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_agente_partita_id_fkey"
            columns: ["partita_id"]
            isOneToOne: false
            referencedRelation: "partite"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          etichetta_durata: string | null
          id: string
          pubblicato: boolean
          pubblicato_il: string
          riferimento_esterno: string
          tipo: Database["public"]["Enums"]["tipo_media"]
          titolo: string
          url_immagine_copertina: string | null
        }
        Insert: {
          etichetta_durata?: string | null
          id?: string
          pubblicato?: boolean
          pubblicato_il?: string
          riferimento_esterno: string
          tipo: Database["public"]["Enums"]["tipo_media"]
          titolo: string
          url_immagine_copertina?: string | null
        }
        Update: {
          etichetta_durata?: string | null
          id?: string
          pubblicato?: boolean
          pubblicato_il?: string
          riferimento_esterno?: string
          tipo?: Database["public"]["Enums"]["tipo_media"]
          titolo?: string
          url_immagine_copertina?: string | null
        }
        Relationships: []
      }
      notifiche_inviate: {
        Row: {
          chiave: string
          destinatari: number | null
          id: string
          inviata_il: string
          riferimento_id: string | null
          tipo: string
        }
        Insert: {
          chiave: string
          destinatari?: number | null
          id?: string
          inviata_il?: string
          riferimento_id?: string | null
          tipo: string
        }
        Update: {
          chiave?: string
          destinatari?: number | null
          id?: string
          inviata_il?: string
          riferimento_id?: string | null
          tipo?: string
        }
        Relationships: []
      }
      notizie: {
        Row: {
          autore: string | null
          categoria: Database["public"]["Enums"]["categoria_notizia"]
          corpo: string | null
          fonte: string | null
          id: string
          pubblicata: boolean
          pubblicato_il: string
          titolo: string
          url_immagine_copertina: string | null
        }
        Insert: {
          autore?: string | null
          categoria?: Database["public"]["Enums"]["categoria_notizia"]
          corpo?: string | null
          fonte?: string | null
          id?: string
          pubblicata?: boolean
          pubblicato_il?: string
          titolo: string
          url_immagine_copertina?: string | null
        }
        Update: {
          autore?: string | null
          categoria?: Database["public"]["Enums"]["categoria_notizia"]
          corpo?: string | null
          fonte?: string | null
          id?: string
          pubblicata?: boolean
          pubblicato_il?: string
          titolo?: string
          url_immagine_copertina?: string | null
        }
        Relationships: []
      }
      partite: {
        Row: {
          aggiornato_il: string
          avversario: string | null
          campionato_id: string | null
          casa_trasferta: Database["public"]["Enums"]["casa_trasferta"] | null
          categoria_giovanile_id: string | null
          creato_il: string
          data_partita: string
          fase: string | null
          giornata: number | null
          girone: string | null
          id: string
          id_video_youtube_live: string | null
          letto_a3live_il: string | null
          livello_squadra: Database["public"]["Enums"]["livello_squadra"]
          logo_avversario_url: string | null
          logo_smapiuarenavolley_url: string | null
          nostra_partita: boolean
          nostri_set_vinti: number | null
          numero_gara: number | null
          opponent_logo_url: string | null
          parziali: Json | null
          rinuncia: string | null
          sede: string | null
          set_casa: number | null
          set_ospite: number | null
          set_vinti_avversario: number | null
          squadra_avversaria_id: string | null
          squadra_casa_id: string | null
          squadra_ospite_id: string | null
          stagione_id: string
          stato: Database["public"]["Enums"]["stato_partita"]
          stato_a3live: string | null
          url_a3live: string | null
        }
        Insert: {
          aggiornato_il?: string
          avversario?: string | null
          campionato_id?: string | null
          casa_trasferta?: Database["public"]["Enums"]["casa_trasferta"] | null
          categoria_giovanile_id?: string | null
          creato_il?: string
          data_partita: string
          fase?: string | null
          giornata?: number | null
          girone?: string | null
          id?: string
          id_video_youtube_live?: string | null
          letto_a3live_il?: string | null
          livello_squadra?: Database["public"]["Enums"]["livello_squadra"]
          logo_avversario_url?: string | null
          logo_smapiuarenavolley_url?: string | null
          nostra_partita?: boolean
          nostri_set_vinti?: number | null
          numero_gara?: number | null
          opponent_logo_url?: string | null
          parziali?: Json | null
          rinuncia?: string | null
          sede?: string | null
          set_casa?: number | null
          set_ospite?: number | null
          set_vinti_avversario?: number | null
          squadra_avversaria_id?: string | null
          squadra_casa_id?: string | null
          squadra_ospite_id?: string | null
          stagione_id: string
          stato?: Database["public"]["Enums"]["stato_partita"]
          stato_a3live?: string | null
          url_a3live?: string | null
        }
        Update: {
          aggiornato_il?: string
          avversario?: string | null
          campionato_id?: string | null
          casa_trasferta?: Database["public"]["Enums"]["casa_trasferta"] | null
          categoria_giovanile_id?: string | null
          creato_il?: string
          data_partita?: string
          fase?: string | null
          giornata?: number | null
          girone?: string | null
          id?: string
          id_video_youtube_live?: string | null
          letto_a3live_il?: string | null
          livello_squadra?: Database["public"]["Enums"]["livello_squadra"]
          logo_avversario_url?: string | null
          logo_smapiuarenavolley_url?: string | null
          nostra_partita?: boolean
          nostri_set_vinti?: number | null
          numero_gara?: number | null
          opponent_logo_url?: string | null
          parziali?: Json | null
          rinuncia?: string | null
          sede?: string | null
          set_casa?: number | null
          set_ospite?: number | null
          set_vinti_avversario?: number | null
          squadra_avversaria_id?: string | null
          squadra_casa_id?: string | null
          squadra_ospite_id?: string | null
          stagione_id?: string
          stato?: Database["public"]["Enums"]["stato_partita"]
          stato_a3live?: string | null
          url_a3live?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partite_campionato_id_fkey"
            columns: ["campionato_id"]
            isOneToOne: false
            referencedRelation: "campionati"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partite_categoria_giovanile_id_fkey"
            columns: ["categoria_giovanile_id"]
            isOneToOne: false
            referencedRelation: "categorie_giovanili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partite_squadra_avversaria_id_fkey"
            columns: ["squadra_avversaria_id"]
            isOneToOne: false
            referencedRelation: "squadre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partite_squadra_casa_id_fkey"
            columns: ["squadra_casa_id"]
            isOneToOne: false
            referencedRelation: "squadre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partite_squadra_ospite_id_fkey"
            columns: ["squadra_ospite_id"]
            isOneToOne: false
            referencedRelation: "squadre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partite_stagione_id_fkey"
            columns: ["stagione_id"]
            isOneToOne: false
            referencedRelation: "stagioni"
            referencedColumns: ["id"]
          },
        ]
      }
      penalita_squadra: {
        Row: {
          creato_il: string
          data: string
          girone: string
          id: string
          motivo: string | null
          punti: number
          squadra_id: string
          stagione_id: string
        }
        Insert: {
          creato_il?: string
          data?: string
          girone: string
          id?: string
          motivo?: string | null
          punti: number
          squadra_id: string
          stagione_id: string
        }
        Update: {
          creato_il?: string
          data?: string
          girone?: string
          id?: string
          motivo?: string | null
          punti?: number
          squadra_id?: string
          stagione_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalita_squadra_squadra_id_fkey"
            columns: ["squadra_id"]
            isOneToOne: false
            referencedRelation: "squadre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalita_squadra_stagione_id_fkey"
            columns: ["stagione_id"]
            isOneToOne: false
            referencedRelation: "stagioni"
            referencedColumns: ["id"]
          },
        ]
      }
      profili: {
        Row: {
          categoria_giovanile_id: string | null
          creato_il: string
          id: string
          nome_completo: string | null
          ruolo: Database["public"]["Enums"]["ruolo_utente"]
        }
        Insert: {
          categoria_giovanile_id?: string | null
          creato_il?: string
          id: string
          nome_completo?: string | null
          ruolo?: Database["public"]["Enums"]["ruolo_utente"]
        }
        Update: {
          categoria_giovanile_id?: string | null
          creato_il?: string
          id?: string
          nome_completo?: string | null
          ruolo?: Database["public"]["Enums"]["ruolo_utente"]
        }
        Relationships: [
          {
            foreignKeyName: "profili_categoria_giovanile_fk"
            columns: ["categoria_giovanile_id"]
            isOneToOne: false
            referencedRelation: "categorie_giovanili"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_sponsor: {
        Row: {
          attiva: boolean
          attiva_al: string | null
          attiva_dal: string | null
          id: string
          sponsor_id: string
          titolo: string
          url_immagine: string | null
          url_video: string | null
        }
        Insert: {
          attiva?: boolean
          attiva_al?: string | null
          attiva_dal?: string | null
          id?: string
          sponsor_id: string
          titolo: string
          url_immagine?: string | null
          url_video?: string | null
        }
        Update: {
          attiva?: boolean
          attiva_al?: string | null
          attiva_dal?: string | null
          id?: string
          sponsor_id?: string
          titolo?: string
          url_immagine?: string | null
          url_video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_sponsor_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor"
            referencedColumns: ["id"]
          },
        ]
      }
      pubblicita: {
        Row: {
          attiva: boolean
          creato_il: string
          etichetta_link: string | null
          frequenza_minuti: number
          id: string
          ordine: number
          sottotitolo: string | null
          testo: string | null
          titolo: string
          url_immagine: string | null
          url_link: string | null
        }
        Insert: {
          attiva?: boolean
          creato_il?: string
          etichetta_link?: string | null
          frequenza_minuti?: number
          id?: string
          ordine?: number
          sottotitolo?: string | null
          testo?: string | null
          titolo: string
          url_immagine?: string | null
          url_link?: string | null
        }
        Update: {
          attiva?: boolean
          creato_il?: string
          etichetta_link?: string | null
          frequenza_minuti?: number
          id?: string
          ordine?: number
          sottotitolo?: string | null
          testo?: string | null
          titolo?: string
          url_immagine?: string | null
          url_link?: string | null
        }
        Relationships: []
      }
      push_token: {
        Row: {
          aggiornato_il: string
          attivo: boolean
          categoria_giovanile_id: string | null
          contenuti: boolean
          creato_il: string
          fine_set: boolean
          game_day: boolean
          id: string
          inizio_partita: boolean
          notifiche_attive: boolean
          piattaforma: string | null
          risultato_finale: boolean
          token: string
          utente_id: string | null
          voto_mvp: boolean
        }
        Insert: {
          aggiornato_il?: string
          attivo?: boolean
          categoria_giovanile_id?: string | null
          contenuti?: boolean
          creato_il?: string
          fine_set?: boolean
          game_day?: boolean
          id?: string
          inizio_partita?: boolean
          notifiche_attive?: boolean
          piattaforma?: string | null
          risultato_finale?: boolean
          token: string
          utente_id?: string | null
          voto_mvp?: boolean
        }
        Update: {
          aggiornato_il?: string
          attivo?: boolean
          categoria_giovanile_id?: string | null
          contenuti?: boolean
          creato_il?: string
          fine_set?: boolean
          game_day?: boolean
          id?: string
          inizio_partita?: boolean
          notifiche_attive?: boolean
          piattaforma?: string | null
          risultato_finale?: boolean
          token?: string
          utente_id?: string | null
          voto_mvp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "push_token_categoria_giovanile_id_fkey"
            columns: ["categoria_giovanile_id"]
            isOneToOne: false
            referencedRelation: "categorie_giovanili"
            referencedColumns: ["id"]
          },
        ]
      }
      regole_classifica: {
        Row: {
          aggiornato_il: string
          criteri_parita: string[]
          penalita_rinuncia: number
          punti_sconfitta_tiebreak: number
          punti_vittoria: number
          punti_vittoria_tiebreak: number
          stagione_id: string
        }
        Insert: {
          aggiornato_il?: string
          criteri_parita?: string[]
          penalita_rinuncia?: number
          punti_sconfitta_tiebreak?: number
          punti_vittoria?: number
          punti_vittoria_tiebreak?: number
          stagione_id: string
        }
        Update: {
          aggiornato_il?: string
          criteri_parita?: string[]
          penalita_rinuncia?: number
          punti_sconfitta_tiebreak?: number
          punti_vittoria?: number
          punti_vittoria_tiebreak?: number
          stagione_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regole_classifica_stagione_id_fkey"
            columns: ["stagione_id"]
            isOneToOne: true
            referencedRelation: "stagioni"
            referencedColumns: ["id"]
          },
        ]
      }
      set_partita: {
        Row: {
          completato: boolean
          id: string
          numero_set: number
          partita_id: string
          primo_servizio: string | null
          punti_avversario: number
          punti_nostri: number
        }
        Insert: {
          completato?: boolean
          id?: string
          numero_set: number
          partita_id: string
          primo_servizio?: string | null
          punti_avversario?: number
          punti_nostri?: number
        }
        Update: {
          completato?: boolean
          id?: string
          numero_set?: number
          partita_id?: string
          primo_servizio?: string | null
          punti_avversario?: number
          punti_nostri?: number
        }
        Relationships: [
          {
            foreignKeyName: "set_partita_partita_id_fkey"
            columns: ["partita_id"]
            isOneToOne: false
            referencedRelation: "partite"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor: {
        Row: {
          attivo: boolean
          id: string
          livello: Database["public"]["Enums"]["livello_sponsor"]
          nome: string
          ordine: number | null
          url_logo: string | null
          url_sito: string | null
        }
        Insert: {
          attivo?: boolean
          id?: string
          livello?: Database["public"]["Enums"]["livello_sponsor"]
          nome: string
          ordine?: number | null
          url_logo?: string | null
          url_sito?: string | null
        }
        Update: {
          attivo?: boolean
          id?: string
          livello?: Database["public"]["Enums"]["livello_sponsor"]
          nome?: string
          ordine?: number | null
          url_logo?: string | null
          url_sito?: string | null
        }
        Relationships: []
      }
      squadre: {
        Row: {
          allenatore: string | null
          campionato_id: string | null
          citta: string | null
          creato_il: string
          girone: string | null
          id: string
          logo_url: string | null
          nome: string
          nostra_squadra: boolean
          provincia: string | null
        }
        Insert: {
          allenatore?: string | null
          campionato_id?: string | null
          citta?: string | null
          creato_il?: string
          girone?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          nostra_squadra?: boolean
          provincia?: string | null
        }
        Update: {
          allenatore?: string | null
          campionato_id?: string | null
          citta?: string | null
          creato_il?: string
          girone?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          nostra_squadra?: boolean
          provincia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squadre_campionato_id_fkey"
            columns: ["campionato_id"]
            isOneToOne: false
            referencedRelation: "campionati"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          attivo: boolean
          bio: string | null
          categoria_giovanile_id: string | null
          cognome: string
          foto_url: string | null
          id: string
          nome: string
          ordine: number | null
          qualifica: string | null
          ruolo: Database["public"]["Enums"]["ruolo_staff"]
        }
        Insert: {
          attivo?: boolean
          bio?: string | null
          categoria_giovanile_id?: string | null
          cognome: string
          foto_url?: string | null
          id?: string
          nome: string
          ordine?: number | null
          qualifica?: string | null
          ruolo: Database["public"]["Enums"]["ruolo_staff"]
        }
        Update: {
          attivo?: boolean
          bio?: string | null
          categoria_giovanile_id?: string | null
          cognome?: string
          foto_url?: string | null
          id?: string
          nome?: string
          ordine?: number | null
          qualifica?: string | null
          ruolo?: Database["public"]["Enums"]["ruolo_staff"]
        }
        Relationships: [
          {
            foreignKeyName: "staff_categoria_giovanile_id_fkey"
            columns: ["categoria_giovanile_id"]
            isOneToOne: false
            referencedRelation: "categorie_giovanili"
            referencedColumns: ["id"]
          },
        ]
      }
      stagioni: {
        Row: {
          corrente: boolean
          etichetta: string
          id: string
        }
        Insert: {
          corrente?: boolean
          etichetta: string
          id?: string
        }
        Update: {
          corrente?: boolean
          etichetta?: string
          id?: string
        }
        Relationships: []
      }
      statistiche_attacco: {
        Row: {
          aggiornato_il: string
          derivato: boolean
          errori: number
          giocatrice_id: string | null
          id: string
          murati: number
          nome: string
          numero_maglia: number
          numero_set: number
          partita_id: string
          punti: number
          squadra: string
          tabellino_id: string | null
          tentativi: number
        }
        Insert: {
          aggiornato_il?: string
          derivato?: boolean
          errori?: number
          giocatrice_id?: string | null
          id?: string
          murati?: number
          nome?: string
          numero_maglia: number
          numero_set: number
          partita_id: string
          punti?: number
          squadra: string
          tabellino_id?: string | null
          tentativi?: number
        }
        Update: {
          aggiornato_il?: string
          derivato?: boolean
          errori?: number
          giocatrice_id?: string | null
          id?: string
          murati?: number
          nome?: string
          numero_maglia?: number
          numero_set?: number
          partita_id?: string
          punti?: number
          squadra?: string
          tabellino_id?: string | null
          tentativi?: number
        }
        Relationships: [
          {
            foreignKeyName: "statistiche_attacco_giocatrice_id_fkey"
            columns: ["giocatrice_id"]
            isOneToOne: false
            referencedRelation: "giocatrici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statistiche_attacco_giocatrice_id_fkey"
            columns: ["giocatrice_id"]
            isOneToOne: false
            referencedRelation: "giocatrici_pubbliche"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statistiche_attacco_partita_id_fkey"
            columns: ["partita_id"]
            isOneToOne: false
            referencedRelation: "partite"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statistiche_attacco_tabellino_id_fkey"
            columns: ["tabellino_id"]
            isOneToOne: false
            referencedRelation: "tabellini"
            referencedColumns: ["id"]
          },
        ]
      }
      tabellini: {
        Row: {
          caricato_da: string | null
          confermato_il: string | null
          creato_il: string
          errore: string | null
          id: string
          json_letto: Json | null
          note: string | null
          numero_set: number | null
          partita_id: string
          percorso_immagine: string
          stato: string
        }
        Insert: {
          caricato_da?: string | null
          confermato_il?: string | null
          creato_il?: string
          errore?: string | null
          id?: string
          json_letto?: Json | null
          note?: string | null
          numero_set?: number | null
          partita_id: string
          percorso_immagine: string
          stato?: string
        }
        Update: {
          caricato_da?: string | null
          confermato_il?: string | null
          creato_il?: string
          errore?: string | null
          id?: string
          json_letto?: Json | null
          note?: string | null
          numero_set?: number | null
          partita_id?: string
          percorso_immagine?: string
          stato?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabellini_partita_id_fkey"
            columns: ["partita_id"]
            isOneToOne: false
            referencedRelation: "partite"
            referencedColumns: ["id"]
          },
        ]
      }
      uso_assistente: {
        Row: {
          domande: number
          giorno: string
          utente_id: string
        }
        Insert: {
          domande?: number
          giorno?: string
          utente_id: string
        }
        Update: {
          domande?: number
          giorno?: string
          utente_id?: string
        }
        Relationships: []
      }
      voti_mvp: {
        Row: {
          aggiornato_il: string
          creato_il: string
          giocatrice_id: string
          id: string
          partita_id: string
          utente_id: string
        }
        Insert: {
          aggiornato_il?: string
          creato_il?: string
          giocatrice_id: string
          id?: string
          partita_id: string
          utente_id?: string
        }
        Update: {
          aggiornato_il?: string
          creato_il?: string
          giocatrice_id?: string
          id?: string
          partita_id?: string
          utente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voti_mvp_giocatrice_id_fkey"
            columns: ["giocatrice_id"]
            isOneToOne: false
            referencedRelation: "giocatrici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voti_mvp_giocatrice_id_fkey"
            columns: ["giocatrice_id"]
            isOneToOne: false
            referencedRelation: "giocatrici_pubbliche"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voti_mvp_partita_id_fkey"
            columns: ["partita_id"]
            isOneToOne: false
            referencedRelation: "partite"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      attacco_giocatrici_partita: {
        Row: {
          errori: number | null
          giocatrice_id: string | null
          murati: number | null
          nome: string | null
          numero_maglia: number | null
          partita_id: string | null
          pt_perc: number | null
          punti: number | null
          squadra: string | null
          tentativi: number | null
        }
        Relationships: [
          {
            foreignKeyName: "statistiche_attacco_partita_id_fkey"
            columns: ["partita_id"]
            isOneToOne: false
            referencedRelation: "partite"
            referencedColumns: ["id"]
          },
        ]
      }
      consensi_utente_attuali: {
        Row: {
          concesso: boolean | null
          creato_il: string | null
          origine: string | null
          provider_accesso: string | null
          tipo: Database["public"]["Enums"]["tipo_consenso"] | null
          utente_id: string | null
          versione_informativa: string | null
        }
        Relationships: []
      }
      giocatrici_pubbliche: {
        Row: {
          ace: number | null
          altezza_cm: number | null
          anno_nascita: number | null
          attiva: boolean | null
          bio: string | null
          capitana: boolean | null
          categoria_giovanile_id: string | null
          cognome: string | null
          consenso_foto: boolean | null
          data_nascita: string | null
          foto_url: string | null
          id: string | null
          livello_squadra: Database["public"]["Enums"]["livello_squadra"] | null
          muri: number | null
          nome: string | null
          nostra_squadra: boolean | null
          numero_maglia: number | null
          ordine: number | null
          punti: number | null
          ruolo: Database["public"]["Enums"]["ruolo_giocatrice"] | null
          squadra_id: string | null
          stagione_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "giocatrici_categoria_giovanile_id_fkey"
            columns: ["categoria_giovanile_id"]
            isOneToOne: false
            referencedRelation: "categorie_giovanili"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giocatrici_squadra_id_fkey"
            columns: ["squadra_id"]
            isOneToOne: false
            referencedRelation: "squadre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giocatrici_stagione_id_fkey"
            columns: ["stagione_id"]
            isOneToOne: false
            referencedRelation: "stagioni"
            referencedColumns: ["id"]
          },
        ]
      }
      punti_giocatrici_partita: {
        Row: {
          ace: number | null
          attacchi: number | null
          giocatrice_id: string | null
          muri: number | null
          nome_giocatrice: string | null
          partita_id: string | null
          punti: number | null
        }
        Relationships: [
          {
            foreignKeyName: "azioni_punto_giocatrice_id_fkey"
            columns: ["giocatrice_id"]
            isOneToOne: false
            referencedRelation: "giocatrici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azioni_punto_giocatrice_id_fkey"
            columns: ["giocatrice_id"]
            isOneToOne: false
            referencedRelation: "giocatrici_pubbliche"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azioni_punto_partita_id_fkey"
            columns: ["partita_id"]
            isOneToOne: false
            referencedRelation: "partite"
            referencedColumns: ["id"]
          },
        ]
      }
      stato_agenti: {
        Row: {
          agente: string | null
          ultimo_evento: string | null
          ultimo_livello: string | null
          ultimo_messaggio: string | null
          ultimo_segnale: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aggiorna_classifica: {
        Args: { p_girone: string; p_stagione: string }
        Returns: undefined
      }
      applica_azione_giocatrice: {
        Args: {
          r: Database["public"]["Tables"]["azioni_punto"]["Row"]
          segno: number
        }
        Returns: undefined
      }
      attiva_partite_live: { Args: never; Returns: number }
      calcola_classifica: {
        Args: { p_girone: string; p_stagione: string }
        Returns: {
          giocate: number
          nome_squadra: string
          nostra_squadra: boolean
          penalita: number
          perse: number
          perse_0_3_1_3: number
          perse_2_3: number
          posizione: number
          punti: number
          punti_fatti: number
          punti_subiti: number
          quoziente_punti: number
          quoziente_set: number
          set_persi: number
          set_vinti: number
          squadra_id: string
          vinte: number
          vinte_3_0_3_1: number
          vinte_3_2: number
        }[]
      }
      cerca_conoscenza: {
        Args: { limite?: number; query: string }
        Returns: {
          rank: number
          testo: string
          tipo: string
          titolo: string
          url_origine: string
        }[]
      }
      conferma_tabellino: {
        Args: { p_dati: Json; p_tabellino: string }
        Returns: Json
      }
      consuma_domanda_assistente: { Args: { limite: number }; Returns: boolean }
      e_admin: { Args: never; Returns: boolean }
      e_staff: { Args: never; Returns: boolean }
      giocatrice_da_maglia: {
        Args: { p_numero: number; p_partita: string; p_squadra: string }
        Returns: string
      }
      imposta_ruolo_utente: {
        Args: {
          p_ruolo: Database["public"]["Enums"]["ruolo_utente"]
          p_utente: string
        }
        Returns: undefined
      }
      invia_notifica_push: {
        Args: { p_id: string; p_tipo: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      libera_dispositivo_push: { Args: { p_token: string }; Returns: undefined }
      notifica_game_day: { Args: never; Returns: number }
      notifica_prepartite: { Args: never; Returns: number }
      partite_lette_agente: {
        Args: { giorni?: number }
        Returns: {
          partita_id: string
          ultimo_aggiornamento: string
        }[]
      }
      preferenze_push_token: {
        Args: {
          p_attive: boolean
          p_contenuti: boolean
          p_finale: boolean
          p_game_day?: boolean
          p_inizio: boolean
          p_mvp?: boolean
          p_set: boolean
          p_token: string
        }
        Returns: undefined
      }
      punteggi_agente: {
        Args: { p_minuti?: number }
        Returns: {
          aggiornato_il: string
          casa: string
          nostra: boolean
          numero_gara: number
          ospite: string
          partita_id: string
          parziali: Json
          set_casa: number
          set_ospite: number
          stato: string
          testo: string
        }[]
      }
      registra_push_token: {
        Args: {
          p_categoria_giovanile_id?: string
          p_piattaforma?: string
          p_token: string
        }
        Returns: undefined
      }
      ricalcola_attacco_da_finale: {
        Args: { p_finale: string }
        Returns: string[]
      }
      set_valido: {
        Args: { p_casa: number; p_numero: number; p_ospite: number }
        Returns: boolean
      }
      tabellone_testo: { Args: { t: Json }; Returns: string }
      utente_da_identita: {
        Args: { p_provider: string; p_provider_id: string }
        Returns: string
      }
      voti_mvp_partita: {
        Args: { p_partita: string }
        Returns: {
          giocatrice_id: string
          voti: number
        }[]
      }
      voto_mvp_valido: {
        Args: { p_giocatrice: string; p_partita: string }
        Returns: boolean
      }
    }
    Enums: {
      casa_trasferta: "casa" | "trasferta"
      categoria_notizia: "societa" | "prima_squadra" | "giovanili" | "sponsor"
      livello_sponsor:
        | "gold"
        | "silver"
        | "bronze"
        | "title sponsor"
        | "main sponsor"
        | "charity partner"
        | "sponsor"
      livello_squadra:
        | "prima_squadra"
        | "under12"
        | "under14"
        | "under16"
        | "under18"
        | "serie_b2"
        | "serie_d"
      ruolo_giocatrice:
        | "palleggiatrice"
        | "schiacciatrice"
        | "centrale"
        | "opposto"
        | "libero"
      ruolo_staff:
        | "allenatore"
        | "allenatore_giovanili"
        | "dirigente"
        | "staff_sanitario"
      ruolo_utente: "pubblico" | "genitore" | "staff" | "admin"
      stato_partita: "programmata" | "live" | "conclusa" | "rinviata"
      tipo_consenso:
        | "informativa_privacy"
        | "eta_14_anni"
        | "marketing"
        | "assistente_ai"
      tipo_media: "video" | "podcast"
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
      casa_trasferta: ["casa", "trasferta"],
      categoria_notizia: ["societa", "prima_squadra", "giovanili", "sponsor"],
      livello_sponsor: [
        "gold",
        "silver",
        "bronze",
        "title sponsor",
        "main sponsor",
        "charity partner",
        "sponsor",
      ],
      livello_squadra: [
        "prima_squadra",
        "under12",
        "under14",
        "under16",
        "under18",
        "serie_b2",
        "serie_d",
      ],
      ruolo_giocatrice: [
        "palleggiatrice",
        "schiacciatrice",
        "centrale",
        "opposto",
        "libero",
      ],
      ruolo_staff: [
        "allenatore",
        "allenatore_giovanili",
        "dirigente",
        "staff_sanitario",
      ],
      ruolo_utente: ["pubblico", "genitore", "staff", "admin"],
      stato_partita: ["programmata", "live", "conclusa", "rinviata"],
      tipo_consenso: [
        "informativa_privacy",
        "eta_14_anni",
        "marketing",
        "assistente_ai",
      ],
      tipo_media: ["video", "podcast"],
    },
  },
} as const
