# Share Expiration & Human-Friendly Audit/Analytics

## What's New

### ✅ Share Dialog Enhancements
When creating a file share, users now see:
- **Link expires on**: Date picker (defaults to 7 days from today)
- **Access Level**: Public or Password Gated
- **Access Password**: Shown when password access is selected
- **View limit**: Optional limit on number of views (set to null for unlimited)

The share link is generated with these settings stored in the database.

---

## Audit Log Details

The audit log now shows **human-friendly** information with actual details instead of just endpoints:

### Each audit event shows:
- **Event Type Badge**: `DOCUMENT`, `SHARE`, or `VIEWER`
- **Document Title**: The name of the affected document
- **Timestamp**: When the event occurred
- **Viewer Details** (for viewer events):
  - Viewer name + email (or "anonymous")
  - **IP Address**: The actual client IP (stored in plaintext for audit purposes)
  - **Browser**: Parsed from User-Agent (e.g., "Chrome on macOS", "Safari on iOS")
  - **Access Count**: Total number of times this share link was accessed
  - **Share Link**: `/v/{slug}` reference

### Example audit row:
```
📋 VIEWER   |   Viewed "Investor Pitch Deck"   |   Apr 23, 2:45 PM
  John Smith (john@company.com) • 203.0.113.42 • Chrome on macOS • Accessed 12 times via /v/aB3xY7
```

---

## Analytics Enhancements

### Metrics Overview (unchanged)
- Documents, Active Documents, Shares, Sessions, Total Views

### Top Share Links (enriched)
Each row now shows:
- **Document Title**: Name of the shared document
- **Share Slug**: `/v/{slug}` link
- **View Count**: Number of times accessed
- **Expiration Badge**: Shows expiry date if link has expiration set

### Recent Activity (NEW)
Shows last 10 viewer sessions with:
- **Document Title**: Which file was viewed
- **Viewer Identity**: Name + email (or "anonymous")
- **IP Address**: Client IP for audit trail
- **Browser**: Parsed user-agent (e.g., "Firefox on Windows")
- **Duration**: Total time spent viewing (formatted as "3m 20s")
- **Timestamp**: When the session started

---

## Database Changes

### New Column: `viewer_sessions.ip_address`
- **Purpose**: Store raw client IP address for audit purposes
- **Type**: String, nullable
- **Notes**: Separate from existing `ip_hash` which is daily-salted for privacy

### Migration Applied
```
alembic upgrade 6f8a2e9c1b4d
```
This adds the `ip_address` column to the `viewer_sessions` table.

---

## Backend API Changes

### New Endpoint: `GET /analytics/document/{doc_id}`
**Authentication**: Required (document owner only)

**Response**:
```json
{
  "document_id": "uuid",
  "document_title": "My Document",
  "shares": [
    {
      "slug": "aB3xY7",
      "expires_at": "2026-04-30T00:00:00Z",
      "is_revoked": false,
      "view_count": 12,
      "sessions": [
        {
          "viewer_name": "John Smith",
          "viewer_email": "john@company.com",
          "ip_address": "203.0.113.42",
          "user_agent": "Mozilla/5.0...",
          "started_at": "2026-04-23T14:45:00Z",
          "total_time_seconds": 200
        }
      ]
    }
  ]
}
```

### Enhanced Endpoint: `GET /admin/audit`
**Changes**:
- Now joins ShareLink and Document to get document titles
- Sessions show: `document_title`, `share_slug`, `viewer_name`, `viewer_email`, `ip_address`, `user_agent`, `access_count`
- Sample event structure:
```json
{
  "time": "2026-04-23T14:45:00Z",
  "type": "viewer",
  "document_title": "Investor Pitch",
  "share_slug": "aB3xY7",
  "viewer_name": "John Smith",
  "viewer_email": "john@company.com",
  "ip_address": "203.0.113.42",
  "user_agent": "Mozilla/5.0...",
  "access_count": 12,
  "message": "Viewed \"Investor Pitch\" via /v/aB3xY7: john@company.com from 203.0.113.42"
}
```

### Enhanced Endpoint: `GET /admin/analytics`
**Changes**:
- `top_shares`: Now includes `document_title` and `expires_at` for each share
- `viewer_sessions`: Fixed scoping bug—now only counts sessions on admin's own documents
- New field: `recent_sessions` array (last 10 sessions) with full viewer details

---

## Frontend Changes

### EditorPage.tsx
- Share dialog expanded with expiration date, password, and view limit fields
- All fields sent to backend when creating share link
- Default expiration: 7 days from today (automatically calculated)

### Dashboard.tsx
- **Audit Log** (Dashboard → Audit Logs):
  - Replaced simple text with rich multi-line event cards
  - Shows document title, viewer identity, IP, browser, access count
  
- **Analytics** (Dashboard → Operational Analytics):
  - Top Share Links: Added document titles and expiration badges
  - New Recent Activity section: Shows last 10 viewer sessions with full context

---

## Helper Functions

### `parseUserAgent(ua: string): string`
Parses browser and OS from User-Agent header and returns human-friendly string:
- Examples: "Chrome on macOS", "Safari on iOS", "Firefox on Windows"
- Detects: Chrome, Safari, Firefox, Edge, Opera, Windows, macOS, Linux, Android, iOS

### `formatDuration(seconds: number): string`
Formats seconds into human-readable duration:
- Examples: "45s", "3m 20s", "1m 0s"

---

## Privacy & Security Notes

### Raw IP Storage
- **Why**: Needed for audit purposes to track which IP accessed a file
- **Security**: IPs are only visible to document owners in their audit logs
- **Separate Hash**: Original `ip_hash` remains for daily-rotated privacy tracking

### User-Agent Parsing
- User-Agent strings are stored in plaintext in the database
- Frontend parses them into human-readable format (browser + OS)
- This provides visibility into access patterns without exposing raw headers

---

## Testing Checklist

- [ ] Create a share link → verify expiration date is set (7 days from today)
- [ ] Create password-protected share → verify password is sent to backend
- [ ] Set view limit → verify `max_views` is stored
- [ ] Access shared link → verify `viewer_sessions.ip_address` is populated
- [ ] Check Dashboard → Audit Logs → verify document title, viewer name/email, IP, browser shown
- [ ] Check Dashboard → Analytics → verify top shares show document titles and expiry
- [ ] Check Dashboard → Analytics → verify Recent Activity shows full session details
- [ ] Test with multiple viewer sessions → verify Recent Activity shows last 10

---

## Migration Steps for Existing Deployments

1. Pull latest code
2. Run alembic migration:
   ```bash
   cd backend
   alembic upgrade head
   ```
3. Restart the application
4. No additional configuration needed

The `ip_address` column will be `NULL` for existing sessions (created before migration). New sessions will have the raw IP stored.

---

## Future Enhancements

Potential improvements:
- IP geolocation (show city/country instead of raw IP)
- Session duration tracking (more accurate than 15-second heartbeat)
- Viewer heatmaps (which sections were viewed most)
- Export audit logs to CSV
- Real-time analytics dashboards
