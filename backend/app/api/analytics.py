from fastapi import APIRouter
router = APIRouter()

@router.get("/document/{doc_id}")
async def get_document_analytics(doc_id: str):
    return {"message": "Not implemented"}
