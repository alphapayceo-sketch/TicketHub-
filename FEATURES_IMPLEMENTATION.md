# TicketHub Backend - New Features Implementation Guide

## Overview
This document outlines all the new features added to the TicketHub backend system. The implementation includes 12 major features across critical business, user experience, admin & organizer tools, and advanced functionality.

## Database Updates

Run the updated schema.sql to create all new tables:
```sql
-- New tables added:
- event_categories (event tags/categories)
- event_category_mapping (junction table for many-to-many relationship)
- ticket_categories (ticket tiers: VIP, General, Early Bird, etc)
- seats (venue seat management)
- ticket_transfers (ticket resale/sharing)
- favorites (user watchlist)
- event_reviews (ratings and comments)
- attendance_logs (QR code scanning history)
- bulk_operations (admin bulk operations)
- event_capacity_logs (capacity tracking history)
```

## Implementation Details

### 1. EMAIL NOTIFICATIONS SERVICE
**File**: `src/services/emailService.js`

Methods available:
- `sendTicketConfirmation()` - Send ticket confirmation emails
- `sendTransferNotification()` - Notify users of ticket transfers
- `sendRefundNotification()` - Notify on refund approval/rejection
- `sendEventReminder()` - Send event reminder emails
- `sendBulkOperationNotification()` - Notify about bulk operations
- `sendOrganizerApplicationResponse()` - Application approval/rejection

**Environment Variables Required**:
```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@tickethub.com
```

---

### 2. TICKET CATEGORIES (TIERS)
**File**: `src/controllers/ticketCategoryController.js`
**Routes**: `/api/ticket-categories`

Endpoints:
- `POST /` - Create ticket category (organizer/admin)
- `GET /event/:eventId` - Get all categories for event
- `PUT /:categoryId` - Update category details
- `DELETE /:categoryId` - Delete category
- `GET /:categoryId/availability` - Check remaining inventory

Example payload:
```json
{
  "eventId": "uuid",
  "name": "VIP Tier",
  "description": "Premium seating with access to lounge",
  "price": 150,
  "quantity": 100,
  "benefits": "Free parking, VIP lounge access"
}
```

---

### 3. SEAT ASSIGNMENT SYSTEM
**File**: `src/controllers/seatController.js`
**Routes**: `/api/seats`

Endpoints:
- `POST /` - Create seats for event
- `GET /event/:eventId` - Get all seats with status
- `GET /event/:eventId/section/:section` - Get seats by section
- `GET /event/:eventId/available` - Get available seats only
- `GET /event/:eventId/chart` - Get seat chart visualization
- `PATCH /:seatId` - Update seat status
- `POST /event/:eventId/block` - Block multiple seats

Seat statuses: `AVAILABLE`, `RESERVED`, `SOLD`, `BLOCKED`

Example seat creation:
```json
{
  "eventId": "uuid",
  "seats": [
    { "section": "A", "row": "1", "seatNumber": "01" },
    { "section": "A", "row": "1", "seatNumber": "02" }
  ]
}
```

---

### 4. TICKET TRANSFERS (RESALE/SHARING)
**File**: `src/controllers/ticketTransferController.js`
**Routes**: `/api/ticket-transfers`

Endpoints:
- `POST /` - Transfer ticket to another user
- `GET /my-history` - Get user's transfer history
- `GET /received` - Get tickets received by user
- `GET /event/:eventId` - Get all transfers for event (organizer)

Features:
- Automatic email notification to recipient
- Transfer history tracking
- Only valid tickets can be transferred
- Organizers can view all transfers for their events

Example:
```json
{
  "ticketId": "uuid",
  "toUserId": "uuid"
}
```

---

### 5. FAVORITES/WATCHLIST
**File**: `src/controllers/favoriteController.js`
**Routes**: `/api/favorites`

Endpoints:
- `POST /` - Add event to favorites
- `DELETE /:eventId` - Remove from favorites
- `GET /my-favorites` - Get user's favorites with pagination
- `GET /check/:eventId` - Check if event is favorited
- `GET /count/:eventId` - Get favorite count for event
- `GET /popular` - Get top 10 favorited events

Features:
- Prevents duplicate favorites
- Pagination support
- Event metadata included with favorites
- Track most popular events

---

### 6. EVENT REVIEWS & RATINGS
**File**: `src/controllers/reviewController.js`
**Routes**: `/api/reviews`

Endpoints:
- `POST /` - Create review (must have attended)
- `GET /event/:eventId` - Get reviews with summary stats
- `PUT /:reviewId` - Update user's own review
- `DELETE /:reviewId` - Delete user's review
- `GET /my-reviews` - Get user's all reviews
- `GET /top-rated` - Get highest rated events
- `GET /stats/:eventId` - Get detailed statistics

Features:
- 1-5 star rating system
- Only users with valid tickets can review
- One review per user per event
- Detailed statistics (distribution, average, etc)
- Sort reviews by date or rating

Example:
```json
{
  "eventId": "uuid",
  "rating": 5,
  "comment": "Amazing event! Great organization."
}
```

---

### 7. ADVANCED SEARCH & FILTERS
**File**: `src/controllers/eventCategoryController.js`
**Routes**: `/api/event-categories`

Features:
- Filter events by category/tag
- Multiple category support per event
- Category-based discovery
- Popular categories tracking

Endpoints:
- `GET /` - Get all categories with event counts
- `GET /:categoryId/events` - Get events in category (paginated)
- `GET /event/:eventId/categories` - Get categories for an event
- `POST /` - Create category (admin)
- `PUT /:categoryId` - Update category (admin)
- `DELETE /:categoryId` - Delete category (admin)
- `POST /:categoryId/events` - Add event to category
- `DELETE /:categoryId/events/:eventId` - Remove event from category

---

### 8. EVENT CATEGORIES/TAGS
Same as feature #7 - Integrated with search functionality.

---

### 9. BULK OPERATIONS
**File**: `src/controllers/bulkOperationController.js`
**Routes**: `/api/bulk-operations`

Endpoints:
- `POST /` - Create bulk operation (admin)
- `GET /:operationId` - Get operation details
- `GET /` - Get all operations with filters
- `POST /:operationId/cancel` - Cancel pending operation
- `GET /stats/summary` - Get bulk operation statistics

Supported operations:
- `BULK_REFUND_TICKETS` - Refund multiple tickets
- `BULK_EMAIL_NOTIFICATION` - Send emails to multiple users
- `BULK_CANCEL_EVENTS` - Cancel multiple events
- `BULK_BLOCK_USERS` - Block multiple users

Example:
```json
{
  "operationType": "BULK_REFUND_TICKETS",
  "targetIds": ["ticket-id-1", "ticket-id-2"],
  "reason": "Event cancelled due to weather"
}
```

Operations are processed asynchronously with status tracking.

---

### 10. CAPACITY MANAGEMENT
**File**: `src/controllers/capacityController.js`
**Routes**: `/api/capacity`

Endpoints:
- `GET /event/:eventId` - Get current capacity status
- `POST /batch` - Get capacity for multiple events
- `POST /event/:eventId/snapshot` - Log capacity snapshot
- `GET /event/:eventId/history` - Get capacity change history
- `GET /alerts` - Get low-capacity alerts
- `PUT /event/:eventId` - Update event capacity

Features:
- Real-time capacity tracking
- Capacity status indicators:
  - `SOLD_OUT`
  - `NEARLY_FULL` (<10% remaining)
  - `FILLING_UP` (<30% remaining)
  - `AVAILABLE` (<70% remaining)
  - `PLENTY_AVAILABLE` (>70% remaining)
- Historical logs for analysis
- Automated alerts when capacity drops below threshold
- Prevents capacity reduction below sold tickets

---

### 11. ATTENDANCE SCANNING & LOGGING
**File**: `src/controllers/attendanceController.js`
**Routes**: `/api/attendance`

Endpoints:
- `POST /scan` - Record single ticket scan
- `POST /scan/bulk` - Bulk scan multiple tickets
- `GET /ticket/:ticketId` - Get scan history for ticket
- `GET /event/:eventId` - Get all attendees for event
- `GET /event/:eventId/stats` - Get event attendance statistics
- `GET /event/:eventId/locations` - Get attendance by location

Features:
- QR code scanning with entry/exit tracking
- Real-time attendance monitoring
- Multiple location support
- Attendance rate calculations
- Current attendee count tracking
- Location-based statistics

Scan types: `ENTRY`, `EXIT`

Example:
```json
{
  "ticketId": "uuid",
  "scanType": "ENTRY",
  "location": "Main Gate"
}
```

Ticket status transitions:
- `VALID` → `USED` (on ENTRY scan)
- `USED` → `CHECKED_OUT` (on EXIT scan)

---

## Integration Checklist

To integrate these features:

1. **Database Setup**
   ```bash
   psql -U postgres -d tickethub -f src/database/schema.sql
   ```

2. **Update Dependencies**
   ```bash
   npm install nodemailer
   ```

3. **Environment Variables**
   - Copy `.env.example` to `.env`
   - Configure email settings
   - Test email service: `npm test` (add email test)

4. **Test Each Feature**
   ```bash
   # Use the Postman collection: TicketHub API.postman_collection.json
   # Add tests for new endpoints
   ```

5. **Authorization**
   - Routes include middleware for role-based access
   - `authMiddleware` - Requires authentication
   - `roleMiddleware("ORGANIZER", "ADMIN")` - Requires specific roles

## API Response Format

All endpoints follow a consistent response format:

**Success (2xx)**:
```json
{
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

**Error (4xx/5xx)**:
```json
{
  "error": "Error description"
}
```

## Security Considerations

1. **Email Configuration**: Use app-specific passwords, not main Gmail password
2. **Bulk Operations**: Only admin can execute, logged with user ID
3. **Attendance Scanning**: Organizer/admin verification required
4. **Capacity Updates**: Prevents invalid state (capacity < sold tickets)
5. **Ticket Transfers**: Only valid tickets can be transferred
6. **Reviews**: Only ticket holders can review

## Performance Optimization

- Pagination on list endpoints (default limit: 10)
- Indexed queries on frequently searched columns
- Capacity logs for trend analysis
- Bulk operations processed asynchronously
- Aggregated statistics for efficiency

## Testing Notes

1. Email service requires valid Gmail credentials
2. Bulk operations run asynchronously - check status via GET
3. Reviews require valid ticket ownership
4. Ticket transfers update payment records
5. Attendance logs update ticket status

## Future Enhancements

- Seat pricing variation by section
- Dynamic pricing based on capacity
- Review sentiment analysis
- Email template customization
- Attendance report exports
- Advanced analytics dashboards
