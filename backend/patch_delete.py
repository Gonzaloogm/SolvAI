with open("app/api/data_sources.py", "r") as f:
    content = f.read()

import_statement = "from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form"
if "from fastapi import" in content and "status" not in import_statement:
    content = content.replace("from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form", "from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form, status")

delete_endpoint = """
@router.delete("/{source_type}")
async def delete_data_source(
    source_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    source_type = source_type.upper()
    if source_type not in _VALID_TYPES:
        raise HTTPException(status_code=400, detail="Invalid source type")
    
    # Delete all instances of this source_type for the user (handles duplicates)
    db.query(FinancialDataSource).filter(
        FinancialDataSource.user_id == current_user.id,
        FinancialDataSource.source_type == source_type.lower()
    ).delete(synchronize_session=False)
    db.commit()
    
    return {"message": f"Successfully deleted {source_type}"}

_VALID_TYPES"""

content = content.replace("_VALID_TYPES", delete_endpoint)

with open("app/api/data_sources.py", "w") as f:
    f.write(content)
