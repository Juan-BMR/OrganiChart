/**
 * Export members data to CSV file
 * @param {Array} members - Array of member objects to export
 * @param {string} filename - Name of the exported file (without extension)
 */
export function exportMembersToCSV(members, filename = 'members-export') {
  if (!members || members.length === 0) {
    console.warn('No members to export');
    return;
  }

  // Define CSV headers
  const headers = ['Name', 'Email', 'Role', 'Department', 'Manager', 'Phone', 'Location', 'Start Date'];
  
  // Convert members data to CSV format
  const csvContent = [
    headers.join(','),
    ...members.map(member => {
      return [
        escapeCSV(member.name || ''),
        escapeCSV(member.email || ''),
        escapeCSV(member.role || ''),
        escapeCSV(member.department || ''),
        escapeCSV(member.managerName || ''),
        escapeCSV(member.phone || ''),
        escapeCSV(member.location || ''),
        escapeCSV(member.startDate || '')
      ].join(',');
    })
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Escape special characters in CSV values
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // If value contains comma, quotes, or newlines, wrap in quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Export members data to JSON file
 * @param {Array} members - Array of member objects to export
 * @param {string} filename - Name of the exported file (without extension)
 */
export function exportMembersToJSON(members, filename = 'members-export') {
  if (!members || members.length === 0) {
    console.warn('No members to export');
    return;
  }

  const jsonContent = JSON.stringify(members, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.json`);
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Generate a printable org chart report
 * @param {Object} organization - Organization data
 * @param {Array} members - Array of member objects
 * @returns {string} HTML content for printing
 */
export function generateOrgChartReport(organization, members) {
  const reportHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${organization.name} - Organization Chart Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #333;
        }
        .header h1 {
          margin: 0;
          color: #2c3e50;
        }
        .header p {
          margin: 5px 0;
          color: #666;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-card h3 {
          margin: 0;
          color: #2c3e50;
          font-size: 2em;
        }
        .stat-card p {
          margin: 5px 0 0 0;
          color: #666;
        }
        .members-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        .members-table th,
        .members-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        .members-table th {
          background-color: #2c3e50;
          color: white;
          font-weight: bold;
        }
        .members-table tr:hover {
          background-color: #f5f5f5;
        }
        @media print {
          body {
            margin: 0;
            padding: 10px;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escapeHTML(organization.name)}</h1>
        <p>Organization Chart Report</p>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="stats">
        <div class="stat-card">
          <h3>${members.length}</h3>
          <p>Total Members</p>
        </div>
        <div class="stat-card">
          <h3>${[...new Set(members.map(m => m.department).filter(Boolean))].length}</h3>
          <p>Departments</p>
        </div>
        <div class="stat-card">
          <h3>${[...new Set(members.map(m => m.role).filter(Boolean))].length}</h3>
          <p>Unique Roles</p>
        </div>
      </div>
      
      <h2>Team Members</h2>
      <table class="members-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Reports To</th>
          </tr>
        </thead>
        <tbody>
          ${members.map(member => `
            <tr>
              <td>${escapeHTML(member.name || '')}</td>
              <td>${escapeHTML(member.email || '')}</td>
              <td>${escapeHTML(member.role || '')}</td>
              <td>${escapeHTML(member.department || '')}</td>
              <td>${escapeHTML(member.managerName || 'N/A')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  return reportHTML;
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHTML(str) {
  if (!str) return '';
  
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return str.replace(/[&<>"']/g, char => escapeMap[char]);
}