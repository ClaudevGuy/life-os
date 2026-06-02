/** Shapes shared between the YouTube API routes and the client player. */

export type Playlist = {
  id: string;
  title: string;
  count: number | null;
  thumbnail: string | null;
};

export type Track = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string | null;
};
