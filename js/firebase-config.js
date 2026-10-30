/* ---- js/firebase-config.js ---- */
/**
 * ARROUT - Firebase Configuration
 * 
 * To connect to your Firebase project:
 * 1. Open Firebase Console (https://console.firebase.google.com/)
 * 2. Go to Project Settings -> General -> Your apps -> Web app (</>)
 * 3. Replace the placeholder values below with your project credentials.
 * 
 * If values are left as placeholders, ARROUT will run gracefully in 100% offline LocalStorage mode.
 */

window.DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSy_YOUR_API_KEY_HERE",
  authDomain: "arrout-game.firebaseapp.com",
  projectId: "arrout-game",
  storageBucket: "arrout-game.appspot.com",
  messagingSenderId: "123456789000",
  appId: "1:123456789000:web:abcdef1234567890"
};

// Check if player configured a custom config in local settings
(function () {
  try {
    const custom = localStorage.getItem('arrout_custom_firebase_config');
    if (custom) {
      window.FIREBASE_CONFIG = JSON.parse(custom);
      return;
    }
  } catch (e) {}
  window.FIREBASE_CONFIG = window.DEFAULT_FIREBASE_CONFIG;
})();
