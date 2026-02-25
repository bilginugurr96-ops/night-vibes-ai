
-- Trigger to keep night_stories.likes_count in sync with story_likes
CREATE OR REPLACE FUNCTION public.update_story_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.night_stories
    SET likes_count = COALESCE(likes_count, 0) + 1
    WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.night_stories
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
    WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop if exists to avoid conflicts
DROP TRIGGER IF EXISTS trg_update_story_likes_count ON public.story_likes;

CREATE TRIGGER trg_update_story_likes_count
AFTER INSERT OR DELETE ON public.story_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_story_likes_count();

-- Backfill existing counts
UPDATE public.night_stories ns
SET likes_count = (
  SELECT COUNT(*) FROM public.story_likes sl WHERE sl.story_id = ns.id
);
