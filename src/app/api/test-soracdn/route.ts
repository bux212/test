import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const testUrl = 'https://sora.chatgpt.com/p/s_691f94fc13c08191afc35d6540985d58';
  
  try {
    console.log('🟡 Testing soracdn.workers.dev');
    
    const encodedUrl = encodeURIComponent(testUrl);
    
    const res = await fetch(`https://api.soracdn.workers.dev/api-proxy/${encodedUrl}`, {
      headers: {
        'Origin': 'https://snapsora.net',
        'Referer': 'https://snapsora.net/',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${res.status}`
      }, { status: 500 });
    }

    const data = await res.json();
    
    return NextResponse.json({
      success: true,
      api: 'soracdn',
      data: {
        mp4: data.links?.mp4,
        title: data.post_info?.title || data.title,
        post_id: data.post_id
      },
      raw: data
    }, { status: 200 });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
