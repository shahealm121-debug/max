// ============ NOTIFICATION SYSTEM ============
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer') || createToastContainer();
  
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

function createToastContainer() {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

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
    
    // Redirect to dashboard
    window.location.href = '/dashboard.html';
    
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
    
    // Show success message
    showToast('Signup successful! Your account is pending admin approval. Please check back soon.', 'success', 4000);
    
    // Reset form and go back to login
    document.getElementById('signupForm').reset();
    setTimeout(() => toggleForms({preventDefault: () => {}}), 500);
    
  } catch (error) {
    errorDiv.textContent = 'An error occurred. Please try again.';
    errorDiv.classList.add('show');
    console.error('Signup error:', error);
  }
}

// Check if user is already logged in on page load
window.addEventListener('load', async () => {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      // User is already logged in, redirect to dashboard
      window.location.href = '/dashboard.html';
    }
  } catch (error) {
    console.log('User not logged in');
  }
});
