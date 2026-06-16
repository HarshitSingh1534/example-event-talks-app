import time
import urllib.parse
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0,
    "error": None
}
CACHE_EXPIRY = 300  # 5 minutes cache

def parse_release_notes(xml_content):
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    root = ET.fromstring(xml_content)
    
    entries = []
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        date_str = title.text if title is not None else "Unknown Date"
        
        updated_elem = entry.find('atom:updated', ns)
        updated_time = updated_elem.text if updated_elem is not None else ""
        
        link_elem = entry.find('atom:link', ns)
        link = link_elem.attrib.get('href', '') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse content and split updates by h3
        soup = BeautifulSoup(content_html, 'html.parser')
        updates = []
        
        current_type = "Update"
        current_content = []
        
        # ID counter for unique identification of updates
        update_id_prefix = date_str.lower().replace(" ", "_").replace(",", "")
        
        def save_current_update(idx):
            if current_content:
                html_snippet = "".join(str(c) for c in current_content)
                text_snippet = "".join(c.get_text() if hasattr(c, 'get_text') else str(c) for c in current_content).strip()
                
                # Clean up multiple whitespaces/newlines
                text_snippet = " ".join(text_snippet.split())
                
                updates.append({
                    'id': f"{update_id_prefix}_{idx}",
                    'type': current_type,
                    'html': html_snippet,
                    'text': text_snippet
                })

        update_idx = 0
        for child in soup.contents:
            if child.name == 'h3':
                save_current_update(update_idx)
                update_idx += 1
                current_type = child.get_text().strip()
                current_content = []
            else:
                if str(child).strip():
                    current_content.append(child)
        
        # Save last update
        save_current_update(update_idx)
        
        entries.append({
            'date': date_str,
            'updated': updated_time,
            'link': link,
            'updates': updates
        })
        
    return entries

def get_feed_data(force=False):
    now = time.time()
    if force or not cache["data"] or (now - cache["last_fetched"] > CACHE_EXPIRY):
        try:
            response = requests.get(FEED_URL, timeout=15)
            response.raise_for_status()
            cache["data"] = parse_release_notes(response.content)
            cache["last_fetched"] = now
            cache["error"] = None
        except Exception as e:
            # If fetch fails, fallback to cached data if available, but log/return error
            if cache["data"]:
                cache["error"] = f"Failed to fetch latest feed, using cached data: {str(e)}"
            else:
                cache["data"] = []
                cache["error"] = f"Failed to load feed: {str(e)}"
    return cache["data"], cache["last_fetched"], cache.get("error")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    data, last_fetched, error = get_feed_data(force=force_refresh)
    return jsonify({
        "releases": data,
        "last_fetched": last_fetched,
        "error": error
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
