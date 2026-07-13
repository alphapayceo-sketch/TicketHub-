ALTER TABLE users
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

ALTER TABLE events
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS organizer_applications(
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    business_name VARCHAR,
    phone VARCHAR,
    description TEXT,
    status VARCHAR DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS event_categories(
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_category_mapping(
    event_id UUID NOT NULL,
    category_id UUID NOT NULL,
    PRIMARY KEY (event_id, category_id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (category_id) REFERENCES event_categories(id)
);

CREATE TABLE IF NOT EXISTS ticket_categories(
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

CREATE TABLE IF NOT EXISTS seats(
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

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS ticket_category_id UUID;

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS seat_id UUID;

CREATE TABLE IF NOT EXISTS ticket_transfers(
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

CREATE TABLE IF NOT EXISTS favorites(
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    event_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    UNIQUE(user_id, event_id)
);

CREATE TABLE IF NOT EXISTS event_reviews(
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

CREATE TABLE IF NOT EXISTS attendance_logs(
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

CREATE TABLE IF NOT EXISTS bulk_operations(
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

CREATE TABLE IF NOT EXISTS event_capacity_logs(
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    capacity INTEGER,
    sold INTEGER DEFAULT 0,
    remaining INTEGER,
    recorded_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (event_id) REFERENCES events(id)
);

UPDATE tickets
SET status = 'VALID'
WHERE status = 'ACTIVE';
