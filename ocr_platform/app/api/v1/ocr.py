import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.accounts.models import ApiKey, User
from app.advisor.models import Document
from app.billing.service import generate_api_key
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.ocr_engine.models import OcrJob, UsageEvent
from app.ocr_engine.schemas import OcrJobCreate, OcrJobResponse
from app.ocr_engine.service import create_demo_job, get_job_result, process_ocr_job
from app.registry.models import Tier
from app.registry.service import registry_service

router = APIRouter(tags=["ocr", "dashboard"])


@router.post("/ocr/jobs/", response_model=OcrJobResponse, status_code=status.HTTP_202_ACCEPTED)
def submit_ocr_job(
    data: OcrJobCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .filter(Document.id == uuid.UUID(data.document_id), Document.user_id == user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    sub = user.subscription
    if sub and sub.quota_used >= sub.quota_limit:
        raise HTTPException(status_code=403, detail="Quota exceeded")

    tier_slug = data.tier_slug or "basic"
    if not data.tier_slug and sub and sub.tier_id:
        tier_obj = db.query(Tier).filter(Tier.id == sub.tier_id).first()
        if tier_obj:
            tier_slug = tier_obj.slug
    tier = registry_service.get_tier_by_slug(db, tier_slug)
    match = registry_service.select_engine_for_document(db, tier_slug, doc.fingerprint_json)

    job = OcrJob(
        user_id=user.id,
        document_id=doc.id,
        tier_id=tier.id if tier else None,
        engine_id=match.engine.id if match else None,
        job_type="production",
        status="queued",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        from workers.celery_app import process_ocr_job_task
        process_ocr_job_task.delay(str(job.id))
    except Exception:
        process_ocr_job(db, str(job.id))
        db.refresh(job)

    if sub:
        sub.quota_used += doc.page_count or 1
        db.commit()

    return _job_response(job, db)


@router.get("/ocr/jobs/{job_id}/", response_model=OcrJobResponse)
def get_ocr_job(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = (
        db.query(OcrJob)
        .filter(OcrJob.id == uuid.UUID(job_id), OcrJob.user_id == user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_response(job, db)


@router.get("/dashboard/usage/")
def get_usage(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = user.subscription
    tier_slug = tier_name = None
    if sub and sub.tier_id:
        tier = db.query(Tier).filter(Tier.id == sub.tier_id).first()
        if tier:
            tier_slug = tier.slug
            tier_name = tier.public_name

    month_start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    jobs_count = (
        db.query(func.count(OcrJob.id))
        .filter(OcrJob.user_id == user.id, OcrJob.created_at >= month_start)
        .scalar()
    )

    return {
        "quota_used": sub.quota_used if sub else 0,
        "quota_limit": sub.quota_limit if sub else 50,
        "tier_slug": tier_slug,
        "tier_name": tier_name,
        "jobs_this_month": jobs_count or 0,
    }


@router.get("/dashboard/jobs/")
def job_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    jobs = (
        db.query(OcrJob)
        .filter(OcrJob.user_id == user.id)
        .order_by(OcrJob.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": str(j.id),
            "status": j.status,
            "job_type": j.job_type,
            "pages_processed": j.pages_processed,
            "created_at": j.created_at.isoformat(),
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]


@router.get("/dashboard/api-keys/")
def list_api_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    keys = db.query(ApiKey).filter(ApiKey.user_id == user.id).all()
    return [
        {
            "id": str(k.id),
            "name": k.name,
            "key_prefix": k.key_prefix,
            "is_active": k.is_active,
            "created_at": k.created_at.isoformat(),
        }
        for k in keys
    ]


@router.post("/dashboard/api-keys/", status_code=status.HTTP_201_CREATED)
def create_api_key(
    name: str = "Default",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raw, key_hash, prefix = generate_api_key()
    api_key = ApiKey(user_id=user.id, key_hash=key_hash, key_prefix=prefix, name=name)
    db.add(api_key)
    db.commit()
    return {
        "id": str(api_key.id),
        "name": api_key.name,
        "key_prefix": prefix,
        "key": raw,
        "is_active": True,
        "created_at": api_key.created_at.isoformat(),
    }


def _job_response(job: OcrJob, db: Session) -> OcrJobResponse:
    result = None
    if job.status == "completed":
        result = get_job_result(db, job.id)
    return OcrJobResponse(
        id=str(job.id),
        status=job.status,
        job_type=job.job_type,
        pages_processed=job.pages_processed,
        result=result,
        error_message=job.error_message,
    )
# Hunyuan OCR endpoint temporarily disabled - requires specific transformers version or custom model
# Uncomment and configure when HunYuanVLForConditionalGeneration is available

# import torch
# from transformers import AutoProcessor, HunYuanVLForConditionalGeneration
# from fastapi import File, UploadFile
# from PIL import Image
#
#
# def clean_repeated_substrings(text: str) -> str:
#     """Clean repeated substrings in text"""
#     n = len(text)
#     if n < 8000:
#         return text
#     for length in range(2, n // 10 + 1):
#         candidate = text[-length:]
#         count = 0
#         i = n - length
#         while i >= 0 and text[i:i + length] == candidate:
#             count += 1
#             i -= length
#         if count >= 10:
#             return text[:n - length * (count - 1)]
#     return text
#
# # Load model globally
# model_name_or_path = "tencent/HunyuanOCR"
# processor = AutoProcessor.from_pretrained(model_name_or_path, use_fast=False)
# model = HunYuanVLForConditionalGeneration.from_pretrained(
#     model_name_or_path,
#     attn_implementation="eager",
#     dtype=torch.bfloat16,
#     device_map="auto",
# )
#
# @router.post("/ocr/hunyuan/", response_model=dict)
# async def hunyuan_ocr(
#     file: UploadFile = File(...),
#     user: User = Depends(get_current_user),
#     db: Session = Depends(get_db),
# ):
#     image = Image.open(file.file)
#     messages = [
#         {"role": "system", "content": ""},
#         {
#             "role": "user",
#             "content": [
#                 {"type": "image", "image": file.filename},
#                 {"type": "text", "text": "检测并识别图片中的文字，将文本坐标格式化输出。"},
#             ],
#         },
#     ]
#     texts = [processor.apply_chat_template(msg, tokenize=False, add_generation_prompt=True) for msg in [messages]]
#     inputs = processor(text=texts, images=image, padding=True, return_tensors="pt")
#     # Move to device
#     device = next(model.parameters()).device
#     inputs = inputs.to(device)
#     generated_ids = model.generate(**inputs, max_new_tokens=16384, do_sample=False)
#     if "input_ids" in inputs:
#         input_ids = inputs.input_ids
#     else:
#         input_ids = inputs.inputs
#     generated_ids_trimmed = [out_ids[len(in_ids):] for in_ids, out_ids in zip(input_ids, generated_ids)]
#     output_texts = clean_repeated_substrings(
#         processor.batch_decode(generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
#     )
#     return {"text": output_texts}

