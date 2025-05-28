-- migrations/schema.sql

-- Users table (for both drivers and passengers)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('driver', 'passenger')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Taxis table
CREATE TABLE taxis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES users(id),
    vehicle_type VARCHAR(50) NOT NULL,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    is_available BOOLEAN DEFAULT true,
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    last_location_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID REFERENCES users(id),
    taxi_id UUID REFERENCES taxis(id),
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,
    pickup_address TEXT,
    destination_lat DECIMAL(10, 8),
    destination_lng DECIMAL(11, 8),
    destination_address TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
    estimated_fare DECIMAL(10, 2),
    actual_fare DECIMAL(10, 2),
    estimated_arrival INTEGER, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Driver ratings table
CREATE TABLE driver_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES users(id),
    passenger_id UUID REFERENCES users(id),
    booking_id UUID REFERENCES bookings(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Taxi location history (for tracking)
CREATE TABLE taxi_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxi_id UUID REFERENCES taxis(id),
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_taxis_location ON taxis(current_lat, current_lng);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_taxi_locations_taxi_id ON taxi_locations(taxi_id);
CREATE INDEX idx_taxi_locations_timestamp ON taxi_locations(timestamp);
