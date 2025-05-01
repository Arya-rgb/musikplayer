/**
 * Represents a YouTube video snippet.
 */
export interface YouTubeVideoSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    default: { url: string; width: number; height: number };
    medium: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
  };
  channelTitle: string;
  liveBroadcastContent: string;
  publishTime: string;
}

/**
 * Represents a YouTube video search result item.
 */
export interface YouTubeVideoSearchResultItem {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId: string;
  };
  snippet: YouTubeVideoSnippet;
}

/**
 * Represents a YouTube video details item.
 */
export interface YouTubeVideoDetailsItem {
  kind: string;
  etag: string;
  id: string;
  snippet: YouTubeVideoSnippet;
  // Add other details you might need like statistics, contentDetails, etc.
}


/**
 * Represents the search result from YouTube API.
 */
export interface YouTubeSearchResult {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  regionCode: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: YouTubeVideoSearchResultItem[];
}

/**
 * Represents the result of fetching video details.
 */
export interface YouTubeVideoDetailsResult {
    kind: string;
    etag: string;
    items: YouTubeVideoDetailsItem[];
    pageInfo: {
      totalResults: number;
      resultsPerPage: number;
    };
}


const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * Asynchronously searches for YouTube videos based on a query.
 *
 * @param query The search query.
 * @param maxResults The maximum number of results to return. Defaults to 12.
 * @param pageToken The token for the next page.
 * @returns A promise that resolves to a YouTubeSearchResult object.
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 12,
  pageToken?: string
): Promise<YouTubeSearchResult> {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API Key is not configured.');
    // Return a default structure in case of error
    return { kind: '', etag: '', regionCode: '', pageInfo: { totalResults: 0, resultsPerPage: 0 }, items: [] };
  }

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    key: YOUTUBE_API_KEY,
  });

  if (pageToken) {
    params.append('pageToken', pageToken);
  }

  try {
    const response = await fetch(`${YOUTUBE_API_BASE_URL}/search?${params.toString()}`);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API Error:', errorData);
      throw new Error(`YouTube API error: ${response.statusText}`);
    }
    const data: YouTubeSearchResult = await response.json();
    // Filter out items without videoId just in case
    data.items = data.items.filter(item => item.id && item.id.videoId);
    return data;
  } catch (error) {
    console.error('Failed to fetch YouTube videos:', error);
     // Return a default structure in case of error
    return { kind: '', etag: '', regionCode: '', pageInfo: { totalResults: 0, resultsPerPage: 0 }, items: [] };
  }
}

/**
 * Asynchronously retrieves details for multiple YouTube videos by their IDs.
 *
 * @param videoIds An array of video IDs to retrieve details for.
 * @returns A promise that resolves to a YouTubeVideoDetailsResult object.
 */
export async function getYouTubeVideoDetailsByIds(videoIds: string[]): Promise<YouTubeVideoDetailsResult> {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API Key is not configured.');
     // Return a default structure in case of error
    return { kind: '', etag: '', items: [], pageInfo: { totalResults: 0, resultsPerPage: 0 } };
  }

  if (!videoIds || videoIds.length === 0) {
    return { kind: '', etag: '', items: [], pageInfo: { totalResults: 0, resultsPerPage: 0 } };
  }

  const params = new URLSearchParams({
    part: 'snippet', // Add other parts if needed, e.g., 'contentDetails,statistics'
    id: videoIds.join(','),
    key: YOUTUBE_API_KEY,
  });

  try {
    const response = await fetch(`${YOUTUBE_API_BASE_URL}/videos?${params.toString()}`);
    if (!response.ok) {
       const errorData = await response.json();
       console.error('YouTube API Error:', errorData);
      throw new Error(`YouTube API error: ${response.statusText}`);
    }
    const data: YouTubeVideoDetailsResult = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch YouTube video details:', error);
     // Return a default structure in case of error
    return { kind: '', etag: '', items: [], pageInfo: { totalResults: 0, resultsPerPage: 0 } };
  }
}


/**
 * Fetches a list of popular music videos from YouTube.
 *
 * @param maxResults The maximum number of results to return. Defaults to 12.
 * @param pageToken The token for the next page.
 * @returns A promise that resolves to a YouTubeSearchResult object containing popular music videos.
 */
export async function getPopularMusicVideos(
  maxResults: number = 12,
  pageToken?: string
): Promise<YouTubeSearchResult> {
   if (!YOUTUBE_API_KEY) {
    console.error('YouTube API Key is not configured.');
    return { kind: '', etag: '', regionCode: '', pageInfo: { totalResults: 0, resultsPerPage: 0 }, items: [] };
  }

  const params = new URLSearchParams({
    part: 'snippet',
    chart: 'mostPopular',
    videoCategoryId: '10', // Category ID for Music
    regionCode: 'ID', // Optional: Region code, e.g., 'US', 'ID'
    maxResults: String(maxResults),
    key: YOUTUBE_API_KEY,
  });

  if (pageToken) {
    params.append('pageToken', pageToken);
  }

   try {
    // Note: The 'search' endpoint doesn't directly support 'chart' and 'videoCategoryId' together well for *just* popular music.
    // A better approach uses the 'videos' endpoint with chart=mostPopular and videoCategoryId=10.
    const videoParams = new URLSearchParams({
        part: 'snippet', // Request snippet details
        chart: 'mostPopular',
        videoCategoryId: '10', // Music category
        regionCode: 'ID', // Adjust as needed
        maxResults: String(maxResults),
        key: YOUTUBE_API_KEY,
    });
     if (pageToken) {
        videoParams.append('pageToken', pageToken);
     }

     const response = await fetch(`${YOUTUBE_API_BASE_URL}/videos?${videoParams.toString()}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('YouTube API Error (Popular Music):', errorData);
      throw new Error(`YouTube API error: ${response.statusText}`);
    }
    const data: YouTubeVideoDetailsResult = await response.json();

     // Adapt the VideoDetailsResult structure to match SearchResult structure for consistency
     const searchResult: YouTubeSearchResult = {
        kind: 'youtube#searchListResponse', // Mimic search result kind
        etag: data.etag,
        nextPageToken: (data as any).nextPageToken, // Cast needed as VideoListResponse doesn't guarantee this structure element
        prevPageToken: (data as any).prevPageToken,
        regionCode: 'ID', // Assuming, might need adjustment
        pageInfo: data.pageInfo,
        items: data.items.map(item => ({
            kind: 'youtube#searchResult', // Mimic search result item kind
            etag: item.etag,
            id: {
                kind: 'youtube#video', // Indicate it's a video ID
                videoId: item.id,
            },
            snippet: item.snippet,
        }))
     };

    return searchResult;
  } catch (error) {
    console.error('Failed to fetch popular YouTube music videos:', error);
    return { kind: '', etag: '', regionCode: '', pageInfo: { totalResults: 0, resultsPerPage: 0 }, items: [] };
  }
}