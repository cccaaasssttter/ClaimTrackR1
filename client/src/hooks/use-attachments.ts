import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { 
  getAttachmentsByClaimId, 
  saveAttachment, 
  deleteAttachment 
} from '@/lib/db';
import type { Attachment } from '@shared/schema';

export function useAttachments(claimId: string) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const loadAttachments = async () => {
    if (!claimId) return;
    
    try {
      setLoading(true);
      const attachmentsData = await getAttachmentsByClaimId(claimId);
      setAttachments(attachmentsData);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load attachments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (files: FileList): Promise<void> => {
    if (!files.length) return;

    try {
      setUploading(true);
      
      for (const file of Array.from(files)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Error",
            description: `File ${file.name} is too large (max 10MB)`,
            variant: "destructive",
          });
          continue;
        }

        const attachment: Attachment = {
          id: crypto.randomUUID(),
          claimId,
          fileName: file.name,
          mimeType: file.type,
          blob: file,
        };

        await saveAttachment(attachment);
      }

      await loadAttachments();
      
      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadAttachment = (attachment: Attachment): void => {
    try {
      const url = URL.createObjectURL(attachment.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const removeAttachment = async (id: string): Promise<void> => {
    try {
      await deleteAttachment(id);
      await loadAttachments();
      
      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete attachment",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [claimId]);

  return {
    attachments,
    loading,
    uploading,
    uploadFiles,
    downloadAttachment,
    removeAttachment,
    refreshAttachments: loadAttachments,
  };
}
