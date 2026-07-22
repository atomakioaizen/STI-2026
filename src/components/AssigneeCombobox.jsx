"use client";

import { useState, useRef, useEffect } from 'react';
import { Search, Check, X, Users, ChevronDown } from 'lucide-react';

export default function AssigneeCombobox({ 
  users = [], 
  selectedUserIds = [], 
  onChange, 
  placeholder = "Search and select assignees...",
  allowSelf = true,
  currentUserId = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Deduplicate and normalize users list
  const cleanUsers = Array.from(
    new Map(
      (users || [])
        .filter(Boolean)
        .map(u => {
          const uid = Number(u.id || u.userId);
          return [uid, { ...u, id: uid }];
        })
        .filter(([uid]) => !isNaN(uid) && uid > 0)
    ).values()
  );

  const filteredUsers = cleanUsers.filter(u => {
    if (!allowSelf && currentUserId && Number(u.id) === Number(currentUserId)) {
      return false;
    }
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    return (
      u.name?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query) ||
      u.department?.name?.toLowerCase().includes(query) ||
      u.position?.toLowerCase().includes(query)
    );
  });

  const toggleUser = (userId) => {
    const numericId = Number(userId);
    let updated;
    if (selectedUserIds.map(Number).includes(numericId)) {
      updated = selectedUserIds.filter(id => Number(id) !== numericId);
    } else {
      updated = [...selectedUserIds, numericId];
    }
    onChange(updated);
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u.id);
    const combined = Array.from(new Set([...selectedUserIds.map(Number), ...filteredIds]));
    onChange(combined);
  };

  const clearAll = () => {
    onChange([]);
  };

  const getDeptLabel = (u) => {
    if (!u) return 'Admin';
    if (u.role === 'PRINCIPAL' || u.role === 'PROGRAM_HEAD') {
      return 'AMT';
    }
    return u.department?.name || u.departmentName || 'Admin';
  };

  const selectedUsers = cleanUsers.filter(u => selectedUserIds.map(Number).includes(Number(u.id)));

  return (
    <div className="relative w-full text-left" ref={containerRef}>
      {/* Selected Chips */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto pr-1">
          {selectedUsers.map(u => (
            <span 
              key={`chip-${u.id}`}
              className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold px-2 py-1 rounded-lg"
            >
              <span>{u.name}</span>
              <span className="text-[9px] text-blue-500 font-medium">({getDeptLabel(u)})</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleUser(u.id); }}
                className="hover:bg-blue-100 rounded p-0.5 transition"
              >
                <X className="h-3 w-3 text-blue-600" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Combobox Trigger / Search Input */}
      <div 
        onClick={() => setIsOpen(true)}
        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus-within:bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition cursor-pointer flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedUsers.length > 0 ? `${selectedUsers.length} assignee(s) selected — type to search more...` : placeholder}
            className="w-full bg-transparent border-0 p-0 text-xs text-zinc-900 focus:outline-none placeholder-zinc-400 font-medium"
          />
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
      </div>

      {/* Dropdown Suggestions List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[400] bg-white border border-zinc-200 rounded-xl shadow-xl max-h-64 flex flex-col overflow-hidden animate-fadeIn">
          {/* Action Bar */}
          <div className="p-2 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between text-[11px] font-bold text-zinc-600">
            <span>Suggestions ({filteredUsers.length})</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-blue-600 hover:text-blue-800 transition"
              >
                Select Filtered ({filteredUsers.length})
              </button>
              {selectedUserIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-red-600 hover:text-red-800 transition"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-400 italic">
                No matching users found for "{searchTerm}"
              </div>
            ) : (
              filteredUsers.map(u => {
                const isSelected = selectedUserIds.includes(Number(u.id));
                return (
                  <div
                    key={`user-opt-${u.id}`}
                    onClick={() => toggleUser(u.id)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer transition ${
                      isSelected ? 'bg-blue-50/60 font-bold' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`h-4 w-4 rounded border flex items-center justify-center transition ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 bg-white'
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-900">{u.name}</div>
                        <div className="text-[10px] text-zinc-500">
                          {u.position || u.role} • {getDeptLabel(u)}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-black uppercase">
                        Selected
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
