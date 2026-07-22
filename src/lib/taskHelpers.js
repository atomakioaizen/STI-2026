export function getTaskActorInfo(task) {
  if (!task) return { nominator: null, lastActionBy: null, lastActionType: null, coAssignees: null };

  let nominator = task.nominatedBy?.name || null;

  let lastActionBy = null;
  let lastActionType = null;
  let coAssignees = null;

  if (task.remarks) {
    try {
      const parsed = typeof task.remarks === 'string' ? JSON.parse(task.remarks) : task.remarks;
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (let i = parsed.length - 1; i >= 0; i--) {
          const m = parsed[i];
          const text = m.message || '';

          if (!coAssignees && text.toLowerCase().includes('co-assigned with')) {
            const match = text.match(/co-assigned with\s+(.+)/i);
            if (match && match[1]) {
              coAssignees = match[1].trim();
            }
          }

          if (!lastActionType) {
            if (text.toLowerCase().includes('approved')) {
              const match = text.match(/Supervisor\s+(.+?)\s+approved/i);
              if (match && match[1]) {
                lastActionBy = match[1].trim();
              } else if (m.sender && m.sender !== 'System') {
                lastActionBy = m.sender;
              }
              lastActionType = 'Approved';
            } else if (text.toLowerCase().includes('rejected')) {
              const match = text.match(/Supervisor\s+(.+?)\s+rejected/i);
              if (match && match[1]) {
                lastActionBy = match[1].trim();
              } else if (m.sender && m.sender !== 'System') {
                lastActionBy = m.sender;
              }
              lastActionType = 'Rejected';
            } else if (text.toLowerCase().includes('accepted by')) {
              const match = text.match(/accepted by\s+([^.]+)/i);
              if (match && match[1]) {
                lastActionBy = match[1].trim();
              } else if (m.sender && m.sender !== 'System') {
                lastActionBy = m.sender;
              }
              lastActionType = 'Accepted';
            }
          }
        }
      }
    } catch (e) {}
  }

  if (!lastActionBy && task.status === 'Rejected' && task.rejectionReason) {
    lastActionType = 'Rejected';
    lastActionBy = task.user?.name || null;
  }

  return {
    nominator,
    lastActionBy,
    lastActionType,
    coAssignees
  };
}
