import logging
from typing import Optional
from datetime import timedelta
from google.cloud import storage
from google.cloud.exceptions import GoogleCloudError
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_gcs_client() -> Optional[storage.Client]:
    try:
        return storage.Client()
    except Exception as e:
        logger.warning(f"GCP credentials not fully configured or default credentials not found. GCS features will fail: {e}")
        return None

class StorageService:
    def __init__(self):
        self.bucket_name = settings.GCP_BUCKET_NAME

    def upload_report_pdf(self, pdf_buffer: bytes, org_id: str, report_id: str) -> Optional[str]:
        """
        Uploads a generated PDF to Google Cloud Storage.
        
        Args:
            pdf_buffer: The binary content of the PDF.
            org_id: The organization UUID string.
            report_id: The report UUID string.
            
        Returns:
            The GCS object key (document URI) if successful, else None.
        """
        gcs_key = f"reports/{org_id}/{report_id}.pdf"
        client = get_gcs_client()
        if not client:
            return None
            
        try:
            logger.info(f"Uploading PDF to GCS at {gcs_key}")
            bucket = client.bucket(self.bucket_name)
            blob = bucket.blob(gcs_key)
            blob.upload_from_string(
                pdf_buffer,
                content_type="application/pdf"
            )
            return gcs_key
        except GoogleCloudError as e:
            logger.error(f"Failed to upload PDF to GCS: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error uploading PDF to GCS: {e}")
            raise

    def generate_presigned_download_url(self, gcs_key: str, expiration: int = 900) -> Optional[str]:
        """
        Generates a secure, temporary GCS pre-signed URL (v4) for downloading the PDF.
        
        Args:
            gcs_key: The GCS object key.
            expiration: Validity duration in seconds (default 15 minutes).
            
        Returns:
            The presigned URL string if successful, else None.
        """
        client = get_gcs_client()
        if not client:
            return None
            
        try:
            logger.info(f"Generating presigned URL for GCS key: {gcs_key}")
            bucket = client.bucket(self.bucket_name)
            blob = bucket.blob(gcs_key)
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=expiration),
                method="GET",
                response_disposition="attachment"
            )
            return url
        except GoogleCloudError as e:
            logger.error(f"Failed to generate presigned URL for GCS key {gcs_key}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error generating presigned URL for GCS key {gcs_key}: {e}")
            return None

storage_service = StorageService()
