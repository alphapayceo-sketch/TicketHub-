CREATE TABLE users(
    id UUID PRIMARY KEY,
    firebase_uid VARCHAR UNIQUE,
    fullname VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    fcm_token TEXT,
    role VARCHAR DEFAULT 'CUSTOMER',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE events(
    id UUID PRIMARY KEY,
    organizer_id UUID,
    title VARCHAR,
    description TEXT,
    location VARCHAR,
    date DATE,
    time TIME,
    ticket_price DECIMAL,
    capacity INTEGER,
    image_url TEXT,
    status VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tickets(
    id UUID PRIMARY KEY,
    event_id UUID,
    user_id UUID,
    qr_code TEXT,
    ticket_number VARCHAR,
    status VARCHAR,
    purchase_date TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments(
    id UUID PRIMARY KEY,
    user_id UUID,
    amount DECIMAL,
    payment_method VARCHAR,
    status VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refunds(
    id UUID PRIMARY KEY,
    ticket_id UUID,
    user_id UUID,
    reason TEXT,
    status VARCHAR,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE organizer_applications(
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    business_name VARCHAR,
    phone VARCHAR,
    description TEXT,
    status VARCHAR DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Event Categories/Tags for better organization
CREATE TABLE event_categories(
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Junction table for events and categories (many-to-many)
CREATE TABLE event_category_mapping(
    event_id UUID NOT NULL,
    category_id UUID NOT NULL,
    PRIMARY KEY (event_id, category_id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (category_id) REFERENCES event_categories(id)
);

-- Ticket tiers/categories (VIP, General, Early Bird, etc)
CREATE TABLE ticket_categories(
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    price DECIMAL NOT NULL,
    quantity_available INTEGER NOT NULL,
    quantity_sold INTEGER DEFAULT 0,
    benefits TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Seats and sections for venue management
CREATE TABLE seats(
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    section VARCHAR,
    row VARCHAR,
    seat_number VARCHAR,
    status VARCHAR DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (event_id) REFERENCES events(id),
    UNIQUE(event_id, section, row, seat_number)
);

-- Update tickets table to include tier and seat info
ALTER TABLE tickets ADD COLUMN ticket_category_id UUID;
ALTER TABLE tickets ADD COLUMN seat_id UUID;
ALTER TABLE tickets ADD CONSTRAINT fk_ticket_category FOREIGN KEY (ticket_category_id) REFERENCES ticket_categories(id);
ALTER TABLE tickets ADD CONSTRAINT fk_ticket_seat FOREIGN KEY (seat_id) REFERENCES seats(id);

-- Ticket transfers for resale/sharing
CREATE TABLE ticket_transfers(
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL,
    from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL,
    transfer_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR DEFAULT 'COMPLETED',
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
);

-- User favorites/watchlist for events
CREATE TABLE favorites(
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    event_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    UNIQUE(user_id, event_id)
);

-- Event reviews and ratings
CREATE TABLE event_reviews(
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(event_id, user_id)
);

-- Attendance logs for QR code scanning
CREATE TABLE attendance_logs(
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL,
    scanned_by_user_id UUID NOT NULL,
    event_id UUID NOT NULL,
    scan_type VARCHAR DEFAULT 'ENTRY',
    scanned_at TIMESTAMP DEFAULT NOW(),
    location VARCHAR,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (scanned_by_user_id) REFERENCES users(id),
    FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Bulk operations tracking for admin operations
CREATE TABLE bulk_operations(
    id UUID PRIMARY KEY,
    operation_type VARCHAR,
    created_by_user_id UUID NOT NULL,
    target_count INTEGER,
    processed_count INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- Event capacity tracking
CREATE TABLE event_capacity_logs(
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    capacity INTEGER,
    sold INTEGER DEFAULT 0,
    remaining INTEGER,
    recorded_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (event_id) REFERENCES events(id)
);
    
