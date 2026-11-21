import { NextResponse } from 'next/server';

type YouTubeApiResponse<T> = {
  items?: T[];
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string }>;
  };
};

class YouTubeApiError extends Error {
  constructor(message: string, readonly reason?: string) {
    super(message);
    this.name = 'YouTubeApiError';
  }
}

type ChannelItem = {
  id: string;
  snippet?: { title?: string };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};

type PlaylistItem = {
  contentDetails?: { videoId?: string };
};

type VideoItem = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

type SearchItem = {
  id?: { videoId?: string };
  snippet?: VideoItem['snippet'];
};

type YouTubeVideo = {
  id: string;
  title: string;
  description: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  watchUrl: string;
};

function toYouTubeVideo(id: string, snippet: VideoItem['snippet']): YouTubeVideo {
  return {
    id,
    title: snippet?.title || 'Untitled video',
    description: snippet?.description || '',
    publishedAt: snippet?.publishedAt || null,
    thumbnailUrl:
      snippet?.thumbnails?.high?.url ||
      snippet?.thumbnails?.medium?.url ||
      snippet?.thumbnails?.default?.url ||
      null,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
  };
}

async function youtubeRequest<T>(
  params: URLSearchParams,
  apiKey: string,
  revalidateSeconds = 300,
): Promise<T[]> {
  const endpoint = params.get('endpoint');
  if (!endpoint) throw new Error('YouTube request is missing its API resource.');
  params.delete('endpoint');
  params.set('key', apiKey);
  const response = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${params}`, {
    next: { revalidate: revalidateSeconds },
  });

  let data: YouTubeApiResponse<T>;
  try {
    data = (await response.json()) as YouTubeApiResponse<T>;
  } catch {
    throw new Error(`YouTube returned an invalid response (HTTP ${response.status}).`);
  }

  if (!response.ok || data.error) {
    const reason = data.error?.errors?.[0]?.reason;
    console.error('YouTube Data API request failed', {
      endpoint,
      status: response.status,
      reason,
      message: data.error?.message,
    });

    if (reason === 'keyInvalid') throw new Error('The YouTube API key is invalid or revoked.');
    if (reason === 'accessNotConfigured') throw new Error('The YouTube Data API v3 is not enabled for this API key.');
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
      throw new Error('The YouTube Data API quota has been exceeded.');
    }
    if (reason?.toLowerCase().includes('referer') || reason?.toLowerCase().includes('ip')) {
      throw new Error('The API key restrictions do not allow this server request.');
    }
    throw new YouTubeApiError(
      `YouTube Data API request failed (HTTP ${response.status}${reason ? `: ${reason}` : ''}).`,
      reason,
    );
  }
  return data.items ?? [];
}

async function searchRecentVideos(channelId: string, apiKey: string): Promise<YouTubeVideo[]> {
  const searchParams = new URLSearchParams({
    part: 'snippet',
    channelId,
    maxResults: '12',
    order: 'date',
    type: 'video',
    endpoint: 'search',
  });
  const results = await youtubeRequest<SearchItem>(searchParams, apiKey, 3600);
  return results.flatMap((item) => {
    const id = item.id?.videoId;
    return id ? [toYouTubeVideo(id, item.snippet)] : [];
  });
}

async function getLiveVideoId(channelId: string, apiKey: string): Promise<string | null> {
  const searchParams = new URLSearchParams({
    part: 'snippet',
    channelId,
    eventType: 'live',
    maxResults: '1',
    type: 'video',
    endpoint: 'search',
  });
  const results = await youtubeRequest<SearchItem>(searchParams, apiKey, 30);
  return results.find((item) => item.id?.videoId)?.id?.videoId ?? null;
}

export async function GET() {
  const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim();
  const channelHandle = process.env.YOUTUBE_CHANNEL_HANDLE?.trim();
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  if (!channelId && !channelHandle) {
    return NextResponse.json({
      configured: false,
      channelId: null,
      channelTitle: null,
      channelUrl: null,
      liveEmbedUrl: null,
      videos: [],
      message: 'Configure YOUTUBE_API_KEY and either YOUTUBE_CHANNEL_ID or YOUTUBE_CHANNEL_HANDLE to enable this page.',
    });
  }

  if (!apiKey && !channelId) {
    return NextResponse.json({
      configured: false,
      channelId: null,
      channelTitle: null,
      channelUrl: null,
      liveEmbedUrl: null,
      videos: [],
      message: 'Set YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID (or YOUTUBE_CHANNEL_HANDLE) to enable live streaming and videos.',
    });
  }

  let resolvedChannelId = channelId ?? '';
  let channelTitle = 'RSSSOSAA YouTube channel';

  if (apiKey) {
    try {
      const channelParams = new URLSearchParams({
        part: 'snippet,contentDetails',
      });
      if (channelHandle) channelParams.set('forHandle', channelHandle.replace(/^@/, ''));
      else if (channelId) channelParams.set('id', channelId);
      channelParams.set('endpoint', 'channels');

      const channels = await youtubeRequest<ChannelItem>(channelParams, apiKey);
      const channel = channels[0];
      if (!channel?.id) {
        return NextResponse.json({
          configured: false,
          channelId: null,
          channelTitle: null,
          channelUrl: null,
          liveEmbedUrl: null,
          videos: [],
          message: 'The configured YouTube channel could not be found. Check its ID or handle.',
        });
      }

      resolvedChannelId = channel.id;
      channelTitle = channel.snippet?.title || channelTitle;
      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      const liveVideoId = await getLiveVideoId(resolvedChannelId, apiKey);

      let videos: YouTubeVideo[] = [];
      if (!uploadsPlaylistId) {
        videos = await searchRecentVideos(resolvedChannelId, apiKey);
      } else {
        const playlistParams = new URLSearchParams({
          part: 'contentDetails',
          playlistId: uploadsPlaylistId,
          maxResults: '12',
          endpoint: 'playlistItems',
        });
        let playlistItems: PlaylistItem[] | null = null;
        try {
          playlistItems = await youtubeRequest<PlaylistItem>(playlistParams, apiKey);
        } catch (error) {
          if (!(error instanceof YouTubeApiError) || error.reason !== 'playlistNotFound') throw error;
          videos = await searchRecentVideos(resolvedChannelId, apiKey);
        }

        if (playlistItems) {
          const videoIds = playlistItems
            .map((item) => item.contentDetails?.videoId)
            .filter((id): id is string => Boolean(id));

          if (videoIds.length) {
            const videoParams = new URLSearchParams({
              part: 'snippet',
              id: videoIds.join(','),
              maxResults: '12',
              endpoint: 'videos',
            });
            const videoItems = await youtubeRequest<VideoItem>(videoParams, apiKey);
            const videosById = new Map(videoItems.map((item) => [item.id, item]));
            videos = videoIds.flatMap((id): YouTubeVideo[] => {
              const item = videosById.get(id);
              if (!item) return [];
              return [toYouTubeVideo(id, item.snippet)];
            });
          }
        }
      }

      return NextResponse.json({
        configured: true,
        channelId: resolvedChannelId,
        channelTitle,
        channelUrl: `https://www.youtube.com/channel/${resolvedChannelId}`,
        liveEmbedUrl: liveVideoId
          ? `https://www.youtube.com/embed/${encodeURIComponent(liveVideoId)}?playsinline=1`
          : null,
        isLive: Boolean(liveVideoId),
        liveVideoId,
        videos,
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    } catch (error) {
      return NextResponse.json({
        configured: true,
        channelId: resolvedChannelId || null,
        channelTitle,
        channelUrl: resolvedChannelId ? `https://www.youtube.com/channel/${resolvedChannelId}` : null,
        liveEmbedUrl: null,
        videos: [],
        error: error instanceof Error ? error.message : 'YouTube data could not be loaded.',
      }, { status: 502 });
    }
  }

  return NextResponse.json({
    configured: true,
    channelId: resolvedChannelId,
    channelTitle,
    channelUrl: `https://www.youtube.com/channel/${resolvedChannelId}`,
    liveEmbedUrl: null,
    isLive: false,
    liveVideoId: null,
    videos: [],
    message: 'Add YOUTUBE_API_KEY to load recent videos.',
  }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
}
