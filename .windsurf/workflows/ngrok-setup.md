---
description: Start ngrok and update Slack API configuration (with existing instance detection)
---

# Ngrok Setup Workflow

This workflow automates starting ngrok, extracting the public URL, updating the `.env` file, and providing instructions to update Slack API settings. It detects if ngrok is already running and skips restart if so.

## Step 1: Check if ngrok is Already Running
Query the ngrok API to check if an instance is already running:
```bash
cmd /c curl -s http://localhost:4040/api/tunnels
```

If successful (HTTP 200), ngrok is already running. Extract the `public_url` and proceed to Step 4 (output instructions with note that no restart was needed).

If the request fails (connection refused), proceed to Step 2 to start ngrok.

## Step 2: Start ngrok Server
// turbo
Start ngrok on port 3000 in the background:
```bash
cmd /c ngrok http 3000 --log=stdout
```

Store the command ID for later reference. Wait 3 seconds before proceeding to allow ngrok to initialize.

## Step 3: Extract ngrok URL
Query the ngrok API to get the public tunnel URL:
```bash
cmd /c curl -s http://localhost:4040/api/tunnels
```

Parse the JSON response to extract the `public_url` field (format: `https://XXXXXXXXXXXXXXXX.ngrok-free.app`).

Expected JSON structure:
```json
{
  "tunnels": [
    {
      "public_url": "https://c1db3c7ea863.ngrok-free.app",
      ...
    }
  ]
}
```

If the request fails, wait 2 seconds and retry (max 3 attempts).

## Step 4: Update .env File
Update the `SLACK_INTERACTIONS_URL` in `.env`:
- File: `c:/Users/Jonny/Code/spec-builder/.env`
- Pattern: `SLACK_INTERACTIONS_URL=https://.*ngrok.*`
- New value: `SLACK_INTERACTIONS_URL=https://{extracted-url}/api/slack/interactions`

Example:
```
OLD: SLACK_INTERACTIONS_URL=https://your-ngrok-url.ngrok.io/api/slack/interactions
NEW: SLACK_INTERACTIONS_URL=https://c1db3c7ea863.ngrok-free.app/api/slack/interactions
```

Only perform this step if ngrok was newly started (not if it was already running).

## Step 5: Display Instructions

### If ngrok was already running:
```
✅ Ngrok is already running!
✅ No restart required.

Current Ngrok URL: https://{extracted-url}.ngrok-free.app

No further changes needed. Your Slack API is already configured with this URL.
```

### If ngrok was just started:
```
✅ Ngrok is running!
✅ .env file updated!

Current Ngrok URL: https://{extracted-url}.ngrok-free.app

Manual Slack API Update Instructions:
1. Go to https://api.slack.com/apps
2. Select your app
3. Navigate to "Interactivity & Shortcuts"
4. Find the "Request URL" field
5. Clear the current value
6. Paste: https://{extracted-url}/api/slack/interactions
7. Click "Save Changes"
8. Wait for Slack to verify (green checkmark)

⚠️ IMPORTANT: The `/api/slack/interactions` path is REQUIRED
Without the full path, requests will get 403 errors.

Verification:
- Slack will send a verification request
- You should see a green checkmark next to the Request URL
- The Submit button in Slack messages will now work correctly
```

## Error Handling

- **Ngrok fails to start:** "Ngrok failed to start. Check if port 3000 is already in use."
- **URL extraction fails:** "Could not extract ngrok URL. Ensure ngrok is running."
- **File update fails:** "Failed to update .env file. Check file permissions."

## Testing

After running the workflow:
1. First run: Verify the `.env` file was updated correctly
2. Second run: Verify it detects the existing instance and skips restart
3. Manually update Slack API settings following the displayed instructions (only needed on first run)
4. Test Slack button click - should work without 403 error
