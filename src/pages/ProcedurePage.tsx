import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Send, CheckSquare, Award, Download, FileText, Tag } from 'lucide-react';
import { procedureApi, docApi } from '../services/api';
import { downloadFile } from '../utils/download';

const DEFAULT_DOC_ID = Number(import.meta.env.VITE_DOC_ID) || 1;

const GRADE_LABEL: Record<string, string> = {
  LOAI_XUAT_SAC: 'Loại Xuất sắc',
  LOAI_GIOI: 'Loại Giỏi',
  LOAI_KHA: 'Loại Khá',
};

const ELIGIBLE_BADGE: Record<string, { label: string; className: string }> = {
  LOAI_XUAT_SAC: { label: 'ĐỦ TIÊU CHUẨN LOẠI XUẤT SẮC', className: 'bg-purple-100 text-purple-800' },
  LOAI_GIOI: { label: 'ĐỦ TIÊU CHUẨN LOẠI GIỎI', className: 'bg-emerald-100 text-emerald-800' },
  LOAI_KHA: { label: 'ĐỦ TIÊU CHUẨN LOẠI KHÁ', className: 'bg-blue-100 text-blue-800' },
  KHONG_DU_DIEU_KIEN: { label: 'CHƯA ĐỦ TIÊU CHUẨN', className: 'bg-slate-100 text-slate-700' },
};

const getFileName = (url: string, fallback: string) => {
  try {
    const name = decodeURIComponent(new URL(url, window.location.origin).pathname.split('/').pop() || '');
    return name && name !== 'download' ? name : fallback;
  } catch {
    return fallback;
  }
};

export const ProcedurePage: React.FC = () => {
  const studentCode = '102230001';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDocId = Number(searchParams.get('docId')) || DEFAULT_DOC_ID;
  const [activeDocId, setActiveDocId] = useState<number>(initialDocId);

  const [feedbackReason, setFeedbackReason] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState<{ ticketCode: string } | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([0]);

  const { data: docList } = useQuery({
    queryKey: ['docs-list'],
    queryFn: () => docApi.list(),
  });

  const { data: doc, isLoading: docLoading, isError: docError } = useQuery({
    queryKey: ['doc', activeDocId],
    queryFn: () => docApi.getById(activeDocId),
  });

  useEffect(() => {
    setCompletedSteps([0]);
  }, [activeDocId]);

  const selectDoc = (id: number) => {
    setActiveDocId(id);
    setSearchParams({ docId: String(id) }, { replace: true });
  };

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!doc?.file_url) return;
    setDownloadError(null);

    const isSameOrigin = new URL(doc.file_url, window.location.origin).origin === window.location.origin;
    if (!isSameOrigin) {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
      return;
    }

    setDownloading(true);
    try {
      await downloadFile(
        doc.file_url,
        getFileName(doc.file_url, `bieu-mau-thu-tuc-${doc.id}.doc`),
      );
    } catch {
      setDownloadError('Không tải được tệp. Vui lòng thử lại sau hoặc liên hệ phòng Đào tạo & CTSV.');
    } finally {
      setDownloading(false);
    }
  };

  const { data: criteriaList } = useQuery({
    queryKey: ['procedure-criteria', 'Học bổng Khuyến khích Học tập'],
    queryFn: () => procedureApi.getCriteria('Học bổng Khuyến khích Học tập'),
  });

  const { data: evaluation } = useQuery({
    queryKey: ['procedure-evaluation', studentCode],
    queryFn: () => procedureApi.evaluate(studentCode),
  });

  const ticketMutation = useMutation({
    mutationFn: (reason: string) =>
      procedureApi.submitTicket({
        studentCode,
        procedureName: doc?.title || 'Học bổng Khuyến khích Học tập',
        reason,
      }),
    onSuccess: (data) => {
      setSubmittedTicket(data);
      setFeedbackReason('');
    },
  });

  const toggleStep = (index: number) => {
    if (completedSteps.includes(index)) {
      setCompletedSteps(completedSteps.filter((i) => i !== index));
    } else {
      setCompletedSteps([...completedSteps, index]);
    }
  };

  const docSteps = doc?.steps ?? [];
  const totalStepsCount = docSteps.length > 0 ? docSteps.length : (evaluation?.checklistSteps?.length ?? 4);
  const progressPercent = totalStepsCount > 0 ? Math.round((completedSteps.length / totalStepsCount) * 100) : 0;

  const badge = ELIGIBLE_BADGE[evaluation?.eligibleLevel || 'LOAI_GIOI'] || ELIGIBLE_BADGE.KHONG_DU_DIEU_KIEN;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-3">
        <div>
          <h2 className="text-2xl font-extrabold text-dut-on-surface">
            Chi tiết Thủ tục &amp; Đối soát Tiêu chuẩn
          </h2>
          <p className="text-sm text-dut-on-surface-variant mt-1">
            Hướng dẫn quy trình từng bước (step-by-step), tải biểu mẫu trực tiếp và tự động đối soát tiêu chuẩn học bổng theo QĐ 1414/QĐ-ĐHBK.
          </p>
        </div>

        {/* Procedure Switcher Pills */}
        {docList && docList.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {docList.map((item) => {
              const active = item.id === activeDocId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectDoc(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-dut-primary text-white border-dut-primary shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Step-by-Step Detail + Criteria Table (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dynamic DetailComponent: Step-by-Step Procedure Guide */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-dut-outline-variant/30 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <h3 className="font-bold text-base sm:text-lg text-dut-on-surface flex items-center space-x-2">
                  <CheckSquare className="w-5 h-5 text-dut-primary shrink-0" />
                  <span>{doc?.title || 'Quy trình thực hiện thủ tục'}</span>
                </h3>
                {doc?.summary && (
                  <p className="text-xs sm:text-sm text-dut-on-surface-variant">{doc.summary}</p>
                )}
              </div>
              <span className="text-xs font-bold text-dut-primary bg-dut-primary/10 px-2.5 py-1 rounded-full shrink-0">
                {progressPercent}% hoàn thành
              </span>
            </div>

            {doc?.tags && doc.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {doc.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Progress bar */}
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-dut-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Steps list from GET /api/docs/{id} */}
            {docLoading ? (
              <div className="space-y-2.5 animate-pulse">
                <div className="h-14 bg-slate-100 rounded-xl" />
                <div className="h-14 bg-slate-100 rounded-xl" />
                <div className="h-14 bg-slate-100 rounded-xl" />
              </div>
            ) : docSteps.length > 0 ? (
              <div className="space-y-3 pt-1">
                {docSteps.map((step, idx) => {
                  const isChecked = completedSteps.includes(idx);
                  return (
                    <div
                      key={step.order}
                      onClick={() => toggleStep(idx)}
                      className={`flex items-start space-x-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50/50 border-dut-primary/40 text-dut-on-surface'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded text-dut-primary focus:ring-dut-primary border-gray-300 cursor-pointer"
                      />
                      <div className="text-xs sm:text-sm space-y-0.5">
                        <p className="font-bold text-dut-primary">
                          Bước {step.order}: {step.title}
                        </p>
                        <p className="text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {(evaluation?.checklistSteps || []).map((step, idx) => {
                  const isChecked = completedSteps.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleStep(idx)}
                      className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50/50 border-dut-primary/40 text-dut-on-surface'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded text-dut-primary focus:ring-dut-primary border-gray-300 cursor-pointer"
                      />
                      <div className="text-xs sm:text-sm">
                        <span className="font-bold mr-1">Chặng {idx + 1}:</span>
                        <span>{step}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Eligibility Alert & Criteria Table Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-dut-outline-variant/30 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-base text-dut-on-surface flex items-center space-x-2">
                <Award className="w-5 h-5 text-dut-primary" />
                <span>Kết quả đối soát hồ sơ học kỳ</span>
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.className}`}>
                {badge.label}
              </span>
            </div>

            <p className="text-sm text-gray-700 bg-dut-surface-container-low p-4 rounded-xl border border-dut-outline-variant/30">
              {evaluation?.statusMessage || 'Đang đối soát kết quả học tập với bảng tiêu chuẩn QĐ 1414/QĐ-ĐHBK...'}
            </p>

            {/* Dynamic Criteria Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-dut-on-surface-variant font-semibold bg-dut-surface-container">
                    <th className="py-2.5 px-3 rounded-l-lg">Hạng mức Học bổng</th>
                    <th className="py-2.5 px-3">Điểm TBCHK (Thang 10)</th>
                    <th className="py-2.5 px-3">Điểm Rèn Luyện</th>
                    <th className="py-2.5 px-3 rounded-r-lg">Tình trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(criteriaList && criteriaList.length > 0
                    ? criteriaList
                    : [
                        { id: 1, procedureName: '', gradeLevel: 'LOAI_XUAT_SAC', minGpa: 9.0, maxGpa: 10.0, minTrainingPoint: 90, description: '' },
                        { id: 2, procedureName: '', gradeLevel: 'LOAI_GIOI', minGpa: 8.0, maxGpa: 8.99, minTrainingPoint: 80, description: '' },
                        { id: 3, procedureName: '', gradeLevel: 'LOAI_KHA', minGpa: 7.0, maxGpa: 7.99, minTrainingPoint: 65, description: '' },
                      ]
                  ).map((row) => {
                    const isMatched = evaluation?.eligibleLevel === row.gradeLevel;
                    const meetsRow =
                      evaluation &&
                      evaluation.gpa >= row.minGpa &&
                      evaluation.trainingPoint >= row.minTrainingPoint;
                    return (
                      <tr
                        key={row.id}
                        className={isMatched ? 'bg-blue-50/60 font-semibold border-l-4 border-dut-primary' : 'hover:bg-gray-50/50'}
                      >
                        <td className="py-3 px-3 font-semibold text-dut-primary flex items-center space-x-1.5">
                          {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          <span>{GRADE_LABEL[row.gradeLevel] || row.gradeLevel}</span>
                        </td>
                        <td className="py-3 px-3">
                          {row.maxGpa && row.maxGpa < 10
                            ? `${Number(row.minGpa).toFixed(2)} - ${Number(row.maxGpa).toFixed(2)}`
                            : `≥ ${Number(row.minGpa).toFixed(2)}`}
                          {isMatched && evaluation && ` (Đạt: ${Number(evaluation.gpa).toFixed(2)})`}
                        </td>
                        <td className="py-3 px-3">
                          ≥ {row.minTrainingPoint} đ
                          {isMatched && evaluation && ` (Đạt: ${evaluation.trainingPoint} đ)`}
                        </td>
                        <td className={`py-3 px-3 ${isMatched ? 'text-emerald-700 font-bold' : 'text-gray-400'}`}>
                          {isMatched ? 'Đủ điều kiện' : meetsRow ? 'Đạt mức cao hơn' : 'Chưa đạt'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-dut-on-surface-variant space-y-1 pt-2 border-t border-gray-100">
              <p className="font-semibold text-gray-800">Điều kiện kỹ thuật loại trừ cần ghi nhớ:</p>
              <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                <li>Tích lũy tối thiểu 15 tín chỉ trong kỳ học chính.</li>
                <li>Không có học phần nào thi lần đầu dưới điểm D (hoặc điểm F).</li>
                <li>Không trong thời gian chịu hình thức kỷ luật từ khiển trách trở lên.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Downloads & Ticket Submission (1 col) */}
        <div className="space-y-6">
          {/* Downloads Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-dut-outline-variant/30 space-y-4">
            <div className="flex items-center space-x-2 text-dut-on-surface">
              <Download className="w-5 h-5 text-dut-primary" />
              <h3 className="font-bold text-base">Biểu mẫu &amp; Văn bản</h3>
            </div>

            {doc?.title && (
              <p className="text-xs text-dut-on-surface-variant">{doc.title}</p>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || !doc?.file_url}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-dut-primary text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-dut-primary-container disabled:opacity-50 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>{downloading ? 'Đang tải...' : 'Tải biểu mẫu (.doc)'}</span>
            </button>

            {docLoading && (
              <p className="text-xs text-dut-on-surface-variant">Đang tải thông tin tài liệu...</p>
            )}

            {docError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                Không lấy được thông tin tài liệu từ máy chủ.
              </p>
            )}

            {doc && !doc.file_url && (
              <p className="text-xs text-dut-on-surface-variant">Tài liệu này chưa có tệp đính kèm.</p>
            )}

            {downloadError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                {downloadError}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-dut-outline-variant/30 space-y-4">
            <div className="flex items-center space-x-2 text-dut-on-surface">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base">Phản hồi sai lệch học vụ</h3>
            </div>
            <p className="text-xs text-dut-on-surface-variant">
              Nếu phát hiện sai sót trong điểm TBCHK hoặc điểm rèn luyện dự kiến, sinh viên nộp phản hồi trực tuyến để phòng Đào tạo &amp; CTSV đối soát.
            </p>

            {submittedTicket && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-1 animate-fade-in">
                <p className="font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã tiếp nhận phản hồi thành công!</span>
                </p>
                <p>Mã biên nhận: <strong className="font-mono text-sm text-emerald-800">{submittedTicket.ticketCode}</strong></p>
                <p className="text-[11px] text-emerald-700">Thời gian phản hồi dự kiến: 24 - 48 giờ làm việc.</p>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (feedbackReason.trim()) {
                  ticketMutation.mutate(feedbackReason);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nội dung khiếu nại / đề nghị đối soát:
                </label>
                <textarea
                  rows={4}
                  value={feedbackReason}
                  onChange={(e) => setFeedbackReason(e.target.value)}
                  placeholder="Ví dụ: Điểm môn Giải tích 2 thi lần đầu 8.5 nhưng danh sách dự kiến ghi 7.5..."
                  className="w-full text-xs sm:text-sm p-3 bg-dut-surface-container-low border border-dut-outline-variant/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-dut-primary focus:bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={ticketMutation.isPending || !feedbackReason.trim()}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-dut-primary text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-dut-primary-container disabled:opacity-50 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{ticketMutation.isPending ? 'Đang gửi...' : 'Nộp đề nghị xem xét'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
