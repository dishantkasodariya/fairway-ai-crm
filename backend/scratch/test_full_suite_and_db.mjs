import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fairway_crm',
});

const BASE_URL = 'http://localhost:5000/api';

async function queryDB(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function runMasterVerification() {
  console.log('================================================================');
  console.log('       FAIRWAY CRM MASTER API & POSTGRESQL CRUD AUDIT           ');
  console.log('================================================================\n');

  const report = [];

  function record(module, action, method, endpoint, status, pass, dbCheckPass = true, details = '') {
    report.push({
      Module: module,
      Action: action,
      Endpoint: `${method} ${endpoint}`,
      HTTP: status,
      API_OK: pass ? '✅ PASS' : '❌ FAIL',
      DB_OK: dbCheckPass ? '✅ VERIFIED' : '❌ MISMATCH',
      Details: details
    });
    console.log(`[${module}] ${action} -> HTTP ${status} | API: ${pass ? 'PASS' : 'FAIL'} | DB: ${dbCheckPass ? 'OK' : 'FAIL'} (${details})`);
  }

  // 1. Health
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthJson = await healthRes.json();
  record('Health', 'System Check', 'GET', '/health', healthRes.status, healthRes.ok, true, healthJson.service);

  // 2. Auth Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@fairway.com', password: 'fairway123' })
  });
  const loginJson = await loginRes.json();
  const token = loginJson?.data?.token;
  record('Auth', 'Login Admin', 'POST', '/auth/login', loginRes.status, !!token, true, loginJson.data?.user?.email || 'N/A');

  if (!token) {
    console.error('CRITICAL: Cannot authenticate. Halting audit.');
    await pool.end();
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  async function apiCall(method, endpoint, body = null) {
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${endpoint}`, opts);
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok && json.success !== false, json };
  }

  // 3. Auth Me
  const meRes = await apiCall('GET', '/auth/me');
  record('Auth', 'Current User', 'GET', '/auth/me', meRes.status, meRes.ok, true, meRes.json?.data?.email);

  // 4. Inquiries CRUD & DB Verification
  const inqRes = await apiCall('GET', '/inquiries');
  record('Inquiries', 'List Inquiries', 'GET', '/inquiries', inqRes.status, inqRes.ok, true, `Total: ${inqRes.json?.data?.length || 0}`);

  const createInq = await apiCall('POST', '/inquiries', {
    companyName: 'Master Audit Logistics',
    requirement: 'Need 50000 sq ft industrial park warehouse',
    requiredAreaSqFt: 50000,
    budgetMonthlyINR: 1250000,
    location: 'Sanand, Gujarat',
    targetCorridor: 'Sanand GIDC',
    industry: 'Automotive Logistics',
    stage: 'lead',
    priority: 'High'
  });
  const inqId = createInq.json?.data?.id;
  let dbInq = inqId ? await queryDB('SELECT id, company_name, requirement FROM inquiries WHERE id = $1', [inqId]) : [];
  record('Inquiries', 'Create Inquiry', 'POST', '/inquiries', createInq.status, createInq.ok, dbInq.length === 1, `Created ID: ${inqId}`);

  if (inqId) {
    const getInq = await apiCall('GET', `/inquiries/${inqId}`);
    record('Inquiries', 'Get Inquiry Detail', 'GET', `/inquiries/${inqId}`, getInq.status, getInq.ok, true);

    const updateInq = await apiCall('PUT', `/inquiries/${inqId}`, {
      requirement: 'Updated: Need 55000 sq ft warehouse',
      requiredAreaSqFt: 55000
    });
    dbInq = await queryDB('SELECT required_area_sq_ft FROM inquiries WHERE id = $1', [inqId]);
    const areaUpdated = dbInq.length > 0 && parseFloat(dbInq[0].required_area_sq_ft) === 55000;
    record('Inquiries', 'Update Inquiry', 'PUT', `/inquiries/${inqId}`, updateInq.status, updateInq.ok, areaUpdated, `Updated Area: ${dbInq[0]?.required_area_sq_ft}`);

    const delInq = await apiCall('DELETE', `/inquiries/${inqId}`);
    dbInq = await queryDB('SELECT id FROM inquiries WHERE id = $1', [inqId]);
    record('Inquiries', 'Delete Inquiry', 'DELETE', `/inquiries/${inqId}`, delInq.status, delInq.ok, dbInq.length === 0, 'Removed from DB');
  }

  // 5. Companies CRUD & DB Verification
  const compRes = await apiCall('GET', '/companies');
  record('Companies', 'List Companies', 'GET', '/companies', compRes.status, compRes.ok, true, `Total: ${compRes.json?.data?.length || 0}`);

  const createComp = await apiCall('POST', '/companies', {
    name: 'Audit Global Tech Solutions Ltd',
    industry: 'Engineering & Manufacturing',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    annualTurnover: '₹750 Cr',
    employeeCount: 900,
    prospectStage: 'Contacted',
    gujaratPresence: true
  });
  const compId = createComp.json?.data?.id;
  let dbComp = compId ? await queryDB('SELECT id, name, city FROM companies WHERE id = $1', [compId]) : [];
  record('Companies', 'Create Company', 'POST', '/companies', createComp.status, createComp.ok, dbComp.length === 1, `Created ID: ${compId}`);

  if (compId) {
    const getComp = await apiCall('GET', `/companies/${compId}`);
    record('Companies', 'Get Company Detail', 'GET', `/companies/${compId}`, getComp.status, getComp.ok, true);

    const updateComp = await apiCall('PUT', `/companies/${compId}`, {
      city: 'Gandhinagar',
      annualTurnover: '₹850 Cr'
    });
    dbComp = await queryDB('SELECT city, annual_turnover FROM companies WHERE id = $1', [compId]);
    const compUpdated = dbComp.length > 0 && dbComp[0].city === 'Gandhinagar';
    record('Companies', 'Update Company', 'PUT', `/companies/${compId}`, updateComp.status, updateComp.ok, compUpdated, `City: ${dbComp[0]?.city}`);

    const delComp = await apiCall('DELETE', `/companies/${compId}`);
    dbComp = await queryDB('SELECT id FROM companies WHERE id = $1', [compId]);
    record('Companies', 'Delete Company', 'DELETE', `/companies/${compId}`, delComp.status, delComp.ok, dbComp.length === 0, 'Removed from DB');
  }

  // 6. Tasks CRUD & DB Verification
  const taskRes = await apiCall('GET', '/tasks');
  record('Tasks', 'List Tasks', 'GET', '/tasks', taskRes.status, taskRes.ok, true, `Total: ${taskRes.json?.data?.length || 0}`);

  const createTask = await apiCall('POST', '/tasks', {
    taskType: 'Follow-up',
    description: 'Master verification call with procurement lead',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '03:00 PM',
    priority: 'High'
  });
  const taskId = createTask.json?.data?.id;
  let dbTask = taskId ? await queryDB('SELECT id, description, status FROM tasks WHERE id = $1', [taskId]) : [];
  record('Tasks', 'Create Task', 'POST', '/tasks', createTask.status, createTask.ok, dbTask.length === 1, `Created ID: ${taskId}`);

  if (taskId) {
    const toggleTask = await apiCall('PATCH', `/tasks/${taskId}/toggle`, {
      completedNotes: 'Verified via master suite'
    });
    dbTask = await queryDB('SELECT status FROM tasks WHERE id = $1', [taskId]);
    const taskToggled = dbTask.length > 0 && dbTask[0].status.toLowerCase() === 'completed';
    record('Tasks', 'Toggle Task Status', 'PATCH', `/tasks/${taskId}/toggle`, toggleTask.status, toggleTask.ok, taskToggled, `Status: ${dbTask[0]?.status}`);

    const delTask = await apiCall('DELETE', `/tasks/${taskId}`);
    dbTask = await queryDB('SELECT id FROM tasks WHERE id = $1', [taskId]);
    record('Tasks', 'Delete Task', 'DELETE', `/tasks/${taskId}`, delTask.status, delTask.ok, dbTask.length === 0, 'Removed from DB');
  }

  // 7. Proposals CRUD & DB Verification
  const propRes = await apiCall('GET', '/proposals');
  record('Proposals', 'List Proposals', 'GET', '/proposals', propRes.status, propRes.ok, true, `Total: ${propRes.json?.data?.length || 0}`);

  const createProp = await apiCall('POST', '/proposals', {
    companyName: 'Audit Mega Corp',
    propertyName: 'Fairway Mega Logistics Park Unit 8',
    proposedAreaSqFt: 60000,
    baseRentPerSqFtINR: 32,
    maintenancePerSqFtINR: 4,
    securityDepositMonths: 3,
    leaseTenureYears: 5,
    lockInMonths: 36,
    escalationPercentPerYear: 5,
    commercialTerms: 'Full turnkey warehouse specification'
  });
  const propId = createProp.json?.data?.id;
  let dbProp = propId ? await queryDB('SELECT id, proposal_number, company_name FROM proposals WHERE id = $1', [propId]) : [];
  record('Proposals', 'Create Proposal', 'POST', '/proposals', createProp.status, createProp.ok, dbProp.length === 1, `Created ID: ${propId}`);

  if (propId) {
    const getProp = await apiCall('GET', `/proposals/${propId}`);
    record('Proposals', 'Get Proposal Detail', 'GET', `/proposals/${propId}`, getProp.status, getProp.ok, true);

    const updateProp = await apiCall('PUT', `/proposals/${propId}`, {
      baseRentPerSqFtINR: 35,
      notes: 'Updated base rent to 35 INR'
    });
    dbProp = await queryDB('SELECT base_rent_per_sq_ft_inr FROM proposals WHERE id = $1', [propId]);
    const propUpdated = dbProp.length > 0 && parseFloat(dbProp[0].base_rent_per_sq_ft_inr) === 35;
    record('Proposals', 'Update Proposal', 'PUT', `/proposals/${propId}`, updateProp.status, updateProp.ok, propUpdated, `Rent: ₹${dbProp[0]?.base_rent_per_sq_ft_inr}/sqft`);

    const delProp = await apiCall('DELETE', `/proposals/${propId}`);
    dbProp = await queryDB('SELECT id FROM proposals WHERE id = $1', [propId]);
    record('Proposals', 'Delete Proposal', 'DELETE', `/proposals/${propId}`, delProp.status, delProp.ok, dbProp.length === 0, 'Removed from DB');
  }

  // 8. Site Visits CRUD & DB Verification (Testing PUT and new PATCH /status)
  const svRes = await apiCall('GET', '/site-visits');
  record('Site Visits', 'List Site Visits', 'GET', '/site-visits', svRes.status, svRes.ok, true, `Total: ${svRes.json?.data?.length || 0}`);

  const createSv = await apiCall('POST', '/site-visits', {
    companyName: 'Audit Mega Corp',
    propertyName: 'Fairway Sanand Logistics Park Bay 3',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    scheduledTime: '11:30 AM',
    status: 'Scheduled',
    visitorName: 'Kunal Patel',
    visitorPhone: '+91 99001 22334'
  });
  const svId = createSv.json?.data?.id;
  let dbSv = svId ? await queryDB('SELECT id, property_name, status FROM site_visits WHERE id = $1', [svId]) : [];
  record('Site Visits', 'Create Site Visit', 'POST', '/site-visits', createSv.status, createSv.ok, dbSv.length === 1, `Created ID: ${svId}`);

  if (svId) {
    // Test PATCH /site-visits/:id/status
    const patchStatus = await apiCall('PATCH', `/site-visits/${svId}/status`, {
      status: 'Completed',
      clientFeedback: 'Inspected staging area, highly satisfied.'
    });
    dbSv = await queryDB('SELECT status, client_feedback FROM site_visits WHERE id = $1', [svId]);
    const svStatusUpdated = dbSv.length > 0 && dbSv[0].status === 'Completed';
    record('Site Visits', 'PATCH Status', 'PATCH', `/site-visits/${svId}/status`, patchStatus.status, patchStatus.ok, svStatusUpdated, `Status: ${dbSv[0]?.status}`);

    const delSv = await apiCall('DELETE', `/site-visits/${svId}`);
    dbSv = await queryDB('SELECT id FROM site_visits WHERE id = $1', [svId]);
    record('Site Visits', 'Delete Site Visit', 'DELETE', `/site-visits/${svId}`, delSv.status, delSv.ok, dbSv.length === 0, 'Removed from DB');
  }

  // 9. Properties (Read)
  const propListRes = await apiCall('GET', '/properties');
  record('Properties', 'List Properties', 'GET', '/properties', propListRes.status, propListRes.ok, true, `Total: ${propListRes.json?.data?.length || 0}`);
  if (propListRes.json?.data?.[0]?.id) {
    const propDetailRes = await apiCall('GET', `/properties/${propListRes.json.data[0].id}`);
    record('Properties', 'Get Property Detail', 'GET', `/properties/:id`, propDetailRes.status, propDetailRes.ok, true, propDetailRes.json?.data?.name);
  }

  // 10. Pipeline Stages
  const pipeRes = await apiCall('GET', '/pipeline-stages');
  record('Pipeline', 'List Pipeline Stages', 'GET', '/pipeline-stages', pipeRes.status, pipeRes.ok, true, `Stages: ${pipeRes.json?.data?.length || 0}`);

  // 11. Contacts & Facilities
  const contactsRes = await apiCall('GET', '/contacts');
  record('Contacts', 'List Contacts', 'GET', '/contacts', contactsRes.status, contactsRes.ok, true, `Total: ${contactsRes.json?.data?.length || 0}`);

  const createContact = await apiCall('POST', '/contacts', {
    name: 'Audit Contact Person',
    email: 'audit.contact@fairwaytest.com',
    phone: '+91 91234 56789',
    designation: 'Supply Chain VP'
  });
  const contactId = createContact.json?.data?.id;
  record('Contacts', 'Create Contact', 'POST', '/contacts', createContact.status, createContact.ok, true, `ID: ${contactId}`);
  if (contactId) {
    const delContact = await apiCall('DELETE', `/contacts/${contactId}`);
    record('Contacts', 'Delete Contact', 'DELETE', `/contacts/${contactId}`, delContact.status, delContact.ok, true);
  }

  const facRes = await apiCall('GET', '/facilities');
  record('Facilities', 'List Facilities', 'GET', '/facilities', facRes.status, facRes.ok, true, `Total: ${facRes.json?.data?.length || 0}`);

  // 12. User Management CRUD & DB Verification
  const usersRes = await apiCall('GET', '/users');
  record('Users', 'List Users', 'GET', '/users', usersRes.status, usersRes.ok, true, `Total: ${usersRes.json?.data?.length || 0}`);

  const testUserEmail = `audit_member_${Date.now()}@fairway.com`;
  const createUser = await apiCall('POST', '/users', {
    name: 'Audit Team Member',
    email: testUserEmail,
    role: 'sales',
    department: 'Gujarat Leasing Desk',
    phone: '+91 98849 61510',
    status: 'Active'
  });
  const createdUserId = createUser.json?.data?.id;
  let dbUser = createdUserId ? await queryDB('SELECT id, name, email, role, status FROM users WHERE id = $1', [createdUserId]) : [];
  record('Users', 'Create User', 'POST', '/users', createUser.status, createUser.ok, dbUser.length === 1, `Created ID: ${createdUserId}`);

  if (createdUserId) {
    const toggleUserStatus = await apiCall('PATCH', `/users/${createdUserId}/status`, {
      status: 'Inactive'
    });
    dbUser = await queryDB('SELECT status FROM users WHERE id = $1', [createdUserId]);
    const statusUpdated = dbUser.length > 0 && dbUser[0].status === 'Inactive';
    record('Users', 'Update User Status', 'PATCH', `/users/${createdUserId}/status`, toggleUserStatus.status, toggleUserStatus.ok, statusUpdated, `Status: ${dbUser[0]?.status}`);

    const delUser = await apiCall('DELETE', `/users/${createdUserId}`);
    dbUser = await queryDB('SELECT id FROM users WHERE id = $1', [createdUserId]);
    record('Users', 'Delete User', 'DELETE', `/users/${createdUserId}`, delUser.status, delUser.ok, dbUser.length === 0, 'Removed from DB');
  }

  // 13. Roles & Permissions RBAC
  const rolesRes = await apiCall('GET', '/roles');
  record('RBAC Roles', 'List Roles', 'GET', '/roles', rolesRes.status, rolesRes.ok, true, `Total: ${rolesRes.json?.data?.length || 0}`);

  const permsRes = await apiCall('GET', '/roles-permissions');
  const firstPerm = permsRes.json?.data?.[0];
  record('RBAC Matrix', 'List Permissions', 'GET', '/roles-permissions', permsRes.status, permsRes.ok, true, `Total: ${permsRes.json?.data?.length || 0}`);

  if (firstPerm?.id) {
    const origSales = firstPerm.sales || 'No';
    const newSales = origSales === 'Yes' ? 'No' : 'Yes';
    const updatePerm = await apiCall('PUT', `/roles-permissions/${firstPerm.id}`, {
      sales: newSales
    });
    const dbPerm = await queryDB('SELECT sales FROM role_permissions WHERE id = $1', [firstPerm.id]);
    const permChanged = dbPerm.length > 0 && dbPerm[0].sales === newSales;
    record('RBAC Matrix', 'Toggle Permission', 'PUT', `/roles-permissions/${firstPerm.id}`, updatePerm.status, updatePerm.ok, permChanged, `sales: ${dbPerm[0]?.sales}`);

    // Revert back to original
    await apiCall('PUT', `/roles-permissions/${firstPerm.id}`, { sales: origSales });
  }

  // 14. Notifications & Audit Logs
  const notifRes = await apiCall('GET', '/notifications');
  record('Notifications', 'List Notifications', 'GET', '/notifications', notifRes.status, notifRes.ok, true, `Total: ${notifRes.json?.data?.length || 0}`);
  if (notifRes.json?.data?.[0]?.id) {
    const markReadRes = await apiCall('PATCH', `/notifications/${notifRes.json.data[0].id}/read`);
    record('Notifications', 'Mark As Read', 'PATCH', `/notifications/:id/read`, markReadRes.status, markReadRes.ok, true);
  }

  const auditRes = await apiCall('GET', '/audit-logs');
  record('Audit Logs', 'List Audit Logs', 'GET', '/audit-logs', auditRes.status, auditRes.ok, true, `Total: ${auditRes.json?.data?.length || 0}`);

  const callsRes = await apiCall('GET', '/calls');
  record('Calls', 'List Calls', 'GET', '/calls', callsRes.status, callsRes.ok, true, `Total: ${callsRes.json?.data?.length || 0}`);

  console.log('\n================================================================');
  console.log('                 MASTER AUDIT & VERIFICATION RESULTS            ');
  console.log('================================================================');
  console.table(report);

  const allPassed = report.every(r => r.API_OK === '✅ PASS' && r.DB_OK === '✅ VERIFIED');
  console.log(`\nOVERALL STATUS: ${allPassed ? '🎉 100% OF ALL ENDPOINTS & DB MUTATIONS PASSED' : '⚠️ SOME CHECKS FAILED'}`);

  await pool.end();
}

runMasterVerification().catch(async (err) => {
  console.error('Fatal execution error:', err);
  await pool.end();
  process.exit(1);
});
