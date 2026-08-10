/**
 * Professional Excel Report Generator with Dynamic Signatories & Institutional Executive Styling
 */

export function generateProfessionalExcelReport({
  tasks = [],
  user = {},
  users = [],
  reportTitle = 'INSTITUTIONAL DELIVERABLES & ACCOMPLISHMENTS REPORT',
  timeframeLabel = 'All Time (5-Year Historical Archive)'
}) {
  const nowStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed' || t.progress === 100).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Determine Signatories based on User Role & Department
  const isFacultyOrAcademic = user.role === 'FACULTY_STAFF' || user.role === 'PROGRAM_HEAD';

  // Find system leadership users automatically
  const programHeadUser = users.find(u => u.role === 'PROGRAM_HEAD' && (user.departmentId ? u.departmentId === user.departmentId : true)) 
    || users.find(u => u.role === 'PROGRAM_HEAD');
  
  const principalUser = users.find(u => u.role === 'PRINCIPAL');
  const schoolAdminUser = users.find(u => u.role === 'SCHOOL_ADMIN' || u.role === 'ADMIN');

  const preparedBy = user.name || 'System User';
  const preparedByTitle = user.position || (user.role === 'FACULTY_STAFF' ? 'Faculty / Academic Staff' : 'Admin Staff');

  const reviewedBy = programHeadUser ? programHeadUser.name : 'N/A (Program Head)';
  const reviewedByTitle = programHeadUser ? (programHeadUser.position || 'Program Head') : 'Program Head';

  const verifiedBy = principalUser ? principalUser.name : 'N/A (Principal)';
  const verifiedByTitle = principalUser ? (principalUser.position || 'School Principal') : 'School Principal';

  const approvedBy = schoolAdminUser ? schoolAdminUser.name : 'Michael Kim Palay';
  const approvedByTitle = schoolAdminUser ? (schoolAdminUser.position || 'School Administrator') : 'School Administrator';

  // Construct HTML Table for Native Excel Download with EXPLICIT NATIVE EXCEL ROW HEIGHTS & SIGNATURE SPACE
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Deliverables Accomplishment Report</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; background-color: #ffffff; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #94a3b8; padding: 8px 10px; font-family: Arial, sans-serif; }
      </style>
    </head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      
      <!-- HEADER BANNER -->
      <table style="width: 100%; border: none; margin-bottom: 15px;">
        <tr>
          <td style="border: none; text-align: center; background-color: #1e3a8a; color: #ffffff; padding: 14px; font-size: 18px; font-weight: 900; letter-spacing: 1px;">
            STI COLLEGE PUERTO PRINCESA
          </td>
        </tr>
        <tr>
          <td style="border: none; text-align: center; background-color: #0284c7; color: #ffffff; padding: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase;">
            ${reportTitle}
          </td>
        </tr>
      </table>

      <!-- SUMMARY METRICS BOX -->
      <table style="width: 100%; border: 2px solid #1e3a8a; margin-bottom: 20px; background-color: #f8fafc;">
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 800; color: #475569; background-color: #e2e8f0; width: 15%;">REPORT OWNER:</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 700; color: #0f172a; width: 35%;">${user.name || 'Staff User'} (${user.role || 'Staff'})</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 800; color: #475569; background-color: #e2e8f0; width: 15%;">DEPARTMENT:</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 700; color: #0f172a; width: 35%;">${user.departmentName || 'Academic / Administrative'}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 800; color: #475569; background-color: #e2e8f0;">TIMEFRAME PERIOD:</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 700; color: #0284c7;">${timeframeLabel}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 800; color: #475569; background-color: #e2e8f0;">DATE GENERATED:</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 700; color: #0f172a;">${nowStr}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 800; color: #475569; background-color: #e2e8f0;">TOTAL DELIVERABLES:</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 800; color: #0f172a;">${totalTasks} Tasks Listed</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 800; color: #475569; background-color: #e2e8f0;">COMPLETION RATE:</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 800; color: #16a34a;">${completedTasks} / ${totalTasks} Completed (${completionRate}%)</td>
        </tr>
      </table>

      <!-- DELIVERABLES DATA TABLE -->
      <table style="width: 100%; border-collapse: collapse; border: 2px solid #0f172a; margin-bottom: 35px;">
        <thead>
          <tr style="background-color: #1e293b; color: #ffffff;">
            <th style="border: 1px solid #0f172a; padding: 10px; font-weight: 800; text-align: center; width: 40px; background-color: #1e293b; color: #ffffff;">ID</th>
            <th style="border: 1px solid #0f172a; padding: 10px; font-weight: 800; text-align: left; width: 140px; background-color: #1e293b; color: #ffffff;">OWNER / ASSIGNEE</th>
            <th style="border: 1px solid #0f172a; padding: 10px; font-weight: 800; text-align: left; width: 120px; background-color: #1e293b; color: #ffffff;">CATEGORY</th>
            <th style="border: 1px solid #0f172a; padding: 10px; font-weight: 800; text-align: left; width: 280px; background-color: #1e293b; color: #ffffff;">DELIVERABLE DESCRIPTION</th>
            <th style="border: 1px solid #0f172a; padding: 10px; font-weight: 800; text-align: center; width: 90px; background-color: #1e293b; color: #ffffff;">DATE CREATED</th>
            <th style="border: 1px solid #0f172a; padding: 10px; font-weight: 800; text-align: center; width: 90px; background-color: #1e293b; color: #ffffff;">TARGET DATE</th>
            <th style="border: 1px solid #0f172a; padding: 10px; font-weight: 800; text-align: center; width: 70px; background-color: #1e293b; color: #ffffff;">PRIORITY</th>
            <th style="border: 1px solid #0f172a; padding: 10px; font-weight: 800; text-align: center; width: 70px; background-color: #1e293b; color: #ffffff;">PROGRESS</th>
            <th style="border: 1px solid #0f172a; padding: 10px; font-weight: 800; text-align: center; width: 110px; background-color: #1e293b; color: #ffffff;">STATUS</th>
          </tr>
        </thead>
        <tbody>
  `;

  tasks.forEach((t, index) => {
    const isEven = index % 2 === 0;
    const rowBg = isEven ? '#ffffff' : '#f1f5f9';
    const ownerName = t.user?.name || user.name || 'Staff';
    const createdStr = t.entryDate ? new Date(t.entryDate).toLocaleDateString('en-US', { dateStyle: 'short' }) : 'N/A';
    const targetStr = t.targetDate ? new Date(t.targetDate).toLocaleDateString('en-US', { dateStyle: 'short' }) : 'N/A';
    
    const prio = (t.priority || 'MEDIUM').toUpperCase();
    const prioStyle = prio === 'HIGH' ? 'color: #dc2626; font-weight: 900;' : prio === 'LOW' ? 'color: #16a34a; font-weight: 900;' : 'color: #d97706; font-weight: 900;';
    
    let statusBg = '#dbeafe';
    let statusFg = '#1d4ed8';
    if (t.status === 'Completed' || t.progress === 100) { statusBg = '#dcfce7'; statusFg = '#15803d'; }
    else if (t.status === 'Delayed') { statusBg = '#fee2e2'; statusFg = '#b91c1c'; }
    else if (t.status === 'Pending Acceptance') { statusBg = '#fef9c3'; statusFg = '#a16207'; }

    html += `
      <tr style="background-color: ${rowBg};">
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 700;">#${t.id}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 800;">${ownerName}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 700; color: #475569;">${t.category || 'General'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; color: #0f172a;">${t.taskDescription}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${createdStr}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 700;">${targetStr}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; ${prioStyle}">${prio}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-weight: 800;">${t.progress || 0}%</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
          <span style="background-color: ${statusBg}; color: ${statusFg}; font-weight: 800; padding: 4px 8px; border-radius: 4px; border: 1px solid ${statusFg};">
            ${t.status}
          </span>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>

      <!-- MULTI-ROW EXCEL SIGNATORIES BLOCK WITH HUGE PHYSICAL SIGNATURE SPACE -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 40px; page-break-inside: avoid;">
        <!-- Banner Title -->
        <tr>
          <td colspan="4" style="border: none; border-bottom: 3px solid #1e3a8a; font-weight: 900; font-size: 13px; color: #1e3a8a; padding-bottom: 8px; text-transform: uppercase;">
            OFFICIAL SIGNATORIES &amp; INSTITUTIONAL APPROVAL ENDORSEMENTS
          </td>
        </tr>

        <!-- Row 1: Signatory Title Labels -->
        <tr height="25" style="height: 25px;">
          <td style="border: none; padding-top: 15px; font-size: 10px; font-weight: 900; color: #475569; text-transform: uppercase; width: 25%;">
            1. PREPARED BY:
          </td>
          ${isFacultyOrAcademic ? `
          <td style="border: none; padding-top: 15px; font-size: 10px; font-weight: 900; color: #475569; text-transform: uppercase; width: 25%;">
            2. REVIEWED BY:
          </td>
          <td style="border: none; padding-top: 15px; font-size: 10px; font-weight: 900; color: #475569; text-transform: uppercase; width: 25%;">
            3. VERIFIED BY:
          </td>
          <td style="border: none; padding-top: 15px; font-size: 10px; font-weight: 900; color: #475569; text-transform: uppercase; width: 25%;">
            4. APPROVED BY:
          </td>
          ` : `
          <td colspan="3" style="border: none; padding-top: 15px; font-size: 10px; font-weight: 900; color: #475569; text-transform: uppercase; width: 75%;">
            2. APPROVED BY:
          </td>
          `}
        </tr>

        <!-- Row 2: Signature Space Grid Row 1 (Empty Excel Row) -->
        <tr height="30" style="height: 30px;">
          <td style="border: none; height: 30px;">&nbsp;</td>
          ${isFacultyOrAcademic ? `
          <td style="border: none; height: 30px;">&nbsp;</td>
          <td style="border: none; height: 30px;">&nbsp;</td>
          <td style="border: none; height: 30px;">&nbsp;</td>
          ` : `
          <td colspan="3" style="border: none; height: 30px;">&nbsp;</td>
          `}
        </tr>

        <!-- Row 3: Signature Space Grid Row 2 (Empty Excel Row) -->
        <tr height="30" style="height: 30px;">
          <td style="border: none; height: 30px;">&nbsp;</td>
          ${isFacultyOrAcademic ? `
          <td style="border: none; height: 30px;">&nbsp;</td>
          <td style="border: none; height: 30px;">&nbsp;</td>
          <td style="border: none; height: 30px;">&nbsp;</td>
          ` : `
          <td colspan="3" style="border: none; height: 30px;">&nbsp;</td>
          `}
        </tr>

        <!-- Row 4: Solid Underline Line Row -->
        <tr height="4" style="height: 4px;">
          <td style="border: none; border-bottom: 2px solid #0f172a; height: 4px; padding: 0;">&nbsp;</td>
          ${isFacultyOrAcademic ? `
          <td style="border: none; border-bottom: 2px solid #0f172a; height: 4px; padding: 0;">&nbsp;</td>
          <td style="border: none; border-bottom: 2px solid #0f172a; height: 4px; padding: 0;">&nbsp;</td>
          <td style="border: none; border-bottom: 2px solid #0f172a; height: 4px; padding: 0;">&nbsp;</td>
          ` : `
          <td colspan="3" style="border: none; border-bottom: 2px solid #0f172a; height: 4px; padding: 0;">&nbsp;</td>
          `}
        </tr>

        <!-- Row 5: Printed Full Name -->
        <tr height="25" style="height: 25px;">
          <td style="border: none; padding-top: 8px; font-weight: 900; font-size: 13px; color: #0f172a; text-transform: uppercase;">
            ${preparedBy}
          </td>
          ${isFacultyOrAcademic ? `
          <td style="border: none; padding-top: 8px; font-weight: 900; font-size: 13px; color: #0f172a; text-transform: uppercase;">
            ${reviewedBy}
          </td>
          <td style="border: none; padding-top: 8px; font-weight: 900; font-size: 13px; color: #0f172a; text-transform: uppercase;">
            ${verifiedBy}
          </td>
          <td style="border: none; padding-top: 8px; font-weight: 900; font-size: 13px; color: #0f172a; text-transform: uppercase;">
            ${approvedBy}
          </td>
          ` : `
          <td colspan="3" style="border: none; padding-top: 8px; font-weight: 900; font-size: 13px; color: #0f172a; text-transform: uppercase;">
            ${approvedBy}
          </td>
          `}
        </tr>

        <!-- Row 6: Position / Title -->
        <tr height="20" style="height: 20px;">
          <td style="border: none; font-size: 10px; font-weight: 700; color: #475569;">
            ${preparedByTitle}
          </td>
          ${isFacultyOrAcademic ? `
          <td style="border: none; font-size: 10px; font-weight: 700; color: #475569;">
            ${reviewedByTitle}
          </td>
          <td style="border: none; font-size: 10px; font-weight: 700; color: #475569;">
            ${verifiedByTitle}
          </td>
          <td style="border: none; font-size: 10px; font-weight: 700; color: #475569;">
            ${approvedByTitle}
          </td>
          ` : `
          <td colspan="3" style="border: none; font-size: 10px; font-weight: 700; color: #475569;">
            ${approvedByTitle}
          </td>
          `}
        </tr>
      </table>
    </body>
    </html>
  `;

  // Create Blob & Trigger Download
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileNameDate = new Date().toISOString().split('T')[0];
  a.download = `STI_Deliverables_Report_${timeframeLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${fileNameDate}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
