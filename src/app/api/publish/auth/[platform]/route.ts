import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { platform } = params;
  const platformLower = platform.toLowerCase();

  // For YouTube (Real Google OAuth 2.0 flow)
  if (platformLower === 'youtube') {
    const client_id = process.env.GOOGLE_CLIENT_ID;
    const client_secret = process.env.GOOGLE_CLIENT_SECRET;
    
    // Check if real credentials are configured
    const isMockMode = !client_id || !client_secret || process.env.MOCK_PUBLISH === 'true';

    if (!isMockMode) {
      const host = process.env.NEXTAUTH_URL || request.nextUrl.origin;
      const redirect_uri = `${host}/api/publish/auth/youtube/callback`;
      const scope = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/youtube.readonly'
      ].join(' ');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
        `client_id=${client_id}` +
        `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&access_type=offline` +
        `&prompt=select_account%20consent`;

      return NextResponse.redirect(authUrl);
    }
  }

  // Render Premium Mock OAuth Consent Screen
  const platformLabel = platformLower.charAt(0).toUpperCase() + platformLower.slice(1);
  const emailDefault = session.user.email || 'creator@thinknext.com';

  // Custom icon markup & branding based on platform
  let iconSVG = '';
  let platformColorClass = '';
  let presetOptions = '';

  if (platformLower === 'youtube') {
    iconSVG = `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.522 3.5 12 3.5 12 3.5s-7.522 0-9.388.555A3.002 3.002 0 0 0 .503 6.163C0 8.03 0 12 0 12s0 3.97.503 5.837a3.003 3.003 0 0 0 2.11 2.108C5.113 20.5 12 20.5 12 20.5s7.522 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.97 24 12 24 12s0-3.97-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
    platformColorClass = 'youtube';
    presetOptions = `
      <option value="ThinkNEXT Studio">ThinkNEXT Studio (Corporate)</option>
      <option value="Personal Channel">Personal Channel (Creator)</option>
      <option value="Client Channel">Client Channel (Marketing)</option>
    `;
  } else if (platformLower === 'linkedin') {
    iconSVG = `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;
    platformColorClass = 'linkedin';
    presetOptions = `
      <option value="Personal Profile">Personal Profile (Professional)</option>
      <option value="Company Page">Company Page (ThinkNEXT)</option>
      <option value="Client Company Profile">Client Page (Consulting)</option>
    `;
  } else if (platformLower === 'facebook') {
    iconSVG = `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
    platformColorClass = 'facebook';
    presetOptions = `
      <option value="ThinkNEXT Page">ThinkNEXT Page</option>
      <option value="Client Business Page">Client Business Page</option>
      <option value="Personal Creator Page">Personal Creator Page</option>
    `;
  } else if (platformLower === 'instagram') {
    iconSVG = `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`;
    platformColorClass = 'instagram';
    presetOptions = `
      <option value="ThinkNEXT Business Account">ThinkNEXT Business Account</option>
      <option value="Client Brand Profile">Client Brand Profile</option>
      <option value="Personal Creator Account">Personal Creator Account</option>
    `;
  } else {
    iconSVG = `<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
    platformColorClass = 'twitter';
    presetOptions = `
      <option value="ThinkNEXT Official">ThinkNEXT Official Account</option>
      <option value="Personal Handle">Personal Handle</option>
      <option value="Brand Twitter Feed">Brand Twitter Feed</option>
    `;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect ${platformLabel} - Studio AI</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #6366f1;
      --bg: #090d16;
      --card-bg: rgba(17, 24, 39, 0.7);
      --border: rgba(255, 255, 255, 0.08);
      --text: #f3f4f6;
      --text-muted: #9ca3af;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Outfit', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.05) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(236, 72, 153, 0.05) 0%, transparent 40%);
      padding: 20px;
    }
    
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 35px;
      width: 100%;
      max-width: 460px;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      animation: fadeIn 0.4s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .header {
      text-align: center;
      margin-bottom: 25px;
    }
    
    .icon-wrapper {
      width: 60px;
      height: 60px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }
    
    .youtube { background: rgba(255, 0, 0, 0.12); color: #FF0000; border: 1px solid rgba(255, 0, 0, 0.2); }
    .linkedin { background: rgba(10, 102, 194, 0.12); color: #0A66C2; border: 1px solid rgba(10, 102, 194, 0.2); }
    .facebook { background: rgba(24, 119, 242, 0.12); color: #1877F2; border: 1px solid rgba(24, 119, 242, 0.2); }
    .instagram { background: rgba(225, 48, 108, 0.12); color: #E1306C; border: 1px solid rgba(225, 48, 108, 0.2); }
    .twitter { background: rgba(255, 255, 255, 0.06); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.12); }
    
    .app-title {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 6px;
      letter-spacing: -0.01em;
    }
    
    .app-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
      line-height: 1.4;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    
    input, select {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 14px;
      color: #fff;
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 500;
      transition: all 0.2s;
    }
    
    input:focus, select:focus {
      outline: none;
      border-color: var(--primary);
      background: rgba(255, 255, 255, 0.06);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    }
    
    .custom-input-group {
      position: relative;
    }
    
    .scopes-container {
      background: rgba(255, 255, 255, 0.01);
      border: 1px dashed var(--border);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 25px;
    }
    
    .scope-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    
    .scope-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 500;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    
    .scope-item:last-child {
      margin-bottom: 0;
    }
    
    .scope-item input[type="checkbox"] {
      width: auto;
      margin-top: 1px;
      accent-color: var(--primary);
      cursor: pointer;
    }
    
    .btn-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 700;
      padding: 12px 20px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      text-align: center;
    }
    
    .btn-primary {
      background: var(--primary);
      color: #fff;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    
    .btn-primary:hover {
      background: #4f46e5;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    }
    
    .btn-secondary {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-muted);
      border: 1px solid var(--border);
    }
    
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      transform: translateY(-1px);
    }
  </style>
</head>
<body>

  <div class="card">
    <div class="header">
      <div class="icon-wrapper ${platformColorClass}">
        ${iconSVG}
      </div>
      <h2 class="app-title">Connect ${platformLabel} Account</h2>
      <p class="app-subtitle">Select or type the mock profile details you wish to connect to Studio AI for distribution.</p>
    </div>
    
    <form action="/api/publish/auth/${platformLower}/callback" method="GET">
      <input type="hidden" name="code" value="mock-${platformLower}-code-${Date.now()}">
      
      <div class="form-group">
        <label for="channelName">Select Profile / Page</label>
        <select id="channelName" name="channelName" onchange="checkCustomOption(this)">
          ${presetOptions}
          <option value="custom">-- Create Custom Profile --</option>
        </select>
      </div>
      
      <div class="form-group" id="customNameGroup" style="display:none;">
        <label for="customChannelName">Custom Profile Name</label>
        <input type="text" id="customChannelName" placeholder="e.g. My Branding Channel" oninput="updateCustomValue(this)">
      </div>
      
      <div class="form-group">
        <label for="email">Account Email</label>
        <input type="email" id="email" name="email" value="${emailDefault}" required>
      </div>
      
      <div class="scopes-container">
        <div class="scope-title">Requested Permissions</div>
        <div class="scope-item">
          <input type="checkbox" id="sc1" checked required>
          <label for="sc1" style="display:inline; text-transform:none; font-size:12px; font-weight:500; margin:0; cursor:pointer;">Publish generated videos and shorts</label>
        </div>
        <div class="scope-item">
          <input type="checkbox" id="sc2" checked required>
          <label for="sc2" style="display:inline; text-transform:none; font-size:12px; font-weight:500; margin:0; cursor:pointer;">Manage account metadata and tags</label>
        </div>
        <div class="scope-item">
          <input type="checkbox" id="sc3" checked>
          <label for="sc3" style="display:inline; text-transform:none; font-size:12px; font-weight:500; margin:0; cursor:pointer;">Retrieve profile statistics</label>
        </div>
      </div>
      
      <div class="btn-group">
        <a href="/?tab=publish&error=Authentication+cancelled" class="btn btn-secondary">Cancel</a>
        <button type="submit" class="btn btn-primary">Authorize</button>
      </div>
    </form>
  </div>

  <script>
    function checkCustomOption(selectElement) {
      const customGroup = document.getElementById('customNameGroup');
      const customInput = document.getElementById('customChannelName');
      
      if (selectElement.value === 'custom') {
        customGroup.style.display = 'block';
        customInput.required = true;
        customInput.focus();
      } else {
        customGroup.style.display = 'none';
        customInput.required = false;
      }
    }
    
    function updateCustomValue(inputElement) {
      const selectElement = document.getElementById('channelName');
      // Set the select element's value to hold the typed value dynamically
      // To bypass the standard option list limit, we can update the custom option's value
      const customOption = selectElement.options[selectElement.options.length - 1];
      customOption.value = inputElement.value;
    }
  </script>
</body>
</html>
  `;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
