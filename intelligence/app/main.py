from fastapi import FastAPI

from app.routers import companies, discovery, jobs

app = FastAPI(title="Fairway Company Intelligence API", version="0.1.0")

app.include_router(discovery.router)
app.include_router(companies.router)
app.include_router(jobs.router)


@app.get("/healthz", tags=["meta"])
def healthz():
    return {"status": "ok"}
