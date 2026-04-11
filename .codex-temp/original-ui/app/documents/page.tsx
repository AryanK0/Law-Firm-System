'use client';

import { Navbar } from '@/components/navbar';
import { Upload, FileText, X } from 'lucide-react';
import { useState } from 'react';

const documentsData = [
  { id: 1, name: 'Smith v Johnson - Contract.pdf', size: '2.4 MB', date: 'Feb 15, 2024', type: 'Contract' },
  { id: 2, name: 'Estate Planning - Will Draft.docx', size: '1.8 MB', date: 'Feb 12, 2024', type: 'Legal Document' },
  { id: 3, name: 'Tech Startup - NDA.pdf', size: '890 KB', date: 'Feb 10, 2024', type: 'Agreement' },
  { id: 4, name: 'Corporate Minutes - 2024.pdf', size: '1.2 MB', date: 'Feb 08, 2024', type: 'Minutes' },
  { id: 5, name: 'Real Estate Deed - Lee Property.pdf', size: '3.1 MB', date: 'Feb 05, 2024', type: 'Real Estate' },
];

export default function DocumentsPage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFiles([...uploadedFiles, e.dataTransfer.files[0]]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFiles([...uploadedFiles, e.target.files[0]]);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Documents</h1>
          <p className="mt-2 text-base text-muted-foreground">Upload and manage legal documents</p>
        </div>

        {/* Upload Area */}
        <div className="mb-12">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`card-premium border-2 border-dashed p-12 text-center smooth-transition ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-white/5 hover:border-white/10'
            }`}
          >
            <div className="mx-auto max-w-sm">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full p-4 text-primary bg-white/5">
                  <Upload size={32} />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">Drag and drop your documents</h3>
              <p className="mb-6 text-sm text-muted-foreground">or</p>
              <label className="inline-block">
                <input
                  type="file"
                  onChange={handleChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
                <span className="cursor-pointer px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg smooth-transition hover:bg-primary/10 inline-block">
                  Browse Files
                </span>
              </label>
              <p className="mt-4 text-xs text-muted-foreground">PDF, DOC, DOCX, XLS up to 10MB</p>
            </div>
          </div>
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mb-12">
            <h2 className="mb-6 text-lg font-bold text-foreground">Newly Uploaded</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="card-premium p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-1 items-start gap-3">
                      <div className="rounded icon-accent p-2">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-primary smooth-transition flex-shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Documents */}
        <div>
          <h2 className="mb-6 text-lg font-bold text-foreground">All Documents</h2>
          <div className="card-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Type</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Size</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Upload Date</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {documentsData.map((doc) => (
                    <tr key={doc.id} className="smooth-transition hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText size={18} className="text-primary" />
                          <span className="text-sm font-medium text-foreground">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{doc.type}</td>
                      <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{doc.size}</td>
                      <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{doc.date}</td>
                      <td className="px-6 py-4 text-sm">
                        <button className="text-primary font-medium hover:opacity-70 smooth-transition">Download</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
