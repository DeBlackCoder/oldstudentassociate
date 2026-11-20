'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, CirclePlay, ExternalLink, LoaderCircle, Radio, RefreshCw } from 'lucide-react';

type YouTubeVideo = {
  id: string;
  title: string;
  description: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  watchUrl: string;
};

type YouTubeFeed = {
  configured: boolean;
  channelId: string | null;
  channelTitle: string | null;
  channelUrl: string | null;
  liveEmbedUrl: string | null;
  isLive?: boolean;
  liveVideoId?: string | null;
  videos: YouTubeVideo[];
  message?: string;
  error?: string;
};

async function fetchFeed(): Promise<{ data: YouTubeFeed; ok: boolean }> {
  const response = await fetch('/api/youtube', { cache: 'no-store' });
  const data = (await response.json()) as YouTubeFeed;
  return { data, ok: response.ok };
}

export default function LiveVideos() {
  const [feed, setFeed] = useState<YouTubeFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, ok } = await fetchFeed();
      setFeed(data);
      if (!ok || data.error) setError(data.error || 'Could not load YouTube content. Please try again.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not connect to YouTube. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchFeed()
      .then(({ data, ok }) => {
        if (active) {
          setFeed(data);
          if (!ok || data.error) setError(data.error || 'Could not load YouTube content. Please try again.');
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Could not connect to YouTube. Please try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const liveChat = feed?.liveVideoId && typeof window !== 'undefined'
    ? {
        embedUrl: `https://www.youtube.com/live_chat?v=${encodeURIComponent(feed.liveVideoId)}&embed_domain=${encodeURIComponent(window.location.hostname)}`,
        watchUrl: `https://www.youtube.com/live_chat?v=${encodeURIComponent(feed.liveVideoId)}`,
      }
    : null;
  const liveEmbedUrl = feed?.liveEmbedUrl;

  return (
    <main className="min-h-screen bg-[#EFEDE6] px-4 pb-20 pt-32 text-[#16201a] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#173f26]/10 px-4 py-2 text-sm font-semibold text-[#173f26]">
              <Radio className="h-4 w-4" /> RSSSOSAA on YouTube
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Live & Videos</h1>
            <p className="mt-3 max-w-2xl text-neutral-600">
              Watch our current YouTube live stream and catch up on recent association videos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadFeed()}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-full border border-[#173f26]/20 bg-white px-5 text-sm font-semibold text-[#173f26] transition hover:bg-[#173f26]/5 disabled:opacity-60 sm:self-auto"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </header>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="mb-14">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Live stream</h2>
              <p className="mt-1 text-sm text-neutral-600">
                {feed?.channelTitle || 'Live from our YouTube channel'}
              </p>
            </div>
            {feed?.channelUrl && (
              <a
                href={feed.channelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#173f26] hover:underline"
              >
                Visit channel <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          <div className="relative left-1/2 grid w-[90vw] -translate-x-1/2 items-start gap-5 px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl bg-[#101510] shadow-xl">
              {liveEmbedUrl ? (
                <iframe
                  title="RSSSOSAA YouTube live stream"
                  src={liveEmbedUrl}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center px-6 text-center text-white">
                  {loading ? (
                    <LoaderCircle className="mb-4 h-9 w-9 animate-spin text-[#d9b86a]" />
                  ) : (
                    <CirclePlay className="mb-4 h-10 w-10 text-[#d9b86a]" />
                  )}
                  <p className="text-lg font-semibold">
                    {loading ? 'Connecting to YouTube…' : 'YouTube channel not configured yet'}
                  </p>
                  {!loading && (
                    <p className="mt-2 max-w-lg text-sm text-white/70">
                      {feed?.message || 'Add the channel configuration to the deployment environment to enable live video.'}
                    </p>
                  )}
                </div>
              )}
            </div>
            {liveEmbedUrl && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => document.getElementById('previous-meetings')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2 rounded-full border border-[#173f26]/20 bg-white px-4 py-2.5 text-sm font-semibold text-[#173f26] shadow-sm transition hover:bg-[#173f26]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f26]"
                >
                  Previous meeting videos <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}

            <aside className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="border-b border-neutral-200 px-5 py-4">
                <h3 className="font-semibold text-[#16201a]">Live chat</h3>
                <p className="mt-1 text-xs text-neutral-500">Join the conversation on YouTube</p>
              </div>
              {liveChat ? (
                <>
                  <iframe
                    title="RSSSOSAA YouTube live chat"
                    src={liveChat.embedUrl}
                    className="h-[420px] w-full sm:h-[500px] lg:h-[calc(100%-65px)] lg:min-h-[435px]"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                  <a
                    href={liveChat.watchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block border-t border-neutral-200 px-5 py-3 text-center text-sm font-semibold text-[#173f26] hover:bg-[#173f26]/5"
                  >
                    Open chat on YouTube
                  </a>
                </>
              ) : (
                <div className="flex min-h-[180px] items-center justify-center px-6 py-8 text-center text-sm text-neutral-600">
                  {loading
                    ? 'Checking for an active livestream…'
                    : feed?.isLive === false
                      ? 'Live chat will appear here when the channel starts a broadcast.'
                      : 'Live chat is available when YouTube confirms an active broadcast.'}
                </div>
              )}
            </aside>
          </div>
          {feed?.message && feed.liveEmbedUrl && (
            <p className="mt-3 text-sm text-neutral-600">{feed.message}</p>
          )}
        </section>

        <section id="previous-meetings" className="scroll-mt-28">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Recent videos</h2>
              <p className="mt-1 text-sm text-neutral-600">Latest uploads from the association channel.</p>
            </div>
          </div>

          {loading && !feed ? (
            <div className="rounded-2xl bg-white px-6 py-10 text-center text-neutral-600">
              <LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin text-[#173f26]" />
              Loading videos…
            </div>
          ) : feed?.videos.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {feed.videos.map((video) => (
                <a
                  key={video.id}
                  href={video.watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  {video.thumbnailUrl ? (
                    // YouTube thumbnail URLs are supplied by the Data API.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={video.thumbnailUrl} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-[#173f26] text-white">
                      <CirclePlay className="h-10 w-10" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-[#1a472a]">{video.title}</h3>
                    {video.publishedAt && (
                      <time className="mt-3 block text-xs text-neutral-500" dateTime={video.publishedAt}>
                        {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(video.publishedAt))}
                      </time>
                    )}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white px-6 py-10 text-center">
              <CirclePlay className="mx-auto mb-3 h-8 w-8 text-[#173f26]" />
              <p className="font-semibold">No videos to show yet</p>
              <p className="mt-1 text-sm text-neutral-600">
                {feed?.message || 'Recent uploads will appear here when the YouTube channel is configured.'}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
