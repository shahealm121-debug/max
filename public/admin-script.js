// Switch admin tabs
function switchAdminTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.getElementById(tabName + 'Tab').classList.add('active');
  event.target.classList.add('active');
  
  if (tabName === 'pending') {
    loadPendingUsers();
  } else {
    loadAllUsers();
  }
}

// Load pending users
async function loadPendingUsers() {
  const usersList = document.getElementById('pendingUsersList');
  usersList.innerHTML = '<p class="loading-text">Loading pending users...</p>';

  try {
    const response = await fetch('/api/admin/pending-users', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      usersList.innerHTML = '<p class="empty-state">Error loading pending users</p>';
      return;
    }

    const users = await response.json();

    if (users.length === 0) {
      usersList.innerHTML = '<p class="empty-state">No pending approvals</p>';
      return;
    }

    usersList.innerHTML = users.map(user => `
      <div class="user-item">
        <div class="user-info">
          <div class="user-name">${escapeHtml(user.username)}</div>
          <div class="user-email">${escapeHtml(user.email)}</div>
          <div class="user-date">Applied: ${new Date(user.created_at).toLocaleDateString()}</div>
        </div>
        <div class="user-actions">
          <button onclick="approveUser(${user.id})" class="btn-approve">Approve</button>
          <button onclick="rejectUser(${user.id})" class="btn-reject">Reject</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    usersList.innerHTML = '<p class="empty-state">Error loading pending users</p>';
    console.error('Load pending users error:', error);
  }
}

// Load all users
async function loadAllUsers() {
  const usersList = document.getElementById('allUsersList');
  usersList.innerHTML = '<p class="loading-text">Loading users...</p>';

  try {
    const response = await fetch('/api/admin/users', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      usersList.innerHTML = '<p class="empty-state">Error loading users</p>';
      return;
    }

    const users = await response.json();

    if (users.length === 0) {
      usersList.innerHTML = '<p class="empty-state">No users found</p>';
      return;
    }

    usersList.innerHTML = users.map(user => `
      <div class="user-item">
        <div class="user-info">
          <div class="user-name">${escapeHtml(user.username)}</div>
          <div class="user-email">${escapeHtml(user.email)}</div>
          <div class="user-meta">
            Role: <span class="role ${user.role}">${user.role}</span> | 
            Status: <span class="status ${user.status}">${user.status}</span> |
            Joined: ${new Date(user.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    usersList.innerHTML = '<p class="empty-state">Error loading users</p>';
    console.error('Load all users error:', error);
  }
}

// Approve user
async function approveUser(userId) {
  if (!confirm('Approve this user?')) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/approve-user/${userId}`, {
      method: 'POST',
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Error approving user');
      return;
    }

    alert('User approved successfully');
    loadPendingUsers();
    loadStats();
  } catch (error) {
    alert('Error approving user');
    console.error('Approve user error:', error);
  }
}

// Reject user
async function rejectUser(userId) {
  if (!confirm('Reject this user?')) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/reject-user/${userId}`, {
      method: 'POST',
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Error rejecting user');
      return;
    }

    alert('User rejected');
    loadPendingUsers();
    loadStats();
  } catch (error) {
    alert('Error rejecting user');
    console.error('Reject user error:', error);
  }
}

// Load statistics
async function loadStats() {
  try {
    const response = await fetch('/api/admin/stats', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('Error loading stats');
      return;
    }

    const stats = await response.json();

    document.getElementById('totalUsers').textContent = stats.totalUsers;
    document.getElementById('pendingApprovals').textContent = stats.pendingApprovals;
    document.getElementById('totalFiles').textContent = stats.totalFiles;
    
    // Format storage size
    const storageMB = (stats.totalStorage / (1024 * 1024)).toFixed(2);
    document.getElementById('totalStorage').textContent = storageMB + ' MB';
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

// Toggle dark mode
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'true' : 'false');
}

// Handle logout
async function handleLogout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST'
    });
    
    if (response.ok) {
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle back button - logout for security
window.addEventListener('popstate', () => {
  // Clear admin session on back button press
  fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  }).then(() => {
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  });
});

// Check if user is admin and is logged in on page load
window.addEventListener('load', async () => {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });
    if (!response.ok || response.status === 401) {
      window.location.href = '/';
      return;
    }
    
    const user = await response.json();
    if (user.role !== 'admin') {
      window.location.href = '/dashboard.html';
      return;
    }

    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
      document.getElementById('darkModeToggle').innerHTML = '☀️ Light Mode';
    }

    // Load data
    loadStats();
    loadPendingUsers();
  } catch (error) {
    console.log('Error checking auth:', error);
    window.location.href = '/';
  }
});
