// ============ NOTIFICATION SYSTEM ============
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.classList.add('removing'); setTimeout(() => this.parentElement.remove(), 300)">✕</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

let confirmCallback = null;

function showConfirm(title, message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  confirmCallback = onConfirm;
  modal.style.display = 'flex';
}

function closeConfirmModal() {
  document.getElementById('confirmModal').style.display = 'none';
  confirmCallback = null;
}

function confirmAction() {
  if (confirmCallback) {
    confirmCallback();
  }
  closeConfirmModal();
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeConfirmModal();
  }
});

// Show dashboard after login/signup
async function showDashboard() {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });
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
let isUploading = false; // Flag to prevent duplicate uploads

// Department names mapping
const departmentNames = {
  'mainoffice': 'Main Office',
  'garage': 'Garage',
  'crusher': 'Crusher'
};

// Select department
function selectDepartment(dept, eventTarget = null) {
  selectedDepartment = dept;
  
  // Update active button
  document.querySelectorAll('.dept-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to the clicked button (if event exists)
  if (eventTarget) {
    eventTarget.closest('.dept-btn').classList.add('active');
  } else {
    // Find the button by department data attribute and mark it active
    const btn = document.querySelector(`[data-dept="${dept}"]`);
    if (btn) btn.classList.add('active');
  }
  
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
function selectCategory(category, eventTarget = null) {
  selectedCategory = category;
  
  // Update active button
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to the clicked button (if event exists)
  if (eventTarget) {
    eventTarget.closest('.cat-btn').classList.add('active');
  } else {
    // Find the button by category data attribute and mark it active
    const btn = document.querySelector(`[data-cat="${category}"]`);
    if (btn) btn.classList.add('active');
  }
  
  // Clear search input
  document.getElementById('fileSearch').value = '';
  
  // Reload files
  loadFiles();
}

// Switch between tabs (Profile and Drive)
function switchTab(tabName, eventTarget = null) {
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
  
  // Add active class to clicked button (if event exists)
  if (eventTarget) {
    eventTarget.classList.add('active');
  } else {
    // Find and mark button using data attribute
    const btn = document.querySelector(`[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
  }
  
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
  if (isUploading) {
    console.log('Upload already in progress, ignoring click');
    showToast('Upload in progress. Please wait...', 'warning');
    return;
  }
  
  const fileInput = document.getElementById('fileInput');
  if (fileInput.files.length === 0) {
    showToast('Please select files first', 'warning');
    return;
  }
  
  console.log('Starting upload with ' + fileInput.files.length + ' file(s)');
  uploadMultipleFiles(fileInput.files);
}

// Upload file
async function uploadFile() {
  if (isUploading) {
    showToast('Upload in progress. Please wait...', 'warning');
    return;
  }
  
  const fileInput = document.getElementById('fileInput');
  
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Please select a file first', 'warning');
    return;
  }

  isUploading = true;
  
  // Disable upload buttons
  const uploadBtn = document.querySelector('.btn-upload');
  const chooseBtn = document.querySelector('[onclick*="fileInput"]');
  if (uploadBtn) uploadBtn.disabled = true;
  if (chooseBtn) chooseBtn.disabled = true;

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('department', selectedDepartment);
  formData.append('category', selectedCategory);

  try {
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.error || 'Upload failed', 'error');
      return;
    }

    showToast('File uploaded successfully!', 'success');
    fileInput.value = ''; // Clear input
    document.getElementById('selectedFilesText').textContent = '';
    loadFiles(); // Reload file list
  } catch (error) {
    showToast('Error uploading file', 'error');
    console.error('Upload error:', error);
  } finally {
    // Re-enable upload buttons
    if (uploadBtn) uploadBtn.disabled = false;
    if (chooseBtn) chooseBtn.disabled = false;
    isUploading = false;
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

    const response = await fetch(`/api/files?${params.toString()}`, {
      credentials: 'include'
    });
    
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
  try {
    showToast(`Downloading ${filename}...`, 'info', 2000);
    console.log(`[DOWNLOAD] Starting download for file ID: ${fileId}`);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = `/api/files/${fileId}/download`;
    link.setAttribute('download', filename || '');
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`[DOWNLOAD] Download initiated for: ${filename}`);
  } catch (error) {
    showToast(`Error downloading file: ${error.message}`, 'error');
    console.error('[DOWNLOAD] Error:', error);
  }
}

// Delete file
function deleteFile(fileId) {
  showConfirm(
    'Delete File',
    'Are you sure you want to delete this file? This action cannot be undone.',
    async () => {
      try {
        const response = await fetch(`/api/files/${fileId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
          showToast(data.error || 'Delete failed', 'error');
          return;
        }

        showToast('File deleted successfully', 'success');
        loadFiles(); // Reload file list
      } catch (error) {
        showToast('Error deleting file', 'error');
        console.error('Delete error:', error);
      }
    }
  );
}

// Handle logout
async function handleLogout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
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
  if (!isUploading) {
    document.getElementById('dropZone').style.borderColor = '#1B5E20';
    document.getElementById('dropZone').style.backgroundColor = 'rgba(76, 175, 80, 0.15)';
  }
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  if (!isUploading) {
    document.getElementById('dropZone').style.borderColor = '#4CAF50';
    document.getElementById('dropZone').style.backgroundColor = 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(46, 125, 50, 0.05) 100%)';
  }
}

function handleDropZone(event) {
  event.preventDefault();
  event.stopPropagation();
  
  if (isUploading) {
    showToast('Upload in progress. Please wait...', 'warning');
    return;
  }
  
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
    showToast('Please select files first', 'warning');
    return;
  }

  // Prevent concurrent uploads - double check
  if (isUploading) {
    console.log('Already uploading, preventing duplicate');
    showToast('Upload already in progress. Please wait...', 'warning');
    return;
  }

  isUploading = true;
  console.log('Upload started, isUploading set to true');
  
  // Disable all upload buttons and file input
  const uploadBtn = document.querySelector('.btn-upload');
  const chooseBtn = document.querySelector('.btn-primary');
  const fileInput = document.getElementById('fileInput');
  
  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.style.opacity = '0.5';
    uploadBtn.style.cursor = 'not-allowed';
  }
  if (chooseBtn) {
    chooseBtn.disabled = true;
    chooseBtn.style.opacity = '0.5';
    chooseBtn.style.cursor = 'not-allowed';
  }
  if (fileInput) {
    fileInput.disabled = true;
  }

  let uploadedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  
  for (const file of files) {
    console.log(`Uploading file: ${file.name}`);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('department', selectedDepartment);
    formData.append('category', selectedCategory);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.isSkipped) {
          console.log(`File skipped (duplicate): ${file.name}`);
          skippedCount++;
        } else {
          console.error(`Error uploading ${file.name}:`, data.error);
          failedCount++;
        }
      } else {
        console.log(`Successfully uploaded ${file.name}`);
        uploadedCount++;
      }
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      failedCount++;
    }
  }

  // Re-enable upload buttons and file input
  if (uploadBtn) {
    uploadBtn.disabled = false;
    uploadBtn.style.opacity = '1';
    uploadBtn.style.cursor = 'pointer';
  }
  if (chooseBtn) {
    chooseBtn.disabled = false;
    chooseBtn.style.opacity = '1';
    chooseBtn.style.cursor = 'pointer';
  }
  if (fileInput) {
    fileInput.disabled = false;
  }
  
  console.log('Upload complete, isUploading set to false');
  isUploading = false;

  // Show results
  if (uploadedCount > 0 || skippedCount > 0) {
    let message = '';
    if (uploadedCount > 0) {
      message += `✅ ${uploadedCount} file(s) uploaded successfully!`;
    }
    if (skippedCount > 0) {
      if (message) message += '\n';
      message += `⏭️ ${skippedCount} file(s) skipped (duplicates)`;
    }
    if (failedCount > 0) {
      if (message) message += '\n';
      message += `❌ ${failedCount} file(s) failed`;
    }
    showToast(message, 'success');
    
    // Clear file input and search
    document.getElementById('fileInput').value = '';
    document.getElementById('selectedFilesText').textContent = '';
    document.getElementById('fileSearch').value = '';
    
    // Reload files and stats
    loadFiles();
    loadUserStats();
  } else if (failedCount > 0) {
    showToast(`Failed to upload ${failedCount} file(s). Please try again.`, 'error');
  }
}

// Load user statistics
async function loadUserStats() {
  try {
    const response = await fetch('/api/user/stats', {
      credentials: 'include'
    });
    
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
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });
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
