// Toggle between login and signup forms
function toggleForms(event) {
  event.preventDefault();
  
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  
  loginForm.classList.toggle('visible');
  loginForm.classList.toggle('hidden');
  signupForm.classList.toggle('visible');
  signupForm.classList.toggle('hidden');
  
  // Clear error messages
  document.getElementById('loginError').classList.remove('show');
  document.getElementById('signupError').classList.remove('show');
}

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      errorDiv.textContent = data.error || 'Login failed';
      errorDiv.classList.add('show');
      return;
    }
    
    // Clear error
    errorDiv.classList.remove('show');
    
    // Show dashboard
    showDashboard(data.user);
    
    // Clear form
    document.getElementById('loginForm').reset();
    
  } catch (error) {
    errorDiv.textContent = 'An error occurred. Please try again.';
    errorDiv.classList.add('show');
    console.error('Login error:', error);
  }
}

// Handle signup form submission
async function handleSignup(event) {
  event.preventDefault();
  
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;
  const errorDiv = document.getElementById('signupError');
  
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password, confirmPassword })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      errorDiv.textContent = data.error || 'Signup failed';
      errorDiv.classList.add('show');
      return;
    }
    
    // Clear error
    errorDiv.classList.remove('show');
    
    // Show dashboard
    showDashboard(data.user);
    
    // Clear form
    document.getElementById('signupForm').reset();
    
  } catch (error) {
    errorDiv.textContent = 'An error occurred. Please try again.';
    errorDiv.classList.add('show');
    console.error('Signup error:', error);
  }
}

// Show dashboard after login/signup
async function showDashboard(user) {
  const authForms = document.getElementById('authForms');
  const dashboard = document.getElementById('dashboard');
  
  // Fetch current user data to display
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const userData = await response.json();
      
      document.getElementById('displayUsername').textContent = userData.username;
      document.getElementById('userUsername').textContent = userData.username;
      document.getElementById('userEmail').textContent = userData.email;
      
      // Format date
      const date = new Date(userData.created_at);
      document.getElementById('userCreatedAt').textContent = date.toLocaleDateString();
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
  
  authForms.classList.add('hidden');
  dashboard.classList.remove('hidden');
}

// Handle logout
async function handleLogout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST'
    });
    
    if (response.ok) {
      const authForms = document.getElementById('authForms');
      const dashboard = document.getElementById('dashboard');
      
      authForms.classList.remove('hidden');
      dashboard.classList.add('hidden');
      
      // Reset forms
      document.getElementById('loginForm').reset();
      document.getElementById('signupForm').reset();
      
      // Show login form
      document.getElementById('loginForm').classList.add('visible');
      document.getElementById('loginForm').classList.remove('hidden');
      document.getElementById('signupForm').classList.add('hidden');
      document.getElementById('signupForm').classList.remove('visible');
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Switch between tabs (Profile and Drive)
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tabName + 'Tab').classList.add('active');
  
  // Add active class to clicked button
  event.target.classList.add('active');
  
  // Load files if Drive tab is opened
  if (tabName === 'drive') {
    loadFiles();
  }
}

// Handle file selection
function handleFileSelect() {
  const fileInput = document.getElementById('fileInput');
  const fileName = fileInput.files[0]?.name || 'No file selected';
  console.log('Selected file:', fileName);
}

// Upload file
async function uploadFile() {
  const fileInput = document.getElementById('fileInput');
  
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Please select a file first');
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Upload failed');
      return;
    }

    alert('File uploaded successfully!');
    fileInput.value = ''; // Clear input
    loadFiles(); // Reload file list
  } catch (error) {
    alert('Error uploading file');
    console.error('Upload error:', error);
  }
}

// Load files
async function loadFiles() {
  const filesList = document.getElementById('filesList');
  filesList.innerHTML = '<p class="loading-text">Loading files...</p>';

  try {
    const response = await fetch('/api/files');
    
    if (!response.ok) {
      filesList.innerHTML = '<p class="empty-state">Error loading files</p>';
      return;
    }

    const files = await response.json();

    if (files.length === 0) {
      filesList.innerHTML = '<p class="empty-state">No files uploaded yet</p>';
      return;
    }

    filesList.innerHTML = files.map(file => `
      <div class="file-item">
        <div class="file-info">
          <div class="file-name">📄 ${escapeHtml(file.filename)}</div>
          <div class="file-meta">
            Size: ${formatFileSize(file.size)} • Uploaded: ${new Date(file.uploaded_at).toLocaleDateString()}
          </div>
        </div>
        <div class="file-actions">
          <button onclick="downloadFile(${file.id}, '${escapeHtml(file.filename)}')" class="btn-download">Download</button>
          <button onclick="deleteFile(${file.id})" class="btn-delete">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    filesList.innerHTML = '<p class="empty-state">Error loading files</p>';
    console.error('Load files error:', error);
  }
}

// Download file
function downloadFile(fileId, filename) {
  window.location.href = `/api/files/${fileId}/download`;
}

// Delete file
async function deleteFile(fileId) {
  if (!confirm('Are you sure you want to delete this file?')) {
    return;
  }

  try {
    const response = await fetch(`/api/files/${fileId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Delete failed');
      return;
    }

    alert('File deleted successfully');
    loadFiles(); // Reload file list
  } catch (error) {
    alert('Error deleting file');
    console.error('Delete error:', error);
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Utility function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Check if user is already logged in on page load
window.addEventListener('load', async () => {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const userData = await response.json();
      showDashboard(userData);
    }
  } catch (error) {
    console.log('User not logged in');
  }
});
