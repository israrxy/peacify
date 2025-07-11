// A robust, unified backend function to handle all API requests
export async function onRequest(context) {
  // context contains the request, environment variables, etc.
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // Securely get the API key from the 'data_api' secret you created in the dashboard
  const YOUTUBE_API_KEY = env.data_api;
  const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Allows your frontend to call this function
  };

  try {
    // Check if the API key is configured before making calls to YouTube
    if (!YOUTUBE_API_KEY && ['search', 'details', 'trending'].includes(action)) {
        throw new Error('Server configuration error: YouTube API key is not set.');
    }
    
    switch (action) {
      case 'search': {
        const query = url.searchParams.get('query');
        if (!query) return new Response(JSON.stringify({ error: 'Query parameter is missing' }), { status: 400, headers });
        const apiUrl = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=25&type=video&key=${YOUTUBE_API_KEY}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`YouTube API error (${response.status})`);
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers });
      }

      case 'details': {
        const videoId = url.searchParams.get('id');
        if (!videoId) return new Response(JSON.stringify({ error: 'ID parameter is missing' }), { status: 400, headers });
        const apiUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`YouTube API error (${response.status})`);
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers });
      }

      case 'trending': {
        const regionCode = url.searchParams.get('regionCode') || 'IN'; // Default to India
        // *** THE FIX IS ON THIS LINE ***
        // We must add &videoCategoryId=10 when using chart=mostPopular
        const apiUrl = `${YOUTUBE_API_BASE}/videos?part=snippet&chart=mostPopular®ionCode=${regionCode}&maxResults=25&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`YouTube API error (${response.status})`);
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers });
      }

      case 'suggestions': {
        const query = url.searchParams.get('query');
        if (!query) return new Response(JSON.stringify([]), { headers });
        const suggestionsUrl = `http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
        const response = await fetch(suggestionsUrl);
        const data = await response.json();
        return new Response(JSON.stringify(data[1] || []), { headers });
      }

      case 'transliterate': {
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405 });
        }
        const body = await request.json();
        const textToTransliterate = body.text;
        const transliterateUrl = `https://inputtools.google.com/request?itc=en-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage&text=${encodeURIComponent(textToTransliterate)}`;
        const response = await fetch(transliterateUrl);
        const data = await response.json();
        const transliteratedText = data?.[1]?.[0]?.[1]?.[0] || textToTransliterate;
        return new Response(JSON.stringify({ success: true, transliterated_text: transliteratedText }), { headers });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action specified.' }), { status: 400, headers });
    }
  } catch (error) {
    console.error(`API Function Error for action "${action}":`, error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}