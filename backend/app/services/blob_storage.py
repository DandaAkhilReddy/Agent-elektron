import os
from typing import Optional, List, Dict
from azure.storage.blob import BlobServiceClient, BlobClient
from azure.storage.blob import generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class BlobStorageService:
    def __init__(self):
        self.connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        self.container_name = os.getenv("AZURE_BLOB_CONTAINER", "agent-elektron-files")
        
        if self.connection_string:
            try:
                self.blob_service_client = BlobServiceClient.from_connection_string(
                    self.connection_string
                )
                self._ensure_container_exists()
                logger.info("Azure Blob Storage initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Azure Blob Storage: {e}")
                self.blob_service_client = None
        else:
            logger.warning("Azure Blob Storage connection string not found - using local fallback")
            self.blob_service_client = None
    
    def _ensure_container_exists(self):
        """Ensure the container exists, create if it doesn't"""
        try:
            container_client = self.blob_service_client.get_container_client(self.container_name)
            if not container_client.exists():
                container_client.create_container()
                logger.info(f"Created container: {self.container_name}")
        except Exception as e:
            logger.error(f"Failed to create container: {e}")
    
    async def upload_file(self, filename: str, content: bytes, content_type: str = None) -> str:
        """Upload file to Azure Blob Storage"""
        
        if not self.blob_service_client:
            # Fallback for development - save locally
            return await self._save_local_file(filename, content)
        
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=filename
            )
            
            # Upload with metadata
            metadata = {
                "uploaded_at": datetime.now().isoformat(),
                "content_type": content_type or "application/octet-stream"
            }
            
            blob_client.upload_blob(
                content,
                content_type=content_type,
                metadata=metadata,
                overwrite=True
            )
            
            # Return the blob URL
            return blob_client.url
            
        except Exception as e:
            logger.error(f"Failed to upload file {filename}: {e}")
            # Fallback to local storage
            return await self._save_local_file(filename, content)
    
    async def _save_local_file(self, filename: str, content: bytes) -> str:
        """Fallback method to save file locally"""
        try:
            # Create uploads directory if it doesn't exist
            upload_dir = "uploads"
            os.makedirs(upload_dir, exist_ok=True)
            
            file_path = os.path.join(upload_dir, filename)
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Return local file URL
            return f"/uploads/{filename}"
            
        except Exception as e:
            logger.error(f"Failed to save local file {filename}: {e}")
            raise
    
    async def get_download_url(self, file_id: str, expires_in_hours: int = 24) -> str:
        """Generate a download URL for a file"""
        
        if not self.blob_service_client:
            return f"/uploads/{file_id}"  # Local fallback
        
        try:
            # In a real implementation, you'd map file_id to blob name
            blob_name = file_id  # Simplified for demo
            
            # Generate SAS token for secure access
            sas_token = generate_blob_sas(
                account_name=self.blob_service_client.account_name,
                container_name=self.container_name,
                blob_name=blob_name,
                account_key=self.blob_service_client.credential.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(hours=expires_in_hours)
            )
            
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            return f"{blob_client.url}?{sas_token}"
            
        except Exception as e:
            logger.error(f"Failed to generate download URL for {file_id}: {e}")
            return f"/uploads/{file_id}"
    
    async def list_user_files(self, user_prefix: str) -> List[Dict]:
        """List files for a specific user"""
        
        if not self.blob_service_client:
            # Local fallback
            return await self._list_local_files(user_prefix)
        
        try:
            container_client = self.blob_service_client.get_container_client(self.container_name)
            blobs = container_client.list_blobs(name_starts_with=user_prefix)
            
            files = []
            for blob in blobs:
                files.append({
                    "name": blob.name,
                    "size": blob.size,
                    "created": blob.creation_time.isoformat() if blob.creation_time else None,
                    "modified": blob.last_modified.isoformat() if blob.last_modified else None,
                    "content_type": blob.content_settings.content_type if blob.content_settings else None
                })
            
            return files
            
        except Exception as e:
            logger.error(f"Failed to list files for user {user_prefix}: {e}")
            return []
    
    async def _list_local_files(self, user_prefix: str) -> List[Dict]:
        """Fallback method to list local files"""
        try:
            upload_dir = "uploads"
            if not os.path.exists(upload_dir):
                return []
            
            files = []
            for filename in os.listdir(upload_dir):
                if filename.startswith(user_prefix):
                    file_path = os.path.join(upload_dir, filename)
                    stat = os.stat(file_path)
                    files.append({
                        "name": filename,
                        "size": stat.st_size,
                        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "content_type": "application/octet-stream"
                    })
            
            return files
            
        except Exception as e:
            logger.error(f"Failed to list local files: {e}")
            return []
    
    async def delete_file(self, file_id: str) -> bool:
        """Delete a file from storage"""
        
        if not self.blob_service_client:
            # Local fallback
            try:
                file_path = os.path.join("uploads", file_id)
                if os.path.exists(file_path):
                    os.remove(file_path)
                    return True
                return False
            except Exception as e:
                logger.error(f"Failed to delete local file {file_id}: {e}")
                return False
        
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=file_id
            )
            
            blob_client.delete_blob()
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file {file_id}: {e}")
            return False
    
    def get_container_info(self) -> Dict:
        """Get container information and statistics"""
        
        if not self.blob_service_client:
            return {"status": "local_fallback", "container": "uploads/"}
        
        try:
            container_client = self.blob_service_client.get_container_client(self.container_name)
            
            # Count blobs and calculate total size
            blob_count = 0
            total_size = 0
            
            for blob in container_client.list_blobs():
                blob_count += 1
                total_size += blob.size or 0
            
            return {
                "status": "connected",
                "container": self.container_name,
                "blob_count": blob_count,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
            }
            
        except Exception as e:
            logger.error(f"Failed to get container info: {e}")
            return {"status": "error", "error": str(e)}