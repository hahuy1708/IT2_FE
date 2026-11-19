import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  X,
  Download,
  FileText,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Regulation } from '../types';
import { regulationApi } from '../services/api';
import { renderSafeMarkdown, sanitizeHtml, cleanDisplayText } from '../utils/sanitize';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Props {
  regulation: Regulation | null;
  onClose: () => void;
  highlightClause?: string;
  initialPage?: number;
}

export const DocumentViewerModal: React.FC<Props> = ({
  regulation,
  onClose,
  highlightClause,
  initialPage = 1,
}) => {
  const [viewMode, setViewMode] = useState<'text' | 'pdf'>('text');
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(initialPage || 1);
  const [scale, setScale] = useState<number>(1.05);
  const [pdfError, setPdfError] = useState<boolean>(false);

  // When opened from a chat citation (id may be 0/synthetic), resolve the real regulation by documentNumber.
  const needsLookup = Boolean(regulation && (!regulation.id || regulation.id <= 0) && regulation.documentNumber);
  const { data: resolvedReg } = useQuery({
    queryKey: ['regulation-by-number', regulation?.documentNumber],
    queryFn: () => regulationApi.getByNumber(regulation!.documentNumber),
    enabled: needsLookup,
    retry: false,
  });

  const activeReg = resolvedReg ?? regulation;
  const activeId = activeReg && activeReg.id > 0 ? activeReg.id : null;

  const { data: contentData, isLoading: contentLoading } = useQuery({
    queryKey: ['regulation-content', activeId],
    queryFn: () => regulationApi.getContent(activeId!),
    enabled: Boolean(activeId),
    retry: false,
  });

  useEffect(() => {
    setPageNumber(initialPage && initialPage > 0 ? initialPage : 1);
    setNumPages(0);
    setPdfError(false);
    setViewMode(initialPage && initialPage > 1 ? 'pdf' : 'text');
  }, [regulation?.documentNumber, regulation?.id, initialPage]);

  if (!regulation || !activeReg) return null;

  const pdfStreamUrl = activeId ? regulationApi.getPdfUrl(activeId) : activeReg.pdfUrl;
  const externalPdfUrl = activeReg.pdfUrl || pdfStreamUrl;

  const renderedHtml = (() => {
    if (contentData?.contentHtml) {
      return sanitizeHtml(contentData.contentHtml);
    }
    if (contentData?.markdown) {
      return renderSafeMarkdown(contentData.markdown, highlightClause);
    }
    if (activeReg.contentHtml) {
      return sanitizeHtml(activeReg.contentHtml);
    }
    return '';
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-dut-outline-variant/50">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-dut-surface-container border-b border-dut-outline-variant/30">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="p-2 bg-dut-primary/10 rounded-lg text-dut-primary shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {activeReg.documentNumber}
                </span>
                {activeReg.status && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {activeReg.status}
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-dut-on-surface line-clamp-1 mt-0.5">
                {cleanDisplayText(activeReg.title)}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="inline-flex rounded-lg bg-white border border-dut-outline-variant/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('text')}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === 'text' ? 'bg-dut-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Số hóa</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('pdf')}
                disabled={!pdfStreamUrl}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 ${
                  viewMode === 'pdf' ? 'bg-dut-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF gốc</span>
              </button>
            </div>

            {externalPdfUrl && (
              <a
                href={pdfStreamUrl || externalPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold bg-dut-primary text-white rounded-lg hover:bg-dut-primary-container transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tải PDF</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng trình đọc"
              className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Highlight Notice */}
        {highlightClause && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 text-xs text-amber-900 flex items-center justify-between">
            <span>
              Đang đối chiếu trích dẫn: <strong>{highlightClause}</strong>
            </span>
            {initialPage > 1 && <span className="font-semibold">Trang tham chiếu: {initialPage}</span>}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {viewMode === 'text' ? (
            <div className="p-6 space-y-4 text-sm text-dut-on-surface leading-relaxed bg-white min-h-full">
              <div className="text-center pb-4 border-b border-gray-100">
                <p className="font-semibold uppercase tracking-wider text-xs text-dut-on-surface-variant">
                  {activeReg.issuer || 'Trường Đại học Bách khoa – ĐHĐN'}
                </p>
                <h3 className="text-lg font-bold text-dut-primary mt-1">
                  Số: {activeReg.documentNumber}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Ban hành ngày: {activeReg.issuedDate || 'Đang cập nhật'}
                </p>
              </div>

              {(activeReg.summary || activeReg.matchedExcerpt) && (
                <div className="bg-dut-surface-container-low p-4 rounded-xl border border-dut-outline-variant/30 space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-dut-primary">
                    Trích yếu / Đoạn khớp nổi bật:
                  </h4>
                  <p className="text-dut-on-surface-variant text-sm">
                    {cleanDisplayText(activeReg.matchedExcerpt || activeReg.summary || activeReg.title)}
                  </p>
                </div>
              )}

              {contentLoading ? (
                <div className="flex items-center justify-center py-10 text-xs text-slate-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-dut-primary" />
                  <span>Đang tải toàn văn bản số hóa...</span>
                </div>
              ) : renderedHtml ? (
                <div
                  className="prose prose-sm max-w-none prose-headings:text-dut-primary prose-strong:text-slate-900 text-slate-800 space-y-2"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-xs text-slate-600 text-center space-y-2">
                  <p>Chưa có bản text số hóa cục bộ cho văn bản này.</p>
                  {pdfStreamUrl && (
                    <button
                      type="button"
                      onClick={() => setViewMode('pdf')}
                      className="text-dut-primary font-bold hover:underline"
                    >
                      Chuyển sang tab PDF gốc để xem trực tiếp
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 flex flex-col items-center space-y-3">
              {/* PDF Toolbar */}
              <div className="flex flex-wrap items-center justify-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs">
                <button
                  type="button"
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700 min-w-[90px] text-center">
                  Trang {pageNumber} / {numPages || '?'}
                </span>
                <button
                  type="button"
                  onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p + 1))}
                  disabled={Boolean(numPages && pageNumber >= numPages)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
                  className="p-1.5 rounded-lg hover:bg-slate-100"
                  aria-label="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-600">{Math.round(scale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setScale((s) => Math.min(2.0, Number((s + 0.15).toFixed(2))))}
                  className="p-1.5 rounded-lg hover:bg-slate-100"
                  aria-label="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {pdfStreamUrl && !pdfError ? (
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 overflow-x-auto max-w-full">
                  <Document
                    file={pdfStreamUrl}
                    onLoadSuccess={({ numPages: total }) => {
                      setNumPages(total);
                      setPdfError(false);
                      if (pageNumber > total) setPageNumber(1);
                    }}
                    onLoadError={() => setPdfError(true)}
                    loading={
                      <div className="flex items-center gap-2 py-16 px-8 text-xs text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin text-dut-primary" />
                        <span>Đang tải file PDF gốc...</span>
                      </div>
                    }
                  >
                    <Page pageNumber={pageNumber} scale={scale} />
                  </Document>
                </div>
              ) : (
                <div className="bg-white border border-amber-200 rounded-xl p-6 text-center max-w-md space-y-3">
                  <AlertTriangle className="w-7 h-7 text-amber-500 mx-auto" />
                  <p className="text-xs text-slate-700 font-medium">
                    Không thể render trực tiếp PDF trong trình duyệt (có thể file nguồn chưa được mount hoặc chặn CORS).
                  </p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('text')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800"
                    >
                      Xem bản số hóa
                    </button>
                    {externalPdfUrl && (
                      <a
                        href={externalPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-dut-primary text-white hover:bg-dut-primary-container"
                      >
                        Mở link gốc DUT
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-dut-surface-container border-t border-dut-outline-variant/30 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-dut-primary text-white text-xs font-semibold rounded-lg hover:bg-dut-primary-container transition-colors"
          >
            Đóng trình đọc
          </button>
        </div>
      </div>
    </div>
  );
};
