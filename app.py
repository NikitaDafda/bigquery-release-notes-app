import time
import xml.etree.ElementTree as ET
import re
import requests
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

# In-memory cache configuration
CACHE_DURATION_SECONDS = 300  # Cache for 5 minutes
feed_cache = {
    "data": None,
    "timestamp": 0
}

# XML Namespace for Atom feed
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}

def parse_feed_content(xml_content):
    """
    Parses the Atom XML feed and splits grouped entry updates into individual
    release note items categorized by their type (Feature, Announcement, etc.).
    """
    root = ET.fromstring(xml_content)
    notes = []
    
    # Iterate over each <entry> in the Atom feed
    for entry in root.findall("atom:entry", ATOM_NS):
        # Extract Entry Title (usually the date, e.g. "July 14, 2026")
        title_elem = entry.find("atom:title", ATOM_NS)
        date_str = title_elem.text.strip() if title_elem is not None else "Unknown Date"
        
        # Extract Alternate Link URL
        link_elem = entry.find("atom:link[@rel='alternate']", ATOM_NS)
        if link_elem is None:
            link_elem = entry.find("atom:link", ATOM_NS)
        link_url = link_elem.attrib.get("href", "").strip() if link_elem is not None else ""
        
        # Extract Entry Content (contains HTML with release note details)
        content_elem = entry.find("atom:content", ATOM_NS)
        if content_elem is None or not content_elem.text:
            continue
            
        html_content = content_elem.text
        soup = BeautifulSoup(html_content, "html.parser")
        
        current_category = "General"
        current_elements = []
        
        def save_current_item():
            if current_elements or current_category != "General":
                # Convert accumulated BeautifulSoup element nodes back to HTML string
                item_html = "".join(str(elem) for elem in current_elements).strip()
                # If there's no HTML content, don't create an empty entry
                if not item_html:
                    return
                
                # Get a clean plain-text version for search and description snippet (e.g. for Twitter preview)
                clean_text = BeautifulSoup(item_html, "html.parser").get_text(separator=" ").strip()
                clean_text = re.sub(r"\s+", " ", clean_text)  # Normalize whitespaces
                
                notes.append({
                    "date": date_str,
                    "category": current_category,
                    "content_html": item_html,
                    "content_text": clean_text,
                    "url": link_url
                })
        
        # Walk through top-level elements inside the feed entry HTML content
        for child in soup.contents:
            if child.name == "h3":
                # Save previous item since we encountered a new header
                save_current_item()
                
                # Update current category based on header content (e.g. Feature, Announcement, Security, Change)
                current_category = child.get_text().strip()
                current_elements = []
            elif child.name is not None:
                current_elements.append(child)
            elif isinstance(child, str) and child.strip():
                current_elements.append(child)
                
        # Save the final item for this entry
        save_current_item()
        
    return notes

@app.route("/")
def index():
    """Serves the main application landing page."""
    return render_template("index.html")

@app.route("/api/notes")
def get_notes():
    """
    Fetches, parses, and returns the BigQuery release notes.
    Leverages in-memory caching to avoid rate-limiting or heavy GCP feed load.
    Supports a '?refresh=true' parameter to bypass cache and query feed live.
    """
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    current_time = time.time()
    
    # Check if we should serve from cache
    if not force_refresh and feed_cache["data"] and (current_time - feed_cache["timestamp"] < CACHE_DURATION_SECONDS):
        return jsonify({
            "status": "success",
            "source": "cache",
            "notes": feed_cache["data"]
        })
        
    try:
        # Fetch the official BigQuery Release Notes RSS/Atom XML feed
        response = requests.get("https://docs.cloud.google.com/feeds/bigquery-release-notes.xml", timeout=12)
        response.raise_for_status()
        
        parsed_notes = parse_feed_content(response.content)
        
        # Update cache
        feed_cache["data"] = parsed_notes
        feed_cache["timestamp"] = current_time
        
        return jsonify({
            "status": "success",
            "source": "fresh",
            "notes": parsed_notes
        })
    except Exception as e:
        # Fallback to local feed_fallback.xml if it exists
        try:
            import os
            # First check if the fallback file is in the current working directory or template folders
            fallback_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "feed_fallback.xml")
            if os.path.exists(fallback_path):
                with open(fallback_path, "rb") as f:
                    fallback_content = f.read()
                parsed_notes = parse_feed_content(fallback_content)
                
                # Cache the parsed notes to prevent subsequent rate-limiting spam
                feed_cache["data"] = parsed_notes
                feed_cache["timestamp"] = current_time
                
                return jsonify({
                    "status": "warning",
                    "message": f"Could not refresh live feed ({str(e)}). Serving offline backup data.",
                    "source": "offline_fallback",
                    "notes": parsed_notes
                })
        except Exception as fallback_err:
            print(f"Fallback reading error: {fallback_err}")
            
        # Fallback to in-memory cache if request fails but we have stale cached data
        if feed_cache["data"]:
            return jsonify({
                "status": "warning",
                "message": f"Could not refresh live feed ({str(e)}). Serving cached release notes.",
                "source": "cache_fallback",
                "notes": feed_cache["data"]
            })
            
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch release notes feed: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
