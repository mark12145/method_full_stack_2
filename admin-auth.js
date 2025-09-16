// Admin Authentication System
class AdminAuth {
  constructor() {
    this.init();
  }

  init() {
    // Check if already logged in
    if (this.isLoggedIn() && window.location.pathname.includes('admin-login.html')) {
      window.location.href = 'admin-panel.html';
      return;
    }

    // Protect admin panel
    if (!this.isLoggedIn() && window.location.pathname.includes('admin-panel.html')) {
      window.location.href = 'admin-login.html';
      return;
    }

    this.setupEventListeners();
  }

  setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    // Clear previous errors
    errorMessage.style.display = 'none';

    // Simple validation
    if (!username || !password) {
      this.showError('Please fill in all fields');
      return;
    }

    // Simulate API call with secure credentials check
    try {
      const isValid = await this.validateCredentials(username, password);
      
      if (isValid) {
        // Generate secure session token
        const sessionToken = this.generateSessionToken();
        
        // Store session with expiration (24 hours)
        const sessionData = {
          token: sessionToken,
          username: username,
          loginTime: Date.now(),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        
        localStorage.setItem('adminSession', JSON.stringify(sessionData));
        
        // Redirect to admin panel
        window.location.href = 'admin-panel.html';
      } else {
        this.showError('Invalid username or password');
      }
    } catch (error) {
      this.showError('Login failed. Please try again.');
      console.error('Login error:', error);
    }
  }

  async validateCredentials(username, password) {
    // In a real application, this would be an API call to your backend
    // For security, credentials should NEVER be stored in frontend code
    // This is a simplified example - use proper authentication in production
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Hash the password for comparison (in real app, this would be done on server)
    const hashedPassword = await this.hashPassword(password);
    
    // These should be environment variables or fetched from secure backend
    const validCredentials = {
      'admin': await this.hashPassword('12345'),
      'methodsadmin': await this.hashPassword('SecurePass123!')
    };

    return validCredentials[username] === hashedPassword;
  }

  async hashPassword(password) {
    // Simple hash function for demo - use proper hashing in production
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'methods_salt_2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  generateSessionToken() {
    // Generate cryptographically secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  isLoggedIn() {
    try {
      const sessionData = JSON.parse(localStorage.getItem('adminSession') || '{}');
      
      if (!sessionData.token || !sessionData.expiresAt) {
        return false;
      }

      // Check if session has expired
      if (Date.now() > sessionData.expiresAt) {
        localStorage.removeItem('adminSession');
        return false;
      }

      return true;
    } catch (error) {
      localStorage.removeItem('adminSession');
      return false;
    }
  }

  handleLogout() {
    localStorage.removeItem('adminSession');
    window.location.href = 'admin-login.html';
  }

  showError(message) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.style.display = 'block';
    }
  }

  getSessionData() {
    try {
      return JSON.parse(localStorage.getItem('adminSession') || '{}');
    } catch (error) {
      return {};
    }
  }
}

// Initialize authentication system
document.addEventListener('DOMContentLoaded', () => {
  new AdminAuth();
});