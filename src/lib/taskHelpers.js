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

  if (!lastActionBy && (task.status === 'Completed' || task.archived)) {
    lastActionType = 'Approved';
    lastActionBy = task.nominatedBy?.name || 'School Administrator';
  }

  return {
    nominator,
    lastActionBy,
    lastActionType,
    coAssignees
  };
}

export function getPendingElapsedInfo(task) {
  if (!task) return null;
  const status = task.status;
  const isPendingAcceptance = status === 'Pending Acceptance';
  const isAwaitingApproval = status === 'Awaiting Approval';
  const isAwaitingDeletion = status === 'Awaiting Deletion';

  if (!isPendingAcceptance && !isAwaitingApproval && !isAwaitingDeletion) {
    return null;
  }

  const dateToUse = task.updatedAt || task.createdAt || task.entryDate;
  if (!dateToUse) return null;

  const taskDate = new Date(dateToUse);
  const now = new Date();
  const diffMs = Math.max(0, now - taskDate);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  let text = '';
  if (diffDays === 0) {
    if (diffHours < 1) {
      text = isPendingAcceptance ? 'Pending < 1 hr (Acceptance)' : 'Pending < 1 hr (Approval)';
    } else {
      text = isPendingAcceptance 
        ? `Pending ${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} (Acceptance)` 
        : `Pending ${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} (Approval)`;
    }
  } else {
    text = isPendingAcceptance 
      ? `${diffDays} ${diffDays === 1 ? 'day' : 'days'} unaccepted` 
      : `${diffDays} ${diffDays === 1 ? 'day' : 'days'} unapproved`;
  }

  const isUrgent = diffDays >= 3;
  const badgeClass = isUrgent 
    ? 'bg-red-100 text-red-900 border-red-300 font-extrabold animate-pulse'
    : 'bg-amber-100 text-amber-900 border-amber-300 font-bold';

  return {
    days: diffDays,
    hours: diffHours,
    text,
    isUrgent,
    badgeClass,
    statusType: isPendingAcceptance ? 'acceptance' : 'approval'
  };
}

export function getTaskDelayDays(task) {
  if (!task || task.status === 'Completed' || task.archived) return 0;
  const now = new Date();
  let delayDays = 0;

  // 1. Check targetDate deadline delay
  if (task.targetDate) {
    const target = new Date(task.targetDate);
    if (now > target) {
      const diffMs = Math.max(0, now - target);
      delayDays = Math.max(delayDays, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  // 2. Check pending status inactivity delay (Awaiting Approval, Pending Acceptance, Delayed)
  const isPending = task.status === 'Awaiting Approval' || task.status === 'Pending Acceptance' || task.status === 'Awaiting Deletion' || task.status === 'Delayed';
  if (isPending) {
    const dateToUse = task.updatedAt || task.entryDate || task.createdAt;
    if (dateToUse) {
      const taskDate = new Date(dateToUse);
      const diffMs = Math.max(0, now - taskDate);
      const pendingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      delayDays = Math.max(delayDays, pendingDays);
    }
  }

  return delayDays;
}

export function getTaskEscalationInfo(task) {
  const delayDays = getTaskDelayDays(task);
  const isNteRequired = delayDays >= 4;
  const isJustificationRequired = delayDays >= 3 && delayDays < 4;
  
  let escalationType = 'NORMAL';
  if (delayDays >= 4) escalationType = 'NTE';
  else if (delayDays >= 3) escalationType = 'JUSTIFICATION';
  else if (delayDays > 0) escalationType = 'DELAYED';

  return {
    delayDays,
    escalationType,
    isJustificationRequired,
    isNteRequired
  };
}

export function getSupervisorInactivityList(tasks = [], users = []) {
  if (!Array.isArray(tasks)) return [];
  const now = new Date();

  // Map real supervisors from users list
  const supervisorMap = new Map();

  if (Array.isArray(users) && users.length > 0) {
    users.forEach(u => {
      if (u.role === 'PROGRAM_HEAD' || u.role === 'PRINCIPAL') {
        supervisorMap.set(u.id, {
          supervisorId: u.id,
          supervisorName: u.name,
          supervisorRole: u.role,
          departmentId: u.departmentId,
          departmentName: u.department?.name || u.position || 'Academic Department',
          tasks: []
        });
      }
    });
  }

  // Iterate over unacted tasks > 24 hours
  tasks.forEach(t => {
    if (t.status !== 'Awaiting Approval' && t.status !== 'Pending Acceptance' && t.status !== 'Awaiting Deletion') return;
    const dateToUse = t.updatedAt || t.entryDate || t.createdAt;
    if (!dateToUse) return;
    const diffMs = Math.max(0, now - new Date(dateToUse));
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) return;

    const pendingHours = Math.floor(diffHours);
    const pendingDays = Math.floor(pendingHours / 24);
    const taskItem = { ...t, pendingHours, pendingDays };

    const ownerRole = t.user?.role || 'FACULTY_STAFF';
    let targetSupId = null;

    if (ownerRole === 'PROGRAM_HEAD') {
      // Program Head tasks are strictly assigned to PRINCIPAL
      for (const [id, sup] of supervisorMap.entries()) {
        if (sup.supervisorRole === 'PRINCIPAL') {
          targetSupId = id;
          break;
        }
      }
    } else {
      // Faculty/Staff tasks are strictly assigned to PROGRAM HEAD of their department
      for (const [id, sup] of supervisorMap.entries()) {
        if (sup.supervisorRole === 'PROGRAM_HEAD') {
          if (t.user?.departmentId && sup.departmentId === t.user.departmentId) {
            targetSupId = id;
            break;
          }
          if (t.user?.department?.name && sup.departmentName === t.user.department.name) {
            targetSupId = id;
            break;
          }
        }
      }

      if (!targetSupId && t.nominatedById && supervisorMap.has(t.nominatedById)) {
        const nomSup = supervisorMap.get(t.nominatedById);
        if (nomSup.supervisorRole === 'PROGRAM_HEAD') {
          targetSupId = t.nominatedById;
        }
      }

      if (!targetSupId) {
        for (const [id, sup] of supervisorMap.entries()) {
          if (sup.supervisorRole === 'PROGRAM_HEAD') {
            targetSupId = id;
            break;
          }
        }
      }
    }

    if (targetSupId && supervisorMap.has(targetSupId)) {
      supervisorMap.get(targetSupId).tasks.push(taskItem);
    } else if (t.nominatedBy?.name && t.nominatedBy?.role !== 'PRINCIPAL') {
      const nomId = t.nominatedById || `nom-${t.id}`;
      if (!supervisorMap.has(nomId)) {
        supervisorMap.set(nomId, {
          supervisorId: nomId,
          supervisorName: t.nominatedBy.name,
          supervisorRole: t.nominatedBy.role || 'PROGRAM_HEAD',
          departmentName: t.user?.department?.name || 'Department',
          tasks: []
        });
      }
      supervisorMap.get(nomId).tasks.push(taskItem);
    }
  });

  return Array.from(supervisorMap.values()).map(g => ({
    ...g,
    unactedCount: g.tasks.length
  }));
}
