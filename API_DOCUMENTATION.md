# Matrimonial Backend API Documentation

## Overview

This is a comprehensive matrimonial backend API built with Express.js and MongoDB. It includes complete features for both user and admin functionalities.

## Base URL

```
http://localhost:5002/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## USER ENDPOINTS

### Authentication (`/users/auth`)

- `POST /register` - Register a new user
- `POST /login` - Login user (requires captcha)
- `GET /captcha` - Generate captcha for login

### Profile (`/users/profile`)

- `GET /` - Get user profile
- `PUT /` - Update profile (name, phone, about, etc.)
- `PUT /family` - Update family information
- `PUT /preferences` - Update match preferences
- `POST /photos` - Add profile photos
- `DELETE /photos/:photoId` - Delete a photo
- `POST /change-password` - Change password
- `GET /notifications/preferences` - Get notification settings
- `PUT /notifications/preferences` - Update notification settings

### Search & Discover (`/users/search`)

- `GET /search` - Search profiles with filters (gender, age, religion, etc.)
- `GET /matches` - Get AI-matched profiles
- `GET /profile/:profileId` - View specific profile (tracks visitors)
- `GET /visitors` - Get list of profile visitors
- `POST /block` - Block a user
- `POST /unblock` - Unblock a user
- `GET /blocked-users` - Get blocked users list

### Interests (`/users/interests`)

- `POST /send` - Send interest to a profile
- `GET /received` - Get received interests
- `GET /sent` - Get sent interests
- `PUT /:interestId/accept` - Accept an interest (creates match)
- `PUT /:interestId/reject` - Reject an interest
- `DELETE /:interestId` - Cancel sent interest

### Messages (`/users/messages`)

- `POST /send` - Send a message
- `GET /` - Get messages with a user (query: otherUserId)
- `GET /conversations` - Get list of conversations
- `DELETE /:messageId` - Delete a message
- `PUT /:messageId/read` - Mark message as read

### Notifications (`/users/notifications`)

- `GET /` - Get notifications (query: isRead, page, limit)
- `PUT /:notificationId/read` - Mark notification as read
- `PUT /read-all` - Mark all notifications as read
- `DELETE /:notificationId` - Delete notification
- `GET /unread/count` - Get unread notification count

### Shortlist & Reports (`/users/shortlist`)

- `POST /add` - Add profile to shortlist
- `POST /remove` - Remove from shortlist
- `GET /` - Get shortlisted profiles
- `POST /ignore` - Ignore a profile
- `POST /report` - Report a user

### Payments (`/users/payments`)

- `GET /packages` - Get available subscription packages
- `POST /create-intent` - Create payment intent
- `POST /confirm` - Confirm payment
- `GET /history` - Get payment history
- `GET /subscription` - Get current subscription
- `POST /subscription/cancel` - Cancel subscription

### Support Tickets (`/users/tickets`)

- `POST /` - Create support ticket
- `GET /` - Get user's tickets
- `GET /:ticketId` - Get ticket details
- `POST /:ticketId/reply` - Add reply to ticket
- `PUT /:ticketId/close` - Close ticket

---

## ADMIN ENDPOINTS

### Admin Login (`/admin`)

- `POST /login` - Admin login

### Dashboard (`/admin/dashboard`)

- `GET /stats` - Get dashboard statistics
- `GET /graph-data` - Get chart data (users joined, revenue)

### User Management (`/admin/users`)

- `GET /` - Get all users (with filters)
- `GET /:userId` - Get user details
- `POST /:userId/ban` - Ban user
- `POST /:userId/unban` - Unban user
- `POST /:userId/deactivate` - Deactivate account
- `POST /:userId/activate` - Activate account
- `POST /:userId/verify-email` - Verify email
- `POST /:userId/verify-phone` - Verify phone
- `POST /:userId/verify-kyc` - Verify KYC
- `PUT /:userId/notes` - Add admin notes
- `DELETE /:userId` - Delete user

### Payments & Packages (`/admin`)

- `GET /payments` - Get all payments
- `GET /payments/:paymentId` - Get payment details
- `POST /payments/:paymentId/complete` - Mark payment complete
- `POST /payments/:paymentId/refund` - Refund payment
- `GET /payments/stats` - Get payment statistics
- `POST /packages` - Create package
- `GET /packages` - Get all packages
- `PUT /packages/:packageId` - Update package
- `DELETE /packages/:packageId` - Delete package

### Reports & Tickets (`/admin`)

- `GET /reports` - Get all reports
- `GET /reports/:reportId` - Get report details
- `PUT /reports/:reportId/resolve` - Resolve report
- `PUT /reports/:reportId/dismiss` - Dismiss report
- `GET /tickets` - Get all support tickets
- `GET /tickets/:ticketId` - Get ticket details
- `POST /tickets/:ticketId/assign` - Assign to admin
- `POST /tickets/:ticketId/reply` - Add admin reply
- `PUT /tickets/:ticketId/close` - Close ticket
- `GET /tickets/stats` - Get ticket statistics

---

## Data Models

### User

- Basic Info: firstName, lastName, email, phone, password
- Profile: gender, dateOfBirth, profilePhoto, photos
- Personal Details: height, complexion, bloodGroup, religion, caste, maritalStatus, education, job, etc.
- Family: fatherName, fatherJob, motherName, siblings, etc.
- Preferences: preferredGender, preferredAge, preferredReligion, etc.
- Status: isActive, isEmailVerified, isPhoneVerified, isKycVerified
- Interactions: interests, matches, shortlist, blockedUsers, visitors
- Subscription: subscriptionPlan, subscriptionStatus, subscriptionEndDate
- Admin: isBanned, banReason, notes, lastLoginAt

### Interest

- senderId, receiverId
- status: pending, accepted, rejected
- message, acceptedAt, rejectedAt

### Message

- senderId, receiverId
- content, isRead, readAt
- attachments, timestamps

### Notification

- userId, title, message
- type: interest, message, match, visitor, promo, system
- isRead, readAt

### Payment

- userId, packageName, amount, status
- paymentMethod: stripe, paypal, wallet
- transactionId, duration, startDate, endDate

### Package

- name, description, price, duration
- features (array)
- isActive, displayOrder

### Report

- reportedByUserId, reportedUserId, reason, description
- status: pending, reviewing, resolved, dismissed
- action: none, warning, suspend, ban

### Ticket

- userId, subject, description, category
- status: pending, assigned, in_progress, answered, closed
- replies (array), assignedToAdmin

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "message": "Error description"
}
```

## Query Parameters

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10-20)
- `status` - Filter by status
- `search` - Search query
- `sort` - Sort field

## Request/Response Format

- Content-Type: `application/json`
- All requests with body data should include Content-Type header

---

## Environment Variables

```
MONGO_URI=your_mongodb_connection_string
PORT=5002
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

---

## Setup & Installation

1. Install dependencies: `npm install`
2. Create `.env` file with above variables
3. Run server: `npm start`
4. Server runs on port 5002 by default

---

## Features Implemented

✅ User Registration & Login with Captcha
✅ Complete Profile Management
✅ Advanced Profile Search with Filters
✅ Interest System (Send, Accept, Reject)
✅ Messaging System with Conversations
✅ Notifications
✅ Shortlist & Profile Reports
✅ Payment Integration (Stripe Ready)
✅ Subscription Management
✅ Admin Dashboard with Analytics
✅ User Management & Moderation
✅ Support Ticket System
✅ Report Management System
✅ Package Management

---

Generated: 2026-03-16
