# Socket Events Structure Documentation

## Overview

Socket events have been organized into separate files for better maintainability and clarity. Each category of events is handled in its own module.

## File Structure

```
backend/
└── socketEvents/
    ├── index.js                 # Main socket initialization
    ├── messageEvents.js         # Messaging events
    ├── interestEvents.js        # Interest & match events
    ├── notificationEvents.js    # Notification events
    ├── visitorEvents.js         # Profile visitor tracking
    ├── statusEvents.js          # User online/offline status
    └── adminEvents.js           # Admin & moderation events
```

## Event Categories

### 1. Message Events (`messageEvents.js`)

Handle all real-time messaging functionality.

**Events:**

- `message:send` - Send a message to another user
- `message:receive` - Receive a message (emitted to receiver)
- `message:read` - Mark message as read
- `message:typing` - User is typing indicator
- `message:stopTyping` - User stopped typing
- `message:delete` - Delete a message
- `message:getConversation` - Retrieve conversation history
- `message:delivered` - Message delivery confirmation

**Usage:**

```javascript
// Send message
socket.emit("message:send", {
  senderId: userId,
  receiverId: receiverId,
  content: "Hello!",
  attachments: [],
});

// Listen for new messages
socket.on("message:receive", (data) => {
  console.log("New message:", data);
});
```

---

### 2. Interest Events (`interestEvents.js`)

Handle interest sending and matching.

**Events:**

- `interest:send` - Send interest to a user
- `interest:received` - Receive interest notification (emitted)
- `interest:accept` - Accept an interest (create match)
- `interest:reject` - Reject an interest
- `interest:cancelled` - Cancel sent interest
- `interest:getPending` - Get pending received interests
- `interest:getSent` - Get sent interests
- `match:created` - New match created (emitted)

**Usage:**

```javascript
// Send interest
socket.emit("interest:send", {
  senderId: userId,
  receiverId: profileId,
  message: "I like your profile!",
});

// Listen for matches
socket.on("match:created", (data) => {
  console.log("You matched with:", data.matchedWith);
});
```

---

### 3. Notification Events (`notificationEvents.js`)

Handle user notifications system.

**Events:**

- `notification:send` - Send notification to user
- `notification:new` - New notification received (emitted)
- `notification:read` - Mark notification as read
- `notification:readAll` - Mark all notifications as read
- `notification:getList` - Get notification list
- `notification:getUnreadCount` - Get unread count
- `notification:delete` - Delete specific notification
- `notification:deleteAll` - Clear all notifications

**Usage:**

```javascript
// Listen for new notifications
socket.on("notification:new", (data) => {
  console.log("Notification:", data.title);
});

// Mark as read
socket.emit("notification:read", { notificationId: "id" });

// Get unread count
socket.emit("notification:getUnreadCount", { userId });
```

---

### 4. Visitor Events (`visitorEvents.js`)

Track profile visitors.

**Events:**

- `profile:view` - User viewed another profile
- `visitor:new` - Someone viewed your profile (emitted)
- `visitor:getList` - Get list of visitors
- `visitor:getCount` - Get visitor count
- `visitor:clear` - Clear visitor tracking
- `visitor:remove` - Remove specific visitor

**Usage:**

```javascript
// Notify when viewing profile
socket.emit("profile:view", {
  viewerId: userId,
  profileOwnerId: profileId,
});

// Listen for visitors
socket.on("visitor:new", (data) => {
  console.log("Visited by:", data.visitorName);
});
```

---

### 5. Status Events (`statusEvents.js`)

Manage user online/offline status.

**Events:**

- `user:login` - User comes online
- `user:online` - User is now online (emitted)
- `user:offline` - User goes offline (emitted)
- `user:getStatus` - Check user status
- `user:getStatusBatch` - Check multiple users' status
- `user:updateActivity` - Update last active time
- `user:setStatus` - Set custom status message
- `user:statusChanged` - Status changed (broadcast)

**Usage:**

```javascript
// Set user online
socket.emit("user:login", { userId, status: "online" });

// Listen for status changes
socket.on("user:statusChanged", (data) => {
  console.log(`User ${data.userId} is now ${data.status}`);
});

// Get user status
socket.emit("user:getStatus", { userId });
socket.on("user:status", (data) => {
  console.log("User is online:", data.isOnline);
});
```

---

### 6. Admin Events (`adminEvents.js`)

Admin moderation and management features.

**Events:**

- `admin:login` - Admin authentication
- `report:created` - New report created
- `report:new` - Broadcast to admins (emitted)
- `report:resolve` - Admin resolves report
- `ticket:created` - New support ticket
- `ticket:new` - Broadcast to admins (emitted)
- `ticket:assign` - Assign ticket to admin
- `ticket:reply` - Admin replies to ticket
- `ticket:close` - Close ticket
- `admin:broadcastMessage` - Send message to all admins
- `admin:getLiveStats` - Get real-time dashboard stats

**Usage:**

```javascript
// Admin login
socket.emit("admin:login", { adminId: adminId });

// Listen for new reports
socket.on("report:new", (data) => {
  console.log("New report:", data);
});

// Resolve report
socket.emit("report:resolve", {
  reportId,
  action: "ban", // 'dismiss', 'warn', 'ban'
  notes: "User violated terms",
});

// Get live stats
socket.emit("admin:getLiveStats", { adminId });
socket.on("admin:liveStats", (data) => {
  console.log("Online users:", data.onlineUsers);
});
```

---

## Main Socket Handler (`index.js`)

Central socket initialization that registers all event handlers.

**Key Functions:**

1. **User Room Management**
   - `user:join` - User joins their personal room
   - `admin:join` - Admin joins their room

2. **Connection/Disconnection**
   - `on('connection')` - New client connected
   - `on('disconnect')` - Client disconnected

3. **Event Registration**
   - Automatically registers all events from each module

---

## Best Practices

### 1. Event Naming Convention

- Use colon-separated namespaces: `feature:action`
- Examples: `message:send`, `interest:accept`, `admin:login`

### 2. Error Handling

All events include try-catch blocks and emit errors:

```javascript
socket.emit("error", {
  type: "event:name",
  message: error.message,
});
```

### 3. Data Structure

Always include relevant metadata:

- User IDs (senderId, receiverId, userId)
- Timestamps (createdAt, timestamp)
- Status information (isRead, status)

### 4. Rooms

- User rooms: `user:{userId}`
- Admin rooms: `admin:{adminId}` and `admin:all`
- Broadcast using: `io.to('room:name').emit('event', data)`

### 5. Adding New Events

To add new socket events:

1. Create/update appropriate file in `socketEvents/`
2. Define event handler function
3. Add to main `index.js` registration
4. Document in this file

Example:

```javascript
// In socketEvents/newFeature.js
const registerNewFeatureEvents = (io, socket) => {
  socket.on("feature:action", async (data) => {
    try {
      // Event handling logic
      socket.emit("feature:confirmation", { status: "success" });
    } catch (error) {
      socket.emit("error", { type: "feature:action", message: error.message });
    }
  });
};

module.exports = registerNewFeatureEvents;
```

```javascript
// In socketEvents/index.js - add import and registration
const registerNewFeatureEvents = require("./newFeature");

const initializeSocketEvents = (io) => {
  io.on("connection", (socket) => {
    // ... other registrations
    registerNewFeatureEvents(io, socket);
  });
};
```

---

## Testing Socket Events

### Using Socket.io Client

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:5002");

socket.on("connect", () => {
  console.log("Connected!");
  socket.emit("user:login", { userId: "test-user" });
});

socket.on("message:receive", (data) => {
  console.log("Message:", data);
});
```

### Using Browser DevTools

1. Open browser console
2. Access socket: `window.socket`
3. Emit event: `window.socket.emit('event:name', data)`
4. Check listener: `window.socket.on('event:response', console.log)`

---

## Migration from Old Code

The old code had all socket handlers in `server.js`. New code is organized as:

| Feature       | Old Location | New Location          |
| ------------- | ------------ | --------------------- |
| Messages      | server.js    | messageEvents.js      |
| Interests     | server.js    | interestEvents.js     |
| Notifications | server.js    | notificationEvents.js |
| Visitors      | server.js    | visitorEvents.js      |
| Status        | server.js    | statusEvents.js       |
| Admin         | server.js    | adminEvents.js        |

All functionality remains the same, just reorganized for better maintainability.

---

## Performance Considerations

1. **Memory Usage**: Visitor tracking uses in-memory Set, clear old data periodically
2. **Broadcasting**: Use targeted rooms instead of broadcast when possible
3. **Database Queries**: Consider caching frequently accessed data
4. **Event Throttling**: Implement throttling for high-frequency events like typing

## Troubleshooting

**Events not firing?**

- Check room name matches sender and receiver
- Verify socket is properly joined to room
- Check for typos in event names

**Connection issues?**

- Verify CORS configuration
- Check websocket support in browser
- Ensure Socket.io port is accessible

**Memory leaks?**

- Use `removeAllListeners()` on disconnect
- Clear tracking data periodically
- Monitor socket connection count
