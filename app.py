import os
import io
import csv
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

from nlp_engine import HateSpeechEngine
from instagram_scraper import InstagramScraper

app = FastAPI(
    title="NLP Hate Speech Detection & Social Media Moderation",
    description="Automated 3-class hate speech detection system for Instagram comments",
    version="1.0.0"
)

# Initialize singletons
nlp_engine = HateSpeechEngine.get_instance()
instagram_scraper = InstagramScraper()

# Request Models
class SingleCommentRequest(BaseModel):
    text: str

class InstagramScrapeRequest(BaseModel):
    url: str
    max_comments: Optional[int] = 50

class BatchCommentsRequest(BaseModel):
    comments: List[str]

class ExportRequest(BaseModel):
    comments: List[dict]
    format: Optional[str] = "csv"

# API Endpoints
@app.post("/api/analyze-comment")
def analyze_single_comment(payload: SingleCommentRequest):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Comment text cannot be empty.")
    result = nlp_engine.analyze_comment(payload.text)
    return result

@app.post("/api/scrape-instagram")
def scrape_and_moderate_instagram(payload: InstagramScrapeRequest):
    if not payload.url.strip():
        raise HTTPException(status_code=400, detail="Instagram URL is required.")

    try:
        scraped_data = instagram_scraper.scrape_comments(
            url_or_code=payload.url,
            max_comments=payload.max_comments or 30
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping error: {str(e)}")

    # Moderation analysis on comments
    analysis = nlp_engine.analyze_batch(scraped_data["comments"])

    # Combine post metadata and moderation results
    response = {
        "post_info": {
            "source_url": scraped_data["source_url"],
            "shortcode": scraped_data["shortcode"],
            "post_title": scraped_data["post_title"],
            "caption": scraped_data["caption"],
            "author": scraped_data["author"],
            "likes_count": scraped_data["likes_count"],
            "extraction_mode": scraped_data["extraction_mode"],
            "status_message": scraped_data["status_message"]
        },
        "moderation_summary": {
            "total_comments": analysis["total_comments"],
            "summary_counts": analysis["summary_counts"],
            "percentages": analysis["percentages"],
            "average_severity": analysis["average_severity"],
            "post_status": analysis["post_status"],
            "post_badge": analysis["post_badge"]
        },
        "comments": analysis["comments"]
    }
    return response

@app.post("/api/analyze-batch")
def analyze_custom_batch(payload: BatchCommentsRequest):
    if not payload.comments:
        raise HTTPException(status_code=400, detail="Comments list cannot be empty.")

    cleaned_list = [c.strip() for c in payload.comments if c.strip()]
    if not cleaned_list:
        raise HTTPException(status_code=400, detail="No valid comments provided.")

    analysis = nlp_engine.analyze_batch(cleaned_list)
    return analysis

@app.get("/api/presets")
def get_preset_posts():
    return {"presets": instagram_scraper.get_presets()}

@app.get("/api/model-info")
def get_model_telemetry():
    telemetry = nlp_engine.get_model_telemetry()
    return telemetry

@app.post("/api/export")
def export_comments(payload: ExportRequest):
    if payload.format == "json":
        content = json.dumps(payload.comments, indent=2)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=moderation_report.json"}
        )

    # Default CSV Export
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Author", "Comment Text", "Classification", "Confidence", "Severity (0-100)", "Moderation Action", "Hate Proba", "Offensive Proba", "Normal Proba"])

    for c in payload.comments:
        writer.writerow([
            c.get("id", ""),
            c.get("author", "unknown"),
            c.get("raw_text", c.get("text", "")).replace("\n", " "),
            c.get("label", ""),
            c.get("confidence", 0),
            c.get("severity_score", 0),
            c.get("action", ""),
            c.get("probabilities", {}).get("Hate Speech", 0),
            c.get("probabilities", {}).get("Offensive Language", 0),
            c.get("probabilities", {}).get("Normal Speech", 0)
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=moderation_report.csv"}
    )

# Static file serving
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>Hate Speech Moderation Server Running</h1><p>Frontend static files loading...</p>")

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
