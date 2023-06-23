function logout() {
      localStorage.removeItem('token');
      window.location.href = '/';
    }

    // Check if user is logged in
    const token = localStorage.getItem('token');
    const logoutContainer = document.getElementById('logout-container');

    if (token) {
      // User is logged in, show logout button
      const logoutButton = document.createElement('logoutbutton');
      logoutButton.innerText = 'Logout';
      logoutButton.classList.add('button'); // Apply button class
      logoutButton.addEventListener('click', logout);
      logoutContainer.appendChild(logoutButton);
    }
