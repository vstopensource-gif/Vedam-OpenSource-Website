# Data Fetching and Storage Documentation

## Overview
This document lists all data fetched from GitHub API, stored in Firebase, and used in analytics/stats.

---

## 🔄 Data Fetched from GitHub API

### 1. User Activity Snapshot (`getUserActivitySnapshot`)
**Source:** GraphQL API + REST API  
**Fetched Fields:**
- `publicRepos` - Public repositories count (from REST API)
- `followers` - Followers count (from REST API)
- `following` - Following count (from REST API)
- `contributions` - Lifetime contributions (from `contributionCalendar.totalContributions`)
- `commits` - Lifetime commits (from `totalCommitContributions`)
- `pullRequests` - Total PRs count (open + merged + closed)
- `mergedPRs` - Merged PRs count
- `openPRs` - Open PRs count
- `closedPRs` - Closed PRs count
- `issues` - Total issues count
- `recentPRs` - Array of recent PR objects with `created_at` timestamps

### 2. User Repositories (`fetchUserRepositories`)
**Source:** REST API  
**Fetched Fields (per repository):**
- `id` - Repository ID
- `name` - Repository name
- `full_name` - Full repository name (owner/repo)
- `description` - Repository description
- `url` - Repository HTML URL
- `language` - Primary language (null if not available)
- `stars` - Stargazers count
- `forks` - Forks count
- `open_issues` - Open issues count
- `is_private` - Boolean for private/public
- `created_at` - Creation date
- `updated_at` - Last update date
- `pushed_at` - Last push date
- `default_branch` - Default branch name

**Calculated from Repositories:**
- `totalStars` - Sum of all repository stars
- `totalForks` - Sum of all repository forks
- `privateRepos` - Count of private repositories

### 3. Contribution Calendar (`fetchContributionCalendar`)
**Source:** GraphQL API  
**Fetched Fields:**
- `totalContributions` - Total contributions in last year
- `weeks` - Array of week objects containing:
  - `contributionDays` - Array of day objects with:
    - `date` - Date string
    - `contributionCount` - Contributions on that day
    - `color` - Color hex code for visualization

### 4. User Languages (`fetchUserLanguages`)
**Source:** REST API (Languages endpoint per repository)  
**Fetched Fields:**
- Object with language names as keys and bytes as values
- Example: `{ "JavaScript": 1500000, "TypeScript": 500000, ... }`
- Filters out: `null`, empty strings, and `"Unknown"` languages

### 5. Recent Commits (`fetchRecentCommits`)
**Source:** REST API  
**Fetched Fields (per commit):**
- `sha` - Commit SHA
- `message` - Commit message (first line only)
- `author` - Author name
- `date` - Commit date
- `url` - Commit HTML URL
- `repository` - Repository full name
- `repositoryUrl` - Repository HTML URL

### 6. User Pull Requests (`fetchUserPullRequests`)
**Source:** GraphQL API  
**Fetched Fields (per PR):**
- `id` - PR ID
- `number` - PR number
- `title` - PR title
- `body` - PR body
- `url` - PR HTML URL
- `state` - PR state (open/closed)
- `merged` - Boolean indicating if merged
- `mergedAt` - Merge date (if merged)
- `createdAt` - Creation date
- `updatedAt` - Last update date
- `repository.nameWithOwner` - Repository name

---

## 💾 Data Stored in Firebase

### Member Document Structure
**Collection:** `Members`  
**Document ID:** `{memberId}`

#### Top Level Fields:
- `id` - Member ID
- `githubConnected` - Boolean
- `githubUsername` - GitHub username
- `lastUpdated` - ISO timestamp string

#### `githubActivity` Object (Stored in Firebase):
All fields below are stored in `member.githubActivity`:

```javascript
{
  // Repository Stats
  "publicRepos": number,              // Public repositories count
  "privateRepos": number,              // Private repositories count
  
  // Social Stats
  "followers": number,                 // Followers count
  "following": number,                 // Following count
  
  // Contribution Stats
  "contributions": number,             // Lifetime contributions (from contributionCalendar.totalContributions)
  "commits": number,                   // Lifetime commits (from totalCommitContributions)
  
  // Pull Request Stats
  "pullRequests": number,              // Total PRs (open + merged + closed)
  "mergedPRs": number,                 // Merged PRs count
  "openPRs": number,                    // Open PRs count
  "closedPRs": number,                  // Closed PRs count
  
  // Other Stats
  "issues": number,                    // Total issues count
  
  // Repository Aggregates
  "totalStars": number,                // Sum of all repository stars
  "totalForks": number,                // Sum of all repository forks
  
  // Language Data
  "languages": {                       // Object with language names and bytes
    "JavaScript": number,
    "TypeScript": number,
    ...
  },
  
  // Contribution Calendar
  "contributionCalendar": {             // Calendar data for last year
    "totalContributions": number,
    "weeks": [
      {
        "contributionDays": [
          {
            "date": "ISO date string",
            "contributionCount": number,
            "color": "hex color string"
          }
        ]
      }
    ]
  },
  
  // Recent PRs
  "recentPRs": [                       // Array of recent PR objects
    {
      "created_at": "ISO date string"
    }
  ],
  
  // Metadata
  "lastUpdated": "ISO timestamp string"
}
```

---

## 📊 ClubStats Document Structure

**Collection:** `ClubStats`  
**Document ID:** `main`

```javascript
{
  "calculatedAt": "ISO timestamp string",    // When stats were calculated
  "events": number,                          // Events count (preserved from existing)
  "lastUpdated": "ISO timestamp string",     // Last update timestamp
  "members": number,                         // Total members count
  "membersWithGitHub": number,               // Members with GitHub connected
  "projects": number,                         // Total repositories (public + private)
  "stars": number,                            // Total stars across all members
  "totalCommits": number,                     // Total commits across all members
  "totalForks": number,                       // Total forks across all members
  "totalPullRequests": number                 // Total PRs across all members
}
```

**Note:** `totalCommits` in ClubStats uses `member.githubActivity.commits` (not contributions)

---

## 📈 Analytics & Stats Data Usage

### Analytics Page Calculations

#### 1. Repository Statistics Chart
**Uses:**
- `member.githubActivity.publicRepos`
- `member.githubActivity.privateRepos`
- `member.githubActivity.totalStars`
- `member.githubActivity.totalForks`
- `member.githubActivity.pullRequests`
- `member.githubActivity.commits`

#### 2. Language Distribution Chart
**Uses:**
- `member.githubActivity.languages` (object with language names and bytes)

#### 3. Top Contributors List
**Uses:**
- `member.githubActivity.contributions`
- `member.githubActivity.publicRepos`

#### 4. Top Committers List
**Uses:**
- `member.githubActivity.commits`
- `member.githubActivity.contributions`

#### 5. Top PR Creators List
**Uses:**
- `member.githubActivity.pullRequests`
- `member.githubActivity.mergedPRs`
- `member.githubActivity.openPRs`
- `member.githubActivity.closedPRs`

#### 6. Activity Summary Stats
**Uses:**
- `member.githubActivity.publicRepos` + `member.githubActivity.privateRepos` → Total Repos
- `member.githubActivity.totalStars` → Total Stars
- `member.githubActivity.contributions` → Total Contributions
- `member.githubActivity.pullRequests` → Total PRs
- `member.githubActivity.commits` → Total Commits
- `member.githubActivity.issues` → Total Issues
- `member.githubActivity.totalForks` → Total Forks

**Calculates Averages:**
- Average Repos = Total Repos / Member Count
- Average Stars = Total Stars / Member Count
- Average Contributions = Total Contributions / Member Count
- Average PRs = Total PRs / Member Count

#### 7. Language Statistics
**Uses:**
- `member.githubActivity.languages` (aggregates bytes per language across all members)

#### 8. PR Activity Chart
**Uses:**
- `member.githubActivity.pullRequests`
- `member.githubActivity.openPRs`
- `member.githubActivity.mergedPRs`
- `member.githubActivity.closedPRs`

#### 9. Contributor Activity Chart
**Uses:**
- `member.githubActivity.contributions`
- `member.githubActivity.pullRequests`

#### 10. Contributions Trends Chart (Dashboard)
**Uses:**
- `member.githubActivity.contributionCalendar.weeks` (for accurate daily counts)
- Falls back to `member.githubActivity.contributions` (even distribution) if calendar not available

---

## 🔍 Dashboard Page Calculations

### Dashboard Stats
**Uses:**
- `member.githubActivity.publicRepos` + `member.githubActivity.privateRepos` → Total Repos
- `member.githubActivity.totalStars` → Total Stars
- `member.githubActivity.pullRequests` → Total PRs
- `member.githubActivity.contributions` → Total Contributions
- `member.githubActivity.commits` → Total Commits

### Top Contributors (Dashboard)
**Uses:**
- `member.githubActivity.contributions`
- `member.githubActivity.publicRepos` + `member.githubActivity.privateRepos`

### Top Committers (Dashboard)
**Uses:**
- `member.githubActivity.commits`
- `member.githubActivity.contributions`

---

## 📋 Members Page Calculations

### Members Table Stats
**Uses:**
- `member.githubActivity.publicRepos` + `member.githubActivity.privateRepos` → Total Repos
- `member.githubActivity.totalStars` → Total Stars
- `member.githubActivity.contributions` → Contributions
- `member.githubActivity.commits` → Commits
- `member.githubActivity.pullRequests` → Pull Requests

### Members Page Summary Stats
**Uses:**
- `member.githubActivity.publicRepos` + `member.githubActivity.privateRepos` → Total Repos
- `member.githubActivity.totalStars` → Total Stars
- `member.githubActivity.pullRequests` → Total PRs
- `member.githubActivity.contributions` → Total Contributions
- `member.githubActivity.commits` → Total Commits

---

## 🎯 Member Details Page Data

### GitHub Statistics
**Uses:**
- `member.githubActivity.publicRepos`
- `member.githubActivity.privateRepos`
- `member.githubActivity.followers`
- `member.githubActivity.following`
- `member.githubActivity.totalStars`
- `member.githubActivity.contributions`
- `member.githubActivity.commits`
- `member.githubActivity.pullRequests`

### Contribution Calendar
**Uses:**
- `member.githubActivity.contributionCalendar.weeks` (fetches if not stored)

### Recent Commits
**Fetches:** `fetchRecentCommits()` (not stored in Firebase, fetched on-demand)

---

## ⚠️ Important Notes

### Contributions vs Commits
- **Contributions:** Uses `contributionCalendar.totalContributions` (matches GitHub profile count)
  - Includes: commits, PRs, issues, reviews, repository creations
  - Stored as: `member.githubActivity.contributions`
  
- **Commits:** Uses `totalCommitContributions` (only commits)
  - Stored as: `member.githubActivity.commits`
  - **Commits are a subset of Contributions**

### Data Refresh
- **Manual Refresh:** Fetches all data and updates Firebase
- **Background Refresh:** Only updates profile info (followers, following, public repos)
- **Calendar Data:** Stored during manual refresh, fetched on-demand if missing

### Language Data
- Stored as object with language names as keys and bytes as values
- Filters out: `null`, empty strings, `"Unknown"`
- Used for language distribution charts and statistics

### Calendar Data
- Stored for last year (365 days)
- Used for contribution heatmap visualization
- Used for accurate daily contribution trends in dashboard

---

## 📝 Summary

**Firebase Field Names (Exact):**
- `publicRepos`
- `privateRepos`
- `followers`
- `following`
- `contributions`
- `commits`
- `pullRequests`
- `mergedPRs`
- `openPRs`
- `closedPRs`
- `issues`
- `totalStars`
- `totalForks`
- `languages`
- `contributionCalendar`
- `recentPRs`
- `lastUpdated`

**ClubStats Field Names (Exact):**
- `calculatedAt`
- `events`
- `lastUpdated`
- `members`
- `membersWithGitHub`
- `projects`
- `stars`
- `totalCommits`
- `totalForks`
- `totalPullRequests`

