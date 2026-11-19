import React, { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { PROMPT_SUGGESTIONS, PromptSuggestion } from '../data/promptSuggestions';

interface Props {
  onSelectPrompt: (query: string) => void;
  disabled?: boolean;
}

const CATEGORY_TABS: { code: 'popular' | PromptSuggestion['category_code']; label: string }[] = [
  { code: 'popular', label: 'Phổ biến' },
  { code: 'scholarship', label: 'Học bổng' },
  { code: 'academic_warning', label: 'Cảnh cáo HV' },
  { code: 'graduation', label: 'Tốt nghiệp' },
  { code: 'registration', label: 'Tín chỉ' },
  { code: 'student_affairs', label: 'Thủ tục SV' },
];

export const PromptSuggestComponent: React.FC<Props> = ({ onSelectPrompt, disabled = false }) => {
  const [activeTab, setActiveTab] = useState<'popular' | PromptSuggestion['category_code']>('popular');

  const visiblePrompts = useMemo(() => {
    if (activeTab === 'popular') {
      return PROMPT_SUGGESTIONS.filter((p) => p.popular);
    }
    return PROMPT_SUGGESTIONS.filter((p) => p.category_code === activeTab);
  }, [activeTab]);

  return (
    <div className="bg-white rounded-2xl border border-dut-outline-variant/30 p-3.5 shadow-2xs space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold text-dut-primary flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Prompt mẫu:</span>
        </span>
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeTab === tab.code;
          return (
            <button
              key={tab.code}
              type="button"
              onClick={() => setActiveTab(tab.code)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'bg-dut-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {visiblePrompts.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(item.query)}
            title={item.query}
            className="text-xs bg-dut-surface-container-low hover:bg-blue-50 text-dut-primary font-medium px-3 py-1.5 rounded-full border border-dut-outline-variant/40 transition-colors disabled:opacity-50 text-left"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
