// Show dashboard after login/signup
async function showDashboard() {
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

      // Show admin button if user is admin
      if (userData.role === 'admin') {
        document.getElementById('adminPanelBtn').style.display = 'inline-block';
      }

      // Load statistics
      loadUserStats();
      
      // Initialize department and category
      selectDepartment('mainoffice');
      selectCategory('report');
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
}

// Global variables for selected department and category
let selectedDepartment = 'mainoffice';
let selectedCategory = 'report';
let allFiles = []; // Store all files for search functionality
let currentPage = 1;
const filesPerPage = 6;

// Department names mapping
const departmentNames = {
  'mainoffice': 'Main Office',
  'garage': 'Garage',
  'crusher': 'Crusher'
};

// Select department
function selectDepartment(dept) {
  selectedDepartment = dept;
  
  // Update active button
  document.querySelectorAll('.dept-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.closest('.dept-btn').classList.add('active');
  
  // Update title
  document.getElementById('selectedDeptTitle').textContent = `${departmentNames[dept]} - Documents`;
  
  // Reset category to "report" when switching departments
  selectedCategory = 'report';
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.cat-btn')[0].classList.add('active');
  
  // Clear search input
  document.getElementById('fileSearch').value = '';
  
  // Reload files
  loadFiles();
}

// Select category
function selectCategory(category) {
  selectedCategory = category;
  
  // Update active button
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.closest('.cat-btn').classList.add('active');
  
  // Clear search input
  document.getElementById('fileSearch').value = '';
  
  // Reload files
  loadFiles();
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
  const filesCount = fileInput.files.length;
  const selectedFilesText = document.getElementById('selectedFilesText');
  
  if (filesCount > 0) {
    const fileNames = Array.from(fileInput.files).map(f => f.name).join(', ');
    selectedFilesText.textContent = `Selected: ${fileNames}`;
  } else {
    selectedFilesText.textContent = '';
  }
  console.log('Selected files:', filesCount);
}

// Upload selected files
function uploadSelectedFiles() {
  const fileInput = document.getElementById('fileInput');
  if (fileInput.files.length === 0) {
    alert('Please select files first');
    return;
  }
  uploadMultipleFiles(fileInput.files);
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
  formData.append('department', selectedDepartment);
  formData.append('category', selectedCategory);

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
    const params = new URLSearchParams();
    params.append('department', selectedDepartment);
    params.append('category', selectedCategory);

    const response = await fetch(`/api/files?${params.toString()}`);
    
    if (!response.ok) {
      filesList.innerHTML = '<p class="empty-state">Error loading files</p>';
      return;
    }

    const files = await response.json();

    // Store all files for search functionality
    allFiles = files;

    // Filter and display files
    filterFiles();
  } catch (error) {
    filesList.innerHTML = '<p class="empty-state">Error loading files</p>';
    console.error('Load files error:', error);
  }
}

// Filter and display files based on search input
function filterFiles() {
  const filesList = document.getElementById('filesList');
  const searchTerm = document.getElementById('fileSearch').value.toLowerCase().trim();

  if (allFiles.length === 0) {
    filesList.innerHTML = '<p class="empty-state">No files uploaded yet</p>';
    updatePagination(0, 0);
    return;
  }

  // Filter files based on search term
  const filteredFiles = searchTerm === '' 
    ? allFiles 
    : allFiles.filter(file => 
        file.filename.toLowerCase().includes(searchTerm)
      );

  // Pagination logic
  const totalFiles = filteredFiles.length;
  const totalPages = Math.ceil(totalFiles / filesPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * filesPerPage;
  const endIdx = startIdx + filesPerPage;
  const filesToShow = filteredFiles.slice(startIdx, endIdx);

  if (filesToShow.length === 0) {
    filesList.innerHTML = '<p class="empty-state">No files match your search</p>';
    updatePagination(currentPage, totalPages);
    return;
  }

  filesList.innerHTML = filesToShow.map(file => `
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
  updatePagination(currentPage, totalPages);
}

function updatePagination(page, totalPages) {
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const pageInfo = document.getElementById('pageInfo');
  if (!prevBtn || !nextBtn || !pageInfo) return;
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;
  pageInfo.textContent = `Page ${page} of ${totalPages}`;
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    filterFiles();
  }
}

function nextPage() {
  // Calculate filtered files length
  const searchTerm = document.getElementById('fileSearch').value.toLowerCase().trim();
  const filteredFiles = searchTerm === '' 
    ? allFiles 
    : allFiles.filter(file => file.filename.toLowerCase().includes(searchTerm));
  const totalPages = Math.ceil(filteredFiles.length / filesPerPage) || 1;
  if (currentPage < totalPages) {
    currentPage++;
    filterFiles();
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

// Handle logout
async function handleLogout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST'
    });
    
    if (response.ok) {
      // Redirect to login page
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

// Utility function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Drag and drop handlers
function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById('dropZone').style.borderColor = '#1B5E20';
  document.getElementById('dropZone').style.backgroundColor = 'rgba(76, 175, 80, 0.15)';
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById('dropZone').style.borderColor = '#4CAF50';
  document.getElementById('dropZone').style.backgroundColor = 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(46, 125, 50, 0.05) 100%)';
}

function handleDropZone(event) {
  event.preventDefault();
  event.stopPropagation();
  
  document.getElementById('dropZone').style.borderColor = '#4CAF50';
  document.getElementById('dropZone').style.backgroundColor = 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(46, 125, 50, 0.05) 100%)';
  
  const files = event.dataTransfer.files;
  document.getElementById('fileInput').files = files;
  
  // Upload files automatically
  uploadMultipleFiles(files);
}

// Upload multiple files
async function uploadMultipleFiles(files) {
  if (!files || files.length === 0) {
    alert('Please select files first');
    return;
  }

  let uploadedCount = 0;
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('department', selectedDepartment);
    formData.append('category', selectedCategory);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`Error uploading ${file.name}:`, data.error);
      } else {
        uploadedCount++;
      }
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
    }
  }

  if (uploadedCount > 0) {
    alert(`${uploadedCount} file(s) uploaded successfully!`);
    document.getElementById('fileInput').value = '';
    document.getElementById('fileSearch').value = '';
    loadFiles();
    loadUserStats();
  }
}

// Load user statistics
async function loadUserStats() {
  try {
    const response = await fetch('/api/user/stats');
    
    if (response.ok) {
      const stats = await response.json();
      
      document.getElementById('userFiles').textContent = stats.totalFiles;
      const storageMB = (stats.totalStorage / (1024 * 1024)).toFixed(2);
      document.getElementById('userStorage').textContent = storageMB;
      document.getElementById('statsContainer').style.display = 'grid';
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Toggle dark mode
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark ? 'true' : 'false');
  
  const button = document.getElementById('darkModeToggle');
  button.innerHTML = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
}

// Go to admin panel
function goToAdmin() {
  window.location.href = '/admin.html';
}

// Check if user is logged in on page load
window.addEventListener('load', async () => {
  // Load dark mode preference
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    const btn = document.getElementById('darkModeToggle');
    if (btn) btn.innerHTML = '☀️ Light Mode';
  }

  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
      // Not logged in, redirect to login page
      window.location.href = '/';
      return;
    }
    
    // Load user data and display dashboard
    showDashboard();
  } catch (error) {
    // Error occurred, redirect to login
    console.log('Error checking auth:', error);
    window.location.href = '/';
  }
});
