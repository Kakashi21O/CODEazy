from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from app.routers import auth, course, progress, teacher, admin, notes_upload

app = FastAPI(title="CODEazy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(course.router, prefix="/api/courses", tags=["courses"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])
app.include_router(teacher.router, prefix="/api/teachers", tags=["teachers"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(notes_upload.router, prefix="/api/notes", tags=["notes"])

PUBLIC_DIR = Path(__file__).resolve().parent / "public"
PDFS_DIR = Path(__file__).resolve().parent / "server" / "data" / "pdfs"

app.mount("/api/pdfs", StaticFiles(directory=PDFS_DIR), name="pdfs")
app.mount("/css", StaticFiles(directory=PUBLIC_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=PUBLIC_DIR / "js"), name="js")
app.mount("/images", StaticFiles(directory=PUBLIC_DIR / "images"), name="images")

@app.get("/{filename}.html")
def serve_html(filename: str):
    file_path = PUBLIC_DIR / f"{filename}.html"
    if file_path.exists():
        return FileResponse(file_path)
    return FileResponse(PUBLIC_DIR / "home.html")

@app.get("/")
def serve_index():
    return FileResponse(PUBLIC_DIR / "home.html")

@app.get("/{path:path}")
def catch_all(path: str):
    file_path = PUBLIC_DIR / path
    if file_path.exists():
        return FileResponse(file_path)
    return FileResponse(PUBLIC_DIR / "home.html")
