-- Idempotent schema migrations.
--
-- IF NOT EXISTS emits a NOTICE on every already-applied statement, which is
-- expected here and only makes real problems harder to spot.
SET client_min_messages = warning;

-- Idempotent schema migrations. deploy.sh runs this on every deploy, so
-- everything here must be safe to apply repeatedly.

-- Ownership token for a game.
--
-- Game ids are sequential integers, so before this existed anyone could walk
-- /games/1..N and delete or play other people's routes. The token is issued at
-- creation, held only by the client that created the game, and required for
-- every state-changing call. Existing rows get a random token, which simply
-- means their original clients can no longer mutate them.
ALTER TABLE games
    ADD COLUMN IF NOT EXISTS token uuid NOT NULL DEFAULT gen_random_uuid();

-- Abandoned games are deleted on leave, but a client that closes the tab never
-- sends that call. This supports the sweep that clears them out.
CREATE INDEX IF NOT EXISTS idx_games_status_id ON games (status, id);

-- Terminus pair lookup, rebuilt by the BFS step in the import pipeline.
CREATE TABLE IF NOT EXISTS terminus_pairs (
    start_actor_id  int      NOT NULL,
    target_actor_id int      NOT NULL,
    hops            smallint NOT NULL,
    PRIMARY KEY (start_actor_id, target_actor_id)
);
