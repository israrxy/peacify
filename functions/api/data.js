export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  const YOUTUBE_API_KEY = env.data_api;
  const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  async function handleApiResponse(response) {
    if (!response.ok) {
      let errorDetails = `YouTube API error (${response.status})`;
      try {
        const errorData = await response.json();
        if (errorData.error && errorData.error.message) {
          errorDetails += `: ${errorData.error.message}`;
        }
      } catch (e) {
        errorDetails += `: ${response.statusText}`;
      }
      throw new Error(errorDetails);
    }
    return response.json();
  }

  try {
    // This check MUST happen before the switch for relevant actions.
    if (!YOUTUBE_API_KEY && ['search', 'details', 'trending'].includes(action)) {
      throw new Error('Server configuration error: YouTube API key is not set in Cloudflare secrets.');
    }
    
    switch (action) {
      // *** THE FIX: The 'debug' action is now correctly placed inside the switch statement ***
      case 'debug': {
        const isSet = !!YOUTUBE_API_KEY; // Check if the variable exists and is not empty
        const keyLength = isSet ? YOUTUBE_API_KEY.length : 0;
        
        return new Response(JSON.stringify({
          keyName: 'data_api',
          isSet: isSet,
          length: keyLength,
          message: isSet 
            ? "The 'data_api' secret is correctly set and accessible by the function."
            : "ERROR: The 'data_api' secret was NOT FOUND. Check your Pages project settings under Settings > Environment variables. Make sure it's applied to the Production environment."
        }), { headers });
      }

      case 'search': {
        const query = url.searchParams.get('query');
        if (!query) throw new Error('Query parameter is missing');
        const apiUrl = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=25&type=video&key=${YOUTUBE_API_KEY}`;
        const data = await fetch(apiUrl).then(handleApiResponse);
        return new Response(JSON.stringify(data), { headers });
      }
      case 'details': {
        const videoId = url.searchParams.get('id');
        if (!videoId) throw new Error('ID parameter is missing');
        const apiUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
        const data = await fetch(apiUrl).then(handleApiResponse);
        return new Response(JSON.stringify(data), { headers });
      }
      case 'trending': {
        const regionCode = url.searchParams.get('regionCode') || 'IN';
        const apiUrl = `${YOUTUBE_API_BASE}/videos?part=snippet&chart=mostPopular®ionCode=${regionCode}&maxResults=25&videoCategoryId=10&key=${YOUTUBE_API_KEY}`;
        const data = await fetch(apiUrl).then(handleApiResponse);
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
        if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
        const body = await request.json();
        const textToTransliterate = body.text;
        const transliterateUrl = `https://inputtools.google.com/request?itc=en-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage&text=${encodeURIComponent(textToTransliterate)}`;
        const response = await fetch(transliterateUrl);
        const data = await response.json();
        const transliteratedText = data?.[1]?.[0]?.[1]?.[0] || textToTransliterate;
        return new Response(JSON.stringify({ success: true, transliterated_text: transliteratedText }), { headers });
      }
      default:
        // This will now only be hit if the action is something other than the cases above
        return new Response(JSON.stringify({ error: `Invalid action specified: '${action}'` }), { status: 400, headers });
    }
  } catch (error) {
    console.error(`API Function Error for action "${action}":`, error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}