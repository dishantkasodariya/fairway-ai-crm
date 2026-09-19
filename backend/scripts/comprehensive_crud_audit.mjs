import { generateToken } from '../dist/utils/jwt.js';

const token = generateToken({ userId: 'usr_admin_1', email: 'admin@fairway.co.in', role: 'admin' });
const headers = {
  'Authorization': 'Bearer ' + token,
  'Content-Type': 'application/json'
};

const BASE = 'http://127.0.0.1:5000/api';

const results = [];

async function testCrud(name, createUrl, createBody, getIdFromRes, updateUrlFn, updateBody, deleteUrlFn) {
  let item = { name, create: 'NO', read: 'NO', update: 'NO', delete: 'NO', error: null };
  let createdId = null;

  // 1. CREATE (POST)
  try {
    const cRes = await fetch(BASE + createUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(createBody)
    });
    const cData = await cRes.json().catch(() => ({}));
    if (cRes.status >= 200 && cRes.status < 300 && (cData.success || cData.id || cData.data)) {
      item.create = 'YES';
      createdId = getIdFromRes(cData);
    } else {
      item.create = 'NO';
      item.error = `CREATE failed (${cRes.status}): ` + JSON.stringify(cData.error || cData.message || cData);
    }
  } catch (err) {
    item.create = 'NO';
    item.error = `CREATE network error: ${err.message}`;
  }

  // 2. READ (GET)
  try {
    const rRes = await fetch(BASE + createUrl, { headers });
    const rData = await rRes.json().catch(() => ({}));
    if (rRes.status === 200 && (rData.success || Array.isArray(rData.data) || Array.isArray(rData))) {
      item.read = 'YES';
    } else {
      item.read = 'NO';
      if (!item.error) item.error = `READ failed (${rRes.status}): ` + JSON.stringify(rData.error || rData.message);
    }
  } catch (err) {
    item.read = 'NO';
    if (!item.error) item.error = `READ network error: ${err.message}`;
  }

  // 3. UPDATE (PUT/PATCH)
  if (createdId && updateUrlFn && updateBody) {
    try {
      const uUrl = updateUrlFn(createdId);
      const uRes = await fetch(BASE + uUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateBody)
      });
      const uData = await uRes.json().catch(() => ({}));
      if (uRes.status >= 200 && uRes.status < 300) {
        item.update = 'YES';
      } else {
        item.update = 'NO';
        if (!item.error) item.error = `UPDATE failed (${uRes.status}): ` + JSON.stringify(uData.error || uData.message || uData);
      }
    } catch (err) {
      item.update = 'NO';
      if (!item.error) item.error = `UPDATE error: ${err.message}`;
    }
  } else if (!updateUrlFn) {
    item.update = 'N/A';
  }

  // 4. DELETE
  if (createdId && deleteUrlFn) {
    try {
      const dUrl = deleteUrlFn(createdId);
      const dRes = await fetch(BASE + dUrl, {
        method: 'DELETE',
        headers
      });
      const dData = await dRes.json().catch(() => ({}));
      if (dRes.status >= 200 && dRes.status < 300) {
        item.delete = 'YES';
      } else {
        item.delete = 'NO';
        if (!item.error) item.error = `DELETE failed (${dRes.status}): ` + JSON.stringify(dData.error || dData.message || dData);
      }
    } catch (err) {
      item.delete = 'NO';
      if (!item.error) item.error = `DELETE error: ${err.message}`;
    }
  } else if (!deleteUrlFn) {
    item.delete = 'N/A';
  }

  results.push(item);
}

async function run() {
  console.log('Beginning comprehensive project-wide CRUD audit...');

  // 1. Companies
  await testCrud(
    'Companies',
    '/companies',
    { name: 'Audit Test Logistics Ltd', industry: 'Logistics', status: 'Lead', city: 'Ahmedabad' },
    (d) => d.data?.id || d.id,
    (id) => `/companies/${id}`,
    { name: 'Audit Test Logistics Ltd Updated', status: 'Active' },
    (id) => `/companies/${id}`
  );

  // 2. Contacts
  await testCrud(
    'Contacts',
    '/contacts',
    { name: 'Rohan Sharma', email: 'rohan.audit@test.com', phone: '+91 9998887776', designation: 'Manager' },
    (d) => d.data?.id || d.id,
    (id) => `/contacts/${id}`,
    { name: 'Rohan Sharma Updated', phone: '+91 9998887777' },
    (id) => `/contacts/${id}`
  );

  // 3. Facilities
  await testCrud(
    'Facilities',
    '/facilities',
    { name: 'Audit Test Hub Alpha', type: 'Distribution Center', city: 'Sanand', state: 'Gujarat' },
    (d) => d.data?.id || d.id,
    (id) => `/facilities/${id}`,
    { name: 'Audit Test Hub Alpha Updated', status: 'Active' },
    (id) => `/facilities/${id}`
  );

  // 4. Inquiries
  await testCrud(
    'Inquiries',
    '/inquiries',
    {
      companyName: 'Audit Test Company',
      requiredAreaSqFt: 45000,
      location: 'Sanand',
      industry: 'Auto Ancillary',
      priority: 'High',
      stage: 'new',
      status: 'Active'
    },
    (d) => d.data?.id || d.id,
    (id) => `/inquiries/${id}`,
    { requirement: 'Updated requirement notes' },
    (id) => `/inquiries/${id}`
  );

  // 5. Tasks
  await testCrud(
    'Tasks',
    '/tasks',
    {
      description: 'Audit Test Scheduled Follow-up',
      taskType: 'Follow-up',
      priority: 'High',
      dueDate: '2026-09-25',
      assignedUserId: 'usr_admin_1',
      status: 'Pending'
    },
    (d) => d.data?.id || d.id,
    (id) => `/tasks/${id}`,
    { description: 'Audit Test Updated Description' },
    (id) => `/tasks/${id}`
  );

  // 6. Activities
  await testCrud(
    'Activities',
    '/activities',
    { type: 'Note', description: 'Audit test activity entry', entityType: 'company', entityId: 'comp_1' },
    (d) => d.data?.id || d.id,
    null,
    null,
    (id) => `/activities/${id}`
  );

  // 7. Notes
  await testCrud(
    'Notes',
    '/notes',
    { entityType: 'company', entityId: 'comp_1', content: 'Audit test note body' },
    (d) => d.data?.id || d.id,
    null,
    null,
    (id) => `/notes/${id}`
  );

  // 8. Follow-ups
  await testCrud(
    'Follow-ups',
    '/follow-ups',
    { followUpDate: '2026-09-24', summary: 'Audit test follow up', priority: 'High', channel: 'Call' },
    (d) => d.data?.id || d.id,
    (id) => `/follow-ups/${id}`,
    { status: 'Completed', outcomeNotes: 'Call concluded successfully' },
    (id) => `/follow-ups/${id}`
  );

  // 9. Properties
  await testCrud(
    'Properties',
    '/properties',
    { name: 'Audit Test Industrial Park', location: 'Dahej', totalAreaSqFt: 80000, rentPerSqFtINR: 24 },
    (d) => d.data?.id || d.id,
    (id) => `/properties/${id}`,
    { name: 'Audit Test Industrial Park Updated' },
    (id) => `/properties/${id}`
  );

  // 10. Proposals
  await testCrud(
    'Proposals',
    '/proposals',
    { companyId: 'comp_1', companyName: 'Adani Wilmar', propertyId: 'prop_1', propertyName: 'Dahej Logistics Park', proposedAreaSqFt: 50000, baseRentPerSqFtINR: 22 },
    (d) => d.data?.id || d.id,
    (id) => `/proposals/${id}`,
    { status: 'Accepted' },
    (id) => `/proposals/${id}`
  );

  // 11. Users
  await testCrud(
    'Users',
    '/users',
    { name: 'Audit Test User', email: `audit.user.${Date.now()}@test.com`, password: 'password123', role: 'sales_executive' },
    (d) => d.data?.id || d.id,
    (id) => `/users/${id}`,
    { name: 'Audit Test User Updated' },
    (id) => `/users/${id}`
  );

  // 12. Roles
  await testCrud(
    'Roles',
    '/roles',
    { name: 'Audit Auditor Role', description: 'Test role for CRUD audit' },
    (d) => d.data?.id || d.id,
    (id) => `/roles/${id}`,
    { description: 'Updated role description' },
    (id) => `/roles/${id}`
  );

  // 13. Documents
  await testCrud(
    'Documents',
    '/documents',
    { name: 'Audit_Test_Document.pdf', entityType: 'company', entityId: 'comp_1', fileUrl: 'https://example.com/test.pdf', fileType: 'pdf', fileSize: 2048 },
    (d) => d.data?.id || d.id,
    null,
    null,
    (id) => `/documents/${id}`
  );

  // 14. Communications
  await testCrud(
    'Communications',
    '/communications',
    { channel: 'Email', message: 'Audit test message communication', subject: 'Test Subject' },
    (d) => d.data?.id || d.id,
    null,
    null,
    (id) => `/communications/${id}`
  );

  // 15. Site Visits
  await testCrud(
    'Site-Visits',
    '/site-visits',
    { companyName: 'Audit Test Co', propertyName: 'Audit Test Park', scheduledDate: '2026-09-28', visitorName: 'Rohan' },
    (d) => d.data?.id || d.id,
    (id) => `/site-visits/${id}`,
    { status: 'Completed', feedback: 'Good location' },
    (id) => `/site-visits/${id}`
  );

  // 16. Pipeline Stages
  await testCrud(
    'Pipeline-Stages',
    '/pipeline-stages',
    { key: `test_stg_${Date.now().toString().slice(-4)}`, label: 'Audit Stage', order: 99 },
    (d) => d.data?.id || d.id,
    null,
    null,
    null
  );

  // 17. Notifications
  await testCrud(
    'Notifications',
    '/notifications',
    { title: 'Audit Alert', message: 'Audit test notification alert', type: 'info', userId: 'usr_admin_1' },
    (d) => d.data?.id || d.id,
    null,
    null,
    null
  );

  // 18. Calls
  await testCrud(
    'Calls',
    '/calls',
    { subject: 'Audit Call Scheduled', callType: 'Outbound', callStatus: 'Scheduled', callStartDate: '2026-09-23' },
    (d) => d.data?.id || d.id,
    (id) => `/calls/${id}`,
    { callStatus: 'Completed', callResult: 'Interested' },
    (id) => `/calls/${id}`
  );

  console.log('\n--- CRUD AUDIT SUMMARY TABLE ---');
  console.table(results);
  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
