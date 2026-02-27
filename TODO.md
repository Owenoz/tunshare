# TODO: Fix Logout Button Not Working

## Issue
The logout button is not working in the app. The logoutUser function returns false silently without properly handling the case when Firebase auth is not initialized.

## Root Cause
In `src/utils/auth.js`, the Firebase auth object was imported using `require()` which may not work properly in the ES module context. The logoutUser function checked `if (!auth)` and returned false silently without proper error handling.

## Plan
- [x] 1. Fix Firebase import in `src/utils/auth.js` - import auth directly instead of using require()
- [x] 2. Improve error handling in logoutUser function to throw proper errors
- [x] 3. Update FeedScreen.js to handle errors from logoutUser and show feedback
- [x] 4. Update ProfileScreen.js to handle errors from logoutUser and show feedback

## Files Edited
- `src/utils/auth.js` - Fixed Firebase import and improved error handling
- `src/screens/FeedScreen.js` - Added try-catch for error handling
- `src/screens/ProfileScreen.js` - Added try-catch for error handling

