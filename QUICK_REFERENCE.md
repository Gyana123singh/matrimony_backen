# Backend API Quick Reference

## 🔐 User Authentication

```
POST /api/users/auth/register
POST /api/users/auth/login
GET /api/users/auth/captcha
```

## 👤 User Profile

```
GET    /api/users/profile/
PUT    /api/users/profile/
PUT    /api/users/profile/family
PUT    /api/users/profile/preferences
POST   /api/users/profile/photos
DELETE /api/users/profile/photos/:photoId
POST   /api/users/profile/change-password
```

## 🔍 Search & Discovery

```
GET /api/users/search/search
GET /api/users/search/matches
GET /api/users/search/profile/:profileId
GET /api/users/search/visitors
POST /api/users/search/block
POST /api/users/search/unblock
GET /api/users/search/blocked-users
```

## ❤️ Interests

```
POST /api/users/interests/send
GET  /api/users/interests/received
GET  /api/users/interests/sent
PUT  /api/users/interests/:interestId/accept
PUT  /api/users/interests/:interestId/reject
DELETE /api/users/interests/:interestId
```

## 💬 Messages

```
POST /api/users/messages/send
GET  /api/users/messages/
GET  /api/users/messages/conversations
DELETE /api/users/messages/:messageId
PUT /api/users/messages/:messageId/read
```

## 🔔 Notifications

```
GET /api/users/notifications/
PUT /api/users/notifications/:notificationId/read
PUT /api/users/notifications/read-all
DELETE /api/users/notifications/:notificationId
GET /api/users/notifications/unread/count
```

## ⭐ Shortlist & Reports

```
POST /api/users/shortlist/add
POST /api/users/shortlist/remove
GET  /api/users/shortlist/
POST /api/users/shortlist/ignore
POST /api/users/shortlist/report
```

## 💳 Payments

```
GET  /api/users/payments/packages
POST /api/users/payments/create-intent
POST /api/users/payments/confirm
GET  /api/users/payments/history
GET  /api/users/payments/subscription
POST /api/users/payments/subscription/cancel
```

## 🎟️ Support Tickets

```
POST /api/users/tickets/
GET  /api/users/tickets/
GET  /api/users/tickets/:ticketId
POST /api/users/tickets/:ticketId/reply
PUT  /api/users/tickets/:ticketId/close
```

## 🛠️ Admin Routes (All require authentication)

### Admin Login

```
POST /api/admin/login
```

### Dashboard

```
GET /api/admin/dashboard/stats
GET /api/admin/dashboard/graph-data
```

### User Management

```
GET    /api/admin/users/
GET    /api/admin/users/:userId
POST   /api/admin/users/:userId/ban
POST   /api/admin/users/:userId/unban
POST   /api/admin/users/:userId/deactivate
POST   /api/admin/users/:userId/activate
POST   /api/admin/users/:userId/verify-email
POST   /api/admin/users/:userId/verify-phone
POST   /api/admin/users/:userId/verify-kyc
PUT    /api/admin/users/:userId/notes
DELETE /api/admin/users/:userId
```

### Payments & Packages

```
GET    /api/admin/payments
GET    /api/admin/payments/:paymentId
POST   /api/admin/payments/:paymentId/complete
POST   /api/admin/payments/:paymentId/refund
GET    /api/admin/payments/stats
POST   /api/admin/packages
GET    /api/admin/packages
PUT    /api/admin/packages/:packageId
DELETE /api/admin/packages/:packageId
```

### Reports & Tickets

```
GET /api/admin/reports
GET /api/admin/reports/:reportId
PUT /api/admin/reports/:reportId/resolve
PUT /api/admin/reports/:reportId/dismiss
GET /api/admin/tickets
GET /api/admin/tickets/:ticketId
POST /api/admin/tickets/:ticketId/assign
POST /api/admin/tickets/:ticketId/reply
PUT /api/admin/tickets/:ticketId/close
GET /api/admin/tickets/stats
```

## 📊 Features Matrix

| Feature                 | Status |
| ----------------------- | ------ |
| User Registration/Login | ✅     |
| Profile Management      | ✅     |
| Profile Search          | ✅     |
| Interest System         | ✅     |
| Messaging               | ✅     |
| Notifications           | ✅     |
| Shortlist               | ✅     |
| Reports                 | ✅     |
| Payments                | ✅     |
| Support Tickets         | ✅     |
| Admin Dashboard         | ✅     |
| User Management         | ✅     |
| Payment Management      | ✅     |
| Report Moderation       | ✅     |
| Ticket Support          | ✅     |

## 🔑 Common Query Parameters

- `page=1` - Page number
- `limit=10` - Items per page
- `status=active` - Filter by status
- `search=keyword` - Search term
- `sort=field` - Sort by field

## 🔐 Authentication Header

```
Authorization: Bearer <jwt_token>
```

## 📝 Common Response Format

```json
{
  "message": "Success message",
  "data": { ... }
}
```

## ⚙️ Setup Steps

1. Install: `npm install`
2. Configure .env file
3. Start: `npm start`
4. Server runs on: http://localhost:5002

---

For detailed documentation, see API_DOCUMENTATION.md
