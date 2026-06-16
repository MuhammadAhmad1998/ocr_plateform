import uuid
from pathlib import Path

from app.core.config import get_settings
from app.core.exceptions import NotFoundError, StorageError

settings = get_settings()


class StorageService:
    def __init__(self) -> None:
        self.use_local = settings.USE_LOCAL_STORAGE
        self.s3 = None
        if not self.use_local:
            import boto3
            from botocore.exceptions import ClientError
            self._ClientError = ClientError
            self.s3 = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
                region_name=settings.AWS_REGION,
            )
        else:
            self.local_path = Path(settings.LOCAL_STORAGE_PATH)
            self.local_path.mkdir(parents=True, exist_ok=True)

    def upload(self, content: bytes, prefix: str, filename: str, content_type: str) -> str:
        key = f"{prefix}/{uuid.uuid4().hex}_{filename}"
        if self.use_local:
            path = self.local_path / key
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            return key
        self.s3.put_object(
            Bucket=settings.S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=content_type,
        )
        return key

    def download(self, key: str) -> bytes:
        if self.use_local:
            path = self.local_path / key
            if not path.exists():
                raise NotFoundError(f"File not found: {key}")
            return path.read_bytes()
        try:
            obj = self.s3.get_object(Bucket=settings.S3_BUCKET, Key=key)
            return obj["Body"].read()
        except self._ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in {"NoSuchKey", "404", "NotFound"}:
                raise NotFoundError(f"File not found: {key}") from e
            raise StorageError("Failed to download file from storage") from e

    def get_url(self, key: str) -> str:
        if self.use_local:
            return f"http://localhost:8000/storage/{key}"
        return f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"


storage = StorageService()
