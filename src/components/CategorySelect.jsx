"use client";

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

const CATEGORY_DATA = {
  'Faculty Task': [
    'Class - Laboratory',
    'Class - Lecture',
    'Checking of Exams and other deliverables',
    'ELMS',
    'Exam Proctoring',
    'Admin Task',
    'Class Preparation',
    'Events'
  ],
  'MIS': [
    'IT Support',
    'CCTV Administration',
    'Building & Equipment Maintenance',
    'ICT Inventory',
    'Timekeeping',
    'Hardware & System Maintenance',
    'RFA',
    'Task Monitoring'
  ],
  'Accounting': [
    'DISBURSEMENT',
    'PETTYCASH',
    'PAYROLL',
    'LIQUIDATIONS OF CASH ADVANCES',
    'CASH',
    'PSCS'
  ]
};

export default function CategorySelect({ value = '', onChange, required = true }) {
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [customText, setCustomText] = useState('');

  // Parse existing initial value if editing or mounting
  useEffect(() => {
    if (!value) return;

    // Check if value matches pattern "Main - Sub"
    const match = Object.keys(CATEGORY_DATA).find(cat => value.startsWith(`${cat} - `));
    if (match) {
      setMainCategory(match);
      const sub = value.replace(`${match} - `, '');
      if (CATEGORY_DATA[match].includes(sub)) {
        setSubCategory(sub);
      } else {
        setSubCategory('OTHER');
        setCustomText(sub);
      }
    } else if (Object.keys(CATEGORY_DATA).includes(value)) {
      setMainCategory(value);
      setSubCategory('');
    } else if (value) {
      setMainCategory('OTHER');
      setCustomText(value);
    }
  }, []);

  const handleMainChange = (cat) => {
    setMainCategory(cat);
    setSubCategory('');
    setCustomText('');

    if (cat === 'OTHER') {
      onChange?.('');
    } else if (cat) {
      onChange?.(cat);
    } else {
      onChange?.('');
    }
  };

  const handleSubChange = (sub) => {
    setSubCategory(sub);
    if (sub === 'OTHER') {
      const combined = customText.trim() ? `${mainCategory} - ${customText.trim()}` : mainCategory;
      onChange?.(combined);
    } else if (sub) {
      const combined = `${mainCategory} - ${sub}`;
      onChange?.(combined);
    } else {
      onChange?.(mainCategory);
    }
  };

  const handleCustomTextChange = (txt) => {
    setCustomText(txt);
    if (mainCategory === 'OTHER') {
      onChange?.(txt);
    } else if (mainCategory && subCategory === 'OTHER') {
      onChange?.(txt.trim() ? `${mainCategory} - ${txt.trim()}` : mainCategory);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Main Category Selection (Pills / Grid) */}
      <div className="grid grid-cols-4 gap-1.5">
        {Object.keys(CATEGORY_DATA).concat(['Other']).map((cat) => {
          const isSelected = mainCategory === (cat === 'Other' ? 'OTHER' : cat);
          const catKey = cat === 'Other' ? 'OTHER' : cat;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleMainChange(catKey)}
              className={`py-2 px-2 rounded-lg text-xs font-bold border text-center transition flex items-center justify-center gap-1 ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-zinc-700 border-zinc-250 hover:bg-zinc-100 hover:border-zinc-300'
              }`}
            >
              {cat === 'Other' ? 'Other / Custom' : cat}
              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
            </button>
          );
        })}
      </div>

      {/* Subcategory Dropdown (Visible if Faculty Task, MIS, or Accounting is selected) */}
      {mainCategory && mainCategory !== 'OTHER' && CATEGORY_DATA[mainCategory] && (
        <div className="animate-fadeIn space-y-2">
          <select
            value={subCategory}
            onChange={(e) => handleSubChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white py-2.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-800"
            required={required && !value}
          >
            <option value="">-- Select {mainCategory} Subcategory --</option>
            {CATEGORY_DATA[mainCategory].map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
            <option value="OTHER">✍️ Other (Specify Custom Subcategory)...</option>
          </select>

          {/* Manual Input if 'OTHER' subcategory selected */}
          {subCategory === 'OTHER' && (
            <input
              type="text"
              value={customText}
              onChange={(e) => handleCustomTextChange(e.target.value)}
              placeholder={`Type custom subcategory for ${mainCategory}...`}
              className="w-full rounded-lg border border-blue-300 bg-white py-2.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-800 animate-fadeIn"
              required={required}
              autoFocus
            />
          )}
        </div>
      )}

      {/* Manual Input if Main Category is 'Other / Custom' */}
      {mainCategory === 'OTHER' && (
        <div className="animate-fadeIn">
          <input
            type="text"
            value={customText}
            onChange={(e) => handleCustomTextChange(e.target.value)}
            placeholder="Type custom category name (e.g. MIS - CCTV Administration, Library Services...)"
            className="w-full rounded-lg border border-blue-300 bg-white py-2.5 px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-zinc-800"
            required={required}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
