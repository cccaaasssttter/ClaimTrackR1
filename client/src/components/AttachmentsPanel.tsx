import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAttachments } from '@/hooks/use-attachments';
import { useToast } from '@/hooks/use-toast';

interface AttachmentsPanelProps {
  claimId: string;
}

export function AttachmentsPanel({ claimId }: AttachmentsPanelProps) {
  const { attachments, loading, uploading, uploadFiles, downloadAttachment, removeAttachment } = useAttachments(claimId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFiles(files);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'fas fa-file-image text-blue-500';
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf text-red-500';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel text-green-500';
    if (mimeType.includes('word')) return 'fas fa-file-word text-blue-600';
    return 'fas fa-file text-gray-500';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">Attachments</h4>
        <Button onClick={handleFileSelect} size="sm" disabled={uploading}>
          {uploading ? (
            <>
              <i className="fas fa-spinner animate-spin mr-2"></i>
              Uploading...
            </>
          ) : (
            <>
              <i className="fas fa-plus mr-2"></i>
              Upload
            </>
          )}
        </Button>
      </div>

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt"
      />

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          uploading ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-3"></i>
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop files here, or click to browse
        </p>
        <Button variant="link" onClick={handleFileSelect} className="text-primary">
          Choose Files
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          Max file size: 10MB
        </p>
      </div>

      {/* Attachments List */}
      <ScrollArea className="h-64">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-50 rounded-lg p-3">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-paperclip text-gray-400 text-2xl mb-2"></i>
            <p className="text-gray-500 text-sm">No attachments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center p-3 bg-gray-50 rounded-lg group">
                <div className="flex-shrink-0">
                  <i className={`${getFileIcon(attachment.mimeType)} text-xl`}></i>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.blob.size)}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadAttachment(attachment)}
                      className="h-8 w-8 text-gray-400 hover:text-primary"
                      title="Download"
                    >
                      <i className="fas fa-download"></i>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAttachment(attachment.id)}
                      className="h-8 w-8 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
