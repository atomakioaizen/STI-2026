import * as XLSX from 'xlsx';

export function exportTasksToExcel(tasks, reportTitle = 'Task Monitoring Report') {
  if (!tasks || tasks.length === 0) return;

  // 1. Prepare data rows
  const formattedData = tasks.map((t, idx) => ({
    'NO.': idx + 1,
    'CATEGORY': t.category || '',
    'TASK DESCRIPTION': t.taskDescription || '',
    'PRIORITY': t.priority || '',
    'STATUS': t.status || '',
    'PROGRESS (%)': `${t.progress}%`,
    'ASSIGNEE': t.user?.name || 'Unassigned',
    'DEPARTMENT': t.user?.departmentName || t.user?.department?.name || 'N/A',
    'DEADLINE / TARGET DATE': t.targetDate ? new Date(t.targetDate).toLocaleDateString() : 'No Deadline',
    'ENTRY DATE': t.entryDate ? new Date(t.entryDate).toLocaleDateString() : 'N/A',
    'REMARKS': t.remarks || '',
    'EVIDENCE LINK': t.evidenceLink || ''
  }));

  // 2. Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // 3. Auto-fit columns
  const colsWidth = [];
  if (formattedData.length > 0) {
    const keys = Object.keys(formattedData[0]);
    keys.forEach((key) => {
      let maxLength = key.length;
      formattedData.forEach((row) => {
        const val = row[key] ? String(row[key]) : '';
        if (val.length > maxLength) {
          maxLength = val.length;
        }
      });
      colsWidth.push({ wch: Math.min(Math.max(maxLength + 4, 10), 50) });
    });
  }
  worksheet['!cols'] = colsWidth;

  // 4. Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks Report');

  // 5. Generate date string for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const fileName = `${reportTitle.replace(/\s+/g, '_')}_${dateStr}.xlsx`;

  // 6. Write and download file
  XLSX.writeFile(workbook, fileName);
}
