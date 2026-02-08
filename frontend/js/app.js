/**
 * Main App Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.sidebar')) {
    Portal.init();
    Spreadsheets.init();
  }
});
