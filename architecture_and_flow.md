# 🧠 System Architecture & Data Flow

This document outlines the detailed architectural design, structural breakdown, and communication flows of the BigQuery Release Notes Hub.

---

## 🏗️ Architectural Overview

The application utilizes a lightweight client-server architecture. The Flask backend acts as a parsing and caching proxy, while the frontend handles all rendering, search indexing, and interactive composition.

```mermaid
graph TD
    subgraph Client [Client-Side Browser]
        UI[User Interface - HTML5]
        CSS[Theme & Micro-Animations - CSS3]
        JS[State, Filter, & Compose Engine - ES6 JS]
        UI --> JS
        CSS --> UI
    end

    subgraph Server [Flask Web Server]
        API[API Endpoints - app.py]
        Cache[(In-Memory Cache)]
        Parser[XML Feed & BeautifulSoup Parser]
        API <--> Cache
        API <--> Parser
    end

    subgraph External [Google Cloud & Twitter]
        RSS[BigQuery Release XML Feed]
        XAPI[X/Twitter Web Intent URL]
    end

    JS -- HTTP Requests --> API
    Parser -- Fetch Feed --> RSS
    JS -- Share Intent --> XAPI
```

---

## 🗂️ Component Breakdown

### 1. Backend Server (`Python Flask`)
Located in [app.py](file:///C:/Users/Harshit%20Singh/Desktop/Learning/agy2-project/my-second-project/app.py), the backend handles content retrieval, normalization, and delivery optimization:

* **XML Feed Parser**: Downloads the raw RSS/Atom feed from Google Cloud. It utilizes Python's built-in `xml.etree.ElementTree` to parse the Atom wrapper tags.
* **Granular BeautifulSoup Splitter**: The feed contains daily release logs containing multiple items inside `<content type="html">`. The backend walks through this HTML and splits it using `<h3>` tags as element markers. This isolates individual updates (e.g. separates "Feature" from "Issue") so they can be selected individually.
* **In-Memory Cache System**: Stores a global dictionary (`data`, `last_fetched`, `error`). The cache expires after 5 minutes (300 seconds) to prevent redundant network requests and avoid rate limits. It can be bypassed using the `?refresh=true` query parameter.

### 2. Frontend Client (`Vanilla HTML, CSS, JS`)
Located in [templates/index.html](file:///C:/Users/Harshit%20Singh/Desktop/Learning/agy2-project/my-second-project/templates/index.html), [style.css](file:///C:/Users/Harshit%20Singh/Desktop/Learning/agy2-project/my-second-project/static/css/style.css), and [app.js](file:///C:/Users/Harshit%20Singh/Desktop/Learning/agy2-project/my-second-project/static/js/app.js):

* **User Interface Structure**: Employs semantic HTML5 markup featuring a main sidebar control panel (keyword search, badge filters, date links) and a main scrollable timeline stream.
* **Styling (CSS Variables & Easing)**: Designed using high-fidelity dark-mode aesthetics. Implements CSS Grid for responsiveness, glassmorphism filters (`backdrop-filter`), custom variables for dynamic badges (Feature, Issue, Deprecation), card border glow indicators, and rotation animations.
* **Interactive State Engine**: Written in vanilla ES6 JavaScript to coordinate user interaction:
  * **Local Search & Filter**: Dynamically matches entries against active search tokens and categorizations without reloading the page.
  * **Selection Tracker**: Maintains a unique `Set` of active card IDs. When cards are selected, it dynamically controls the visibility and metrics of the bottom action bar.
  * **Tweet Composer Logic**: Gathers selected cards, constructs structured text, auto-appends official links and tags, and applies smart truncation (appending `...` before tags) if the draft exceeds 280 characters.

---

## 🔄 End-to-End Sequence Flows

### Sequence A: Fetching & Refreshing Releases
This sequence describes what happens when a user clicks the **Refresh** button to sync data.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Client Browser (app.js)
    participant Server as Flask Server (app.py)
    participant Google as Google Cloud Feed

    User->>Browser: Clicks "Refresh" Button
    activate Browser
    Browser->>Browser: Set UI to Loading (Spin Icon, Show Loading Overlay)
    Browser->>Server: HTTP GET /api/releases?refresh=true
    activate Server
    Server->>Google: Fetch https://docs.cloud.google.com/...xml
    activate Google
    Google-->>Server: XML Feed Data (200 OK)
    deactivate Google
    Server->>Server: Parse XML (ElementTree) & Split Updates (BeautifulSoup)
    Server->>Server: Overwrite In-Memory Cache & Update Last Synced Time
    Server-->>Browser: JSON Payload (Releases Array + sync_timestamp)
    deactivate Server
    Browser->>Browser: Update State (releaseData = response.releases)
    Browser->>Browser: Re-render DOM (Timeline cards & Sidebar date index)
    Browser->>Browser: Stop Spinner & Show Success Toast Notification
    deactivate Browser
```

---

### Sequence B: Composing & Sharing a Tweet
This sequence describes how selection, draft generation, and Twitter/X redirects are executed.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser as Client Browser (app.js)
    participant Modal as Compose Modal (UI)
    participant Twitter as Twitter / X Web Intent

    User->>Browser: Clicks individual cards to select updates
    Browser->>Browser: Add IDs to selectedUpdateIds Set
    Browser->>Browser: Update Selection Count & Show Floating Bottom Bar
    User->>Browser: Clicks "Tweet Selected"
    activate Browser
    Browser->>Browser: Retrieve updates from state matching IDs in Set
    Browser->>Browser: Format tweet string with date, type prefix, body, source link, & hashtags
    Browser->>Browser: Validate 280-char limit (Truncate description if necessary)
    Browser->>Modal: Populate Textarea & Render live char count
    Browser->>Modal: Display Slide-in Modal
    deactivate Browser
    User->>Modal: Edits draft text (if desired)
    Modal->>Browser: Update live character count and buttons validation state
    User->>Modal: Clicks "Post to X"
    activate Browser
    Browser->>Twitter: Open New Tab: https://twitter.com/intent/tweet?text={urlencoded_draft}
    deactivate Browser
```
