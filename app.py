from flask import Flask, jsonify, render_template
import urllib.request
import xml.etree.ElementTree as ET
import re
import html

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_text(html_content):
    # Remove HTML tags to get plain text for Twitter
    text = re.sub(r'<[^>]+>', '', html_content)
    # Unescape HTML entities
    text = html.unescape(text)
    # Collapse multiple whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            xml_data = r.read()
        
        root = ET.fromstring(xml_data)
        ns = "{http://www.w3.org/2005/Atom}"
        
        releases = []
        
        for entry in root.findall(f'.//{ns}entry'):
            title_el = entry.find(f'{ns}title')
            date_str = title_el.text if title_el is not None else "Unknown Date"
            
            updated_el = entry.find(f'{ns}updated')
            updated_date = updated_el.text if updated_el is not None else ""
            
            id_el = entry.find(f'{ns}id')
            entry_id = id_el.text if id_el is not None else ""
            
            content_el = entry.find(f'{ns}content')
            content_html = content_el.text if content_el is not None else ""
            
            # Split the content html into sections by <h3> tags
            parts = re.split(r'(<h3>.*?</h3>)', content_html)
            
            current_type = "Update"
            for part in parts:
                part = part.strip()
                if not part:
                    continue
                if part.startswith("<h3>") and part.endswith("</h3>"):
                    current_type = part.replace("<h3>", "").replace("</h3>", "").strip()
                else:
                    plain_text = clean_html_text(part)
                    releases.append({
                        "date": date_str,
                        "updated_date": updated_date,
                        "id": entry_id,
                        "type": current_type,
                        "content_html": part,
                        "plain_text": plain_text
                    })
                    
        return jsonify({"success": True, "releases": releases})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
