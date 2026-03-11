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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          boost_expires_at: string | null
          checked_in_at: string
          id: string
          is_active: boolean
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          user_id: string
          venue_id: string
          verified_at: string | null
        }
        Insert: {
          boost_expires_at?: string | null
          checked_in_at?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          user_id: string
          venue_id: string
          verified_at?: string | null
        }
        Update: {
          boost_expires_at?: string | null
          checked_in_at?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          user_id?: string
          venue_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      city_scores: {
        Row: {
          active_users: number
          city: string
          id: string
          total_sp: number
          updated_at: string
          week_start: string
        }
        Insert: {
          active_users?: number
          city: string
          id?: string
          total_sp?: number
          updated_at?: string
          week_start?: string
        }
        Update: {
          active_users?: number
          city?: string
          id?: string
          total_sp?: number
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          boosted_until: string | null
          created_at: string
          id: string
          status: string
          super_interest: boolean
          target_id: string
          user_id: string
        }
        Insert: {
          boosted_until?: string | null
          created_at?: string
          id?: string
          status?: string
          super_interest?: boolean
          target_id: string
          user_id: string
        }
        Update: {
          boosted_until?: string | null
          created_at?: string
          id?: string
          status?: string
          super_interest?: boolean
          target_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      day_score_events: {
        Row: {
          city: string
          city_id: string | null
          created_at: string
          event_type: string
          id: string
          points: number
          source_id: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          city?: string
          city_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          points?: number
          source_id?: string | null
          user_id: string
          week_start?: string
        }
        Update: {
          city?: string
          city_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          points?: number
          source_id?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_score_events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendees: number | null
          created_at: string
          description: string | null
          event_date: string
          event_time: string
          id: string
          image_url: string | null
          name: string
          price: string | null
          tags: string[] | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          attendees?: number | null
          created_at?: string
          description?: string | null
          event_date: string
          event_time: string
          id?: string
          image_url?: string | null
          name: string
          price?: string | null
          tags?: string[] | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          attendees?: number | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_time?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: string | null
          tags?: string[] | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      leaderboard_rewards: {
        Row: {
          awarded_at: string
          badge_icon: string
          badge_name: string
          bonus_sp: number
          id: string
          rank: number
          user_id: string
          week_start: string
        }
        Insert: {
          awarded_at?: string
          badge_icon: string
          badge_name: string
          bonus_sp: number
          id?: string
          rank: number
          user_id: string
          week_start: string
        }
        Update: {
          awarded_at?: string
          badge_icon?: string
          badge_name?: string
          bonus_sp?: number
          id?: string
          rank?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          is_super_like: boolean
          liked_id: string
          liker_id: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_super_like?: boolean
          liked_id: string
          liker_id: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_super_like?: boolean
          liked_id?: string
          liker_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_liked_id_fkey"
            columns: ["liked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "likes_liker_id_fkey"
            columns: ["liker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "likes_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          media_type: string | null
          media_url: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          mission_type: string
          target_count: number
          title: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          mission_type?: string
          target_count?: number
          title: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          mission_type?: string
          target_count?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      night_stories: {
        Row: {
          content: string | null
          created_at: string
          expires_at: string | null
          id: string
          image_url: string | null
          is_hidden: boolean
          likes_count: number | null
          report_count: number
          stickers: Json | null
          text_overlay: string | null
          user_id: string
          venue_id: string | null
          vibe_rating: number | null
          views_count: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          likes_count?: number | null
          report_count?: number
          stickers?: Json | null
          text_overlay?: string | null
          user_id: string
          venue_id?: string | null
          vibe_rating?: number | null
          views_count?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          likes_count?: number | null
          report_count?: number
          stickers?: Json | null
          text_overlay?: string | null
          user_id?: string
          venue_id?: string | null
          vibe_rating?: number | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "night_stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "night_stories_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_photos: {
        Row: {
          created_at: string
          display_order: number
          id: string
          photo_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          photo_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          photo_url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          checkin_streak: number | null
          city_changed_at: string | null
          city_id: string | null
          city_percentile: number | null
          city_rank: number | null
          created_at: string
          daily_sp_earned: number
          daily_sp_reset_at: string | null
          daily_super_interests: number
          daily_swipes: number
          day_score: number
          display_name: string | null
          district_rank: number | null
          gender: string | null
          global_rank: number | null
          guide_complete: boolean | null
          id: string
          instagram_url: string | null
          interested_in: string | null
          interests: string[] | null
          is_ghost_mode: boolean | null
          is_premium: boolean | null
          last_active_at: string | null
          last_story_date: string | null
          level: number | null
          location: string | null
          momentum_badge_until: string | null
          night_activity_score: number | null
          night_sp: number
          occupation: string | null
          onboarding_complete: boolean | null
          preferred_mode: string
          premium_expires_at: string | null
          prev_weekly_rank: number | null
          prev_weekly_sp: number
          privacy_hide_checkins: boolean | null
          privacy_hide_visitors: boolean | null
          privacy_online_visible: boolean | null
          privacy_read_receipts: boolean | null
          privacy_who_can_message: string | null
          selected_badge: string | null
          social_power: number
          sp_level: number
          stories_posted_today: number
          story_ban_until: string | null
          streak_days: number
          subscription_tier: string
          swipe_reset_at: string | null
          tonight_vibe: string | null
          total_checkins: number | null
          updated_at: string
          user_id: string
          username: string | null
          violation_count: number
          weekly_rank: number | null
          weekly_sp: number
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          checkin_streak?: number | null
          city_changed_at?: string | null
          city_id?: string | null
          city_percentile?: number | null
          city_rank?: number | null
          created_at?: string
          daily_sp_earned?: number
          daily_sp_reset_at?: string | null
          daily_super_interests?: number
          daily_swipes?: number
          day_score?: number
          display_name?: string | null
          district_rank?: number | null
          gender?: string | null
          global_rank?: number | null
          guide_complete?: boolean | null
          id?: string
          instagram_url?: string | null
          interested_in?: string | null
          interests?: string[] | null
          is_ghost_mode?: boolean | null
          is_premium?: boolean | null
          last_active_at?: string | null
          last_story_date?: string | null
          level?: number | null
          location?: string | null
          momentum_badge_until?: string | null
          night_activity_score?: number | null
          night_sp?: number
          occupation?: string | null
          onboarding_complete?: boolean | null
          preferred_mode?: string
          premium_expires_at?: string | null
          prev_weekly_rank?: number | null
          prev_weekly_sp?: number
          privacy_hide_checkins?: boolean | null
          privacy_hide_visitors?: boolean | null
          privacy_online_visible?: boolean | null
          privacy_read_receipts?: boolean | null
          privacy_who_can_message?: string | null
          selected_badge?: string | null
          social_power?: number
          sp_level?: number
          stories_posted_today?: number
          story_ban_until?: string | null
          streak_days?: number
          subscription_tier?: string
          swipe_reset_at?: string | null
          tonight_vibe?: string | null
          total_checkins?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
          violation_count?: number
          weekly_rank?: number | null
          weekly_sp?: number
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          checkin_streak?: number | null
          city_changed_at?: string | null
          city_id?: string | null
          city_percentile?: number | null
          city_rank?: number | null
          created_at?: string
          daily_sp_earned?: number
          daily_sp_reset_at?: string | null
          daily_super_interests?: number
          daily_swipes?: number
          day_score?: number
          display_name?: string | null
          district_rank?: number | null
          gender?: string | null
          global_rank?: number | null
          guide_complete?: boolean | null
          id?: string
          instagram_url?: string | null
          interested_in?: string | null
          interests?: string[] | null
          is_ghost_mode?: boolean | null
          is_premium?: boolean | null
          last_active_at?: string | null
          last_story_date?: string | null
          level?: number | null
          location?: string | null
          momentum_badge_until?: string | null
          night_activity_score?: number | null
          night_sp?: number
          occupation?: string | null
          onboarding_complete?: boolean | null
          preferred_mode?: string
          premium_expires_at?: string | null
          prev_weekly_rank?: number | null
          prev_weekly_sp?: number
          privacy_hide_checkins?: boolean | null
          privacy_hide_visitors?: boolean | null
          privacy_online_visible?: boolean | null
          privacy_read_receipts?: boolean | null
          privacy_who_can_message?: string | null
          selected_badge?: string | null
          social_power?: number
          sp_level?: number
          stories_posted_today?: number
          story_ban_until?: string | null
          streak_days?: number
          subscription_tier?: string
          swipe_reset_at?: string | null
          tonight_vibe?: string | null
          total_checkins?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
          violation_count?: number
          weekly_rank?: number | null
          weekly_sp?: number
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          is_vip: boolean | null
          notes: string | null
          party_size: number
          qr_code: string | null
          reservation_date: string
          reservation_time: string
          status: Database["public"]["Enums"]["reservation_status"] | null
          updated_at: string
          user_id: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          is_vip?: boolean | null
          notes?: string | null
          party_size?: number
          qr_code?: string | null
          reservation_date: string
          reservation_time: string
          status?: Database["public"]["Enums"]["reservation_status"] | null
          updated_at?: string
          user_id: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          is_vip?: boolean | null
          notes?: string | null
          party_size?: number
          qr_code?: string | null
          reservation_date?: string
          reservation_time?: string
          status?: Database["public"]["Enums"]["reservation_status"] | null
          updated_at?: string
          user_id?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      sp_levels: {
        Row: {
          badge_icon: string | null
          level: number
          matching_priority: number
          min_sp: number
          name: string
          profile_frame: string | null
          visibility_boost: number
        }
        Insert: {
          badge_icon?: string | null
          level: number
          matching_priority?: number
          min_sp?: number
          name: string
          profile_frame?: string | null
          visibility_boost?: number
        }
        Update: {
          badge_icon?: string | null
          level?: number
          matching_priority?: number
          min_sp?: number
          name?: string
          profile_frame?: string | null
          visibility_boost?: number
        }
        Relationships: []
      }
      story_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "night_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_likes: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "night_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reports_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "night_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_missions: {
        Row: {
          claimed_at: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          mission_id: string
          progress: number | null
          user_id: string
          week_start: string
        }
        Insert: {
          claimed_at?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_id: string
          progress?: number | null
          user_id: string
          week_start?: string
        }
        Update: {
          claimed_at?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_id?: string
          progress?: number | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          crowd_level: number | null
          description: string | null
          distance: string | null
          has_vip: boolean | null
          hours: string | null
          id: string
          image_url: string | null
          is_open: boolean | null
          latitude: number | null
          live_checkin_count: number | null
          longitude: number | null
          name: string
          place_id: string | null
          rating: number | null
          tags: string[] | null
          type: Database["public"]["Enums"]["venue_type"]
          updated_at: string
          venue_mode: string
          vibe_rating: number | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          crowd_level?: number | null
          description?: string | null
          distance?: string | null
          has_vip?: boolean | null
          hours?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean | null
          latitude?: number | null
          live_checkin_count?: number | null
          longitude?: number | null
          name: string
          place_id?: string | null
          rating?: number | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["venue_type"]
          updated_at?: string
          venue_mode?: string
          vibe_rating?: number | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          crowd_level?: number | null
          description?: string | null
          distance?: string | null
          has_vip?: boolean | null
          hours?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean | null
          latitude?: number | null
          live_checkin_count?: number | null
          longitude?: number | null
          name?: string
          place_id?: string | null
          rating?: number | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["venue_type"]
          updated_at?: string
          venue_mode?: string
          vibe_rating?: number | null
        }
        Relationships: []
      }
      weekly_score_events: {
        Row: {
          city: string
          city_id: string | null
          created_at: string
          event_type: string
          id: string
          points: number
          source_id: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          city?: string
          city_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          points?: number
          source_id?: string | null
          user_id: string
          week_start?: string
        }
        Update: {
          city?: string
          city_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          points?: number
          source_id?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_score_events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_weekly_missions: { Args: { p_user_id: string }; Returns: Json }
      auto_assign_city: {
        Args: { p_city_name: string; p_country?: string; p_user_id: string }
        Returns: Json
      }
      award_weekly_leaderboard_bonuses: {
        Args: { p_city?: string }
        Returns: undefined
      }
      award_xp: {
        Args: { target_user_id: string; xp_amount: number }
        Returns: undefined
      }
      check_momentum_badge: { Args: { p_user_id: string }; Returns: boolean }
      claim_mission_reward: {
        Args: { p_mission_id: string; p_user_id: string }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_body?: string
          p_data?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      discover_users: {
        Args: {
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_mode?: string
          p_user_id: string
        }
        Returns: {
          avatar_url: string
          bio: string
          city_rank: number
          current_venue_name: string
          display_name: string
          interests: string[]
          is_premium: boolean
          is_rising: boolean
          level: number
          match_score: number
          momentum_bonus: boolean
          mutual_follow_count: number
          night_active: boolean
          night_activity_score: number
          profile_quality: number
          same_city: boolean
          same_venue: boolean
          shared_interest_count: number
          shared_venue_count: number
          social_power: number
          sp_level: number
          subscription_tier: string
          total_checkins: number
          user_id: string
          username: string
          xp: number
        }[]
      }
      expire_checkins: { Args: never; Returns: undefined }
      get_monthly_leaderboard: {
        Args: { p_city?: string; p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          is_premium: boolean
          level: number
          monthly_score: number
          rank: number
          user_id: string
          username: string
          xp: number
        }[]
      }
      get_my_monthly_rank: {
        Args: { p_city?: string; p_user_id: string }
        Returns: {
          monthly_score: number
          points_to_next: number
          rank: number
        }[]
      }
      get_my_weekly_rank: {
        Args: { p_city?: string; p_user_id: string }
        Returns: {
          points_to_next: number
          rank: number
          weekly_score: number
        }[]
      }
      get_tier_config: {
        Args: { p_tier: string }
        Returns: {
          daily_cap: number
          sp_multiplier: number
          weekly_bonus: number
        }[]
      }
      get_weekly_leaderboard: {
        Args: { p_city?: string; p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          is_premium: boolean
          level: number
          rank: number
          user_id: string
          username: string
          weekly_score: number
          xp: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      premium_checkin: {
        Args: {
          p_latitude?: number
          p_longitude?: number
          p_user_id: string
          p_venue_id: string
        }
        Returns: Json
      }
      recalculate_city_ranks: { Args: { p_city?: string }; Returns: undefined }
      recalculate_social_power: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      record_day_score: {
        Args: {
          p_city?: string
          p_event_type: string
          p_points: number
          p_source_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      record_weekly_score: {
        Args: {
          p_city?: string
          p_event_type: string
          p_points: number
          p_source_id?: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_streak: { Args: { p_user_id: string }; Returns: undefined }
      update_user_city: {
        Args: { p_city_id: string; p_user_id: string }
        Returns: Json
      }
      weekly_reset: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      reservation_status: "pending" | "confirmed" | "cancelled"
      venue_type:
        | "club"
        | "bar"
        | "concert"
        | "lounge"
        | "cafe"
        | "restaurant"
        | "coworking"
        | "beach"
        | "brunch"
        | "workshop"
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
      app_role: ["admin", "moderator", "user"],
      reservation_status: ["pending", "confirmed", "cancelled"],
      venue_type: [
        "club",
        "bar",
        "concert",
        "lounge",
        "cafe",
        "restaurant",
        "coworking",
        "beach",
        "brunch",
        "workshop",
      ],
    },
  },
} as const
