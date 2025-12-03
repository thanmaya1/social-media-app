# Changes Summary

This document summarizes the main changes made to the repository to complete the social-media app feature set (excluding Docker/CI/Cypress per project scope).

## Backend (server)
- Added full notifications support: endpoints to list, mark read, mark all read, unread count, and delete. Emitted realtime events for `new_notification`, `notification_read`, and `notifications_read_all`.
- Implemented comment model, controller, and routes for creating, updating, replying to, liking, and deleting comments.
- Extended `User` model to support followers/following/blockedUsers, verification and reset tokens, notification preferences, and refresh token storage.
- Added message HTTP send endpoint which persists messages and creates notifications; ensured both HTTP and Socket.IO paths emit realtime events.
- Socket.IO server: improved auth handling, join per-user rooms, and maintained `onlineUsers` mapping.
- Utilities: added optional/lazy nodemailer integration with logging fallback; used Cloudinary helper for file uploads when configured.
- Tests: added in-memory MongoDB test harness and multiple integration tests for auth, posts, messages, notifications, comments, and follow flows.
- Test/runtime fixes: disabled CSRF enforcement during tests, prevented automatic server start during tests, and fixed duplicate mongoose.connect issues.

## Frontend (client)
- Added `NotificationBell` component and wired unread count into the navigation.
- Implemented `Notifications` page with pagination, per-notification mark-read/delete actions, unread count, loading/empty states, and realtime subscriptions via socket helper.
- Added comment UI and services, follow/unfollow UI, profile edit pages with avatar/cover upload support, message send integration, and pages for settings and followers/following.

## Tests
- Server Jest tests implemented and executed; in-memory Mongo used for isolation.
- Added integration tests to validate notification emits and end-to-end core API flows (smoke tests).

## Remaining / Optional Work
- UI improvements: animation, accessibility refinements, responsive polish, and a notification dropdown in the header.
- E2E tests (Cypress) for full UI flows.
- CI and Docker automation (intentionally omitted per instructions).
- Additional tests to reach higher coverage thresholds and tests for error-edge cases.

If you want me to proceed, I can:
- Start frontend dev server and run manual smoke tests.
- Add more integration tests to incrementally raise coverage.
- Add a small notification dropdown in the header and client-side unit tests.
