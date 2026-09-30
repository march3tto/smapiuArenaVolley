export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed';
export type HomeAway = 'casa' | 'trasferta';
export type PlayerRole =
  | 'palleggiatrice'
  | 'schiacciatrice'
  | 'centrale'
  | 'opposto'
  | 'libero';

export interface Match {
  id: string;
  season_id: string;
  team_level: string;
  opponent_name: string;
  home_away: HomeAway;
  venue: string | null;
  match_date: string;
  girone: string | null;
  status: MatchStatus;
  our_sets_won: number | null;
  opponent_sets_won: number | null;
  youtube_live_id: string | null;
}

export interface Player {
  id: string;
  season_id: string;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  role: PlayerRole | null;
  photo_url: string | null;
  is_active: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  body: string | null;
  cover_image_url: string | null;
  published_at: string;
  is_published: boolean;
}

export interface YouthCategory {
  id: string;
  name: string;
  coach_name: string | null;
}

export interface MediaItem {
  id: string;
  type: 'video' | 'podcast';
  title: string;
  external_ref: string;
  cover_image_url: string | null;
  duration_label: string | null;
}

export interface LiveEvent {
  id: string;
  match_id: string;
  set_number: number;
  our_score: number;
  opponent_score: number;
  description: string;
  created_at: string;
}
