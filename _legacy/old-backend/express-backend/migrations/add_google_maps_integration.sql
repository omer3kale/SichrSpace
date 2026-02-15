-- Migration: Add latitude and longitude columns to apartments table
-- This enables Google Maps integration for apartment locations

-- Add latitude and longitude columns
ALTER TABLE apartments 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Add spatial index for efficient location queries
CREATE INDEX idx_apartments_location ON apartments (latitude, longitude);

-- Add a computed column for easier distance calculations
ALTER TABLE apartments 
ADD COLUMN location_point POINT AS (POINT(longitude, latitude)) STORED;

-- Create spatial index on the point column
CREATE SPATIAL INDEX idx_apartments_spatial ON apartments (location_point);

-- Update existing apartments with sample coordinates (Berlin area)
UPDATE apartments 
SET 
  latitude = 52.5200 + (RAND() - 0.5) * 0.1,
  longitude = 13.4050 + (RAND() - 0.5) * 0.1
WHERE latitude IS NULL OR longitude IS NULL;

-- Add constraints to ensure valid coordinates
ALTER TABLE apartments 
ADD CONSTRAINT chk_latitude CHECK (latitude BETWEEN -90 AND 90),
ADD CONSTRAINT chk_longitude CHECK (longitude BETWEEN -180 AND 180);

-- Create a function to calculate distance between two points
DELIMITER //
CREATE FUNCTION calculate_distance(lat1 DECIMAL(10,8), lng1 DECIMAL(11,8), lat2 DECIMAL(10,8), lng2 DECIMAL(11,8))
RETURNS DECIMAL(10,2)
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE distance DECIMAL(10,2);
  DECLARE R DECIMAL(10,2) DEFAULT 6371; -- Earth's radius in km
  DECLARE dlat DECIMAL(10,8);
  DECLARE dlng DECIMAL(11,8);
  DECLARE a DECIMAL(20,16);
  DECLARE c DECIMAL(20,16);
  
  SET dlat = RADIANS(lat2 - lat1);
  SET dlng = RADIANS(lng2 - lng1);
  SET a = SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlng/2) * SIN(dlng/2);
  SET c = 2 * ATAN2(SQRT(a), SQRT(1-a));
  SET distance = R * c;
  
  RETURN distance;
END//
DELIMITER ;

-- Create view for apartments with location data
CREATE VIEW apartments_with_location AS
SELECT 
  a.*,
  a.latitude,
  a.longitude,
  a.location_point
FROM apartments a
WHERE a.latitude IS NOT NULL AND a.longitude IS NOT NULL;

-- Add columns for geocoding cache
CREATE TABLE IF NOT EXISTS geocoding_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  address VARCHAR(255) NOT NULL UNIQUE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  formatted_address TEXT,
  place_id VARCHAR(255),
  components JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_geocoding_address (address),
  INDEX idx_geocoding_coordinates (latitude, longitude)
);

-- Add table for places cache
CREATE TABLE IF NOT EXISTS places_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  place_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  types JSON,
  rating DECIMAL(2, 1),
  price_level INT,
  vicinity TEXT,
  formatted_address TEXT,
  phone_number VARCHAR(50),
  website VARCHAR(255),
  opening_hours JSON,
  photos JSON,
  reviews JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_places_location (latitude, longitude),
  INDEX idx_places_name (name),
  INDEX idx_places_rating (rating)
);

-- Add table for routes cache
CREATE TABLE IF NOT EXISTS routes_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  origin_lat DECIMAL(10, 8) NOT NULL,
  origin_lng DECIMAL(11, 8) NOT NULL,
  destination_lat DECIMAL(10, 8) NOT NULL,
  destination_lng DECIMAL(11, 8) NOT NULL,
  travel_mode ENUM('DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT') NOT NULL,
  distance_meters INT,
  duration_seconds INT,
  route_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  INDEX idx_routes_origin (origin_lat, origin_lng),
  INDEX idx_routes_destination (destination_lat, destination_lng),
  INDEX idx_routes_mode (travel_mode),
  INDEX idx_routes_expires (expires_at)
);

-- Create apartment location search procedures
DELIMITER //
CREATE PROCEDURE find_apartments_near_location(
  IN search_lat DECIMAL(10,8),
  IN search_lng DECIMAL(11,8),
  IN radius_km DECIMAL(10,2),
  IN max_results INT
)
BEGIN
  SELECT 
    a.*,
    calculate_distance(search_lat, search_lng, a.latitude, a.longitude) as distance_km
  FROM apartments_with_location a
  WHERE calculate_distance(search_lat, search_lng, a.latitude, a.longitude) <= radius_km
  ORDER BY distance_km
  LIMIT max_results;
END//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE find_apartments_in_bounds(
  IN north_lat DECIMAL(10,8),
  IN south_lat DECIMAL(10,8),
  IN east_lng DECIMAL(11,8),
  IN west_lng DECIMAL(11,8)
)
BEGIN
  SELECT a.*
  FROM apartments_with_location a
  WHERE a.latitude BETWEEN south_lat AND north_lat
    AND a.longitude BETWEEN west_lng AND east_lng;
END//
DELIMITER ;

-- Add sample geocoded data for testing
INSERT INTO geocoding_cache (address, latitude, longitude, formatted_address, place_id) VALUES
('Berlin, Germany', 52.5200066, 13.4049540, 'Berlin, Germany', 'ChIJAVkDPzdOqEcRcDteW0YgIQQ'),
('Munich, Germany', 48.1351253, 11.5819805, 'Munich, Germany', 'ChIJ2V-Mo_l1nkcRfZixfUq4DAE'),
('Hamburg, Germany', 53.5510846, 9.9936818, 'Hamburg, Germany', 'ChIJuRMYfoNOsUcRoDrWe_I9JgQ'),
('Cologne, Germany', 50.9375, 6.9602786, 'Cologne, Germany', 'ChIJ5S-raZElv0cR8HkyKaM5uTI');

-- Create indexes for performance optimization
CREATE INDEX idx_apartments_price_location ON apartments (price, latitude, longitude);
CREATE INDEX idx_apartments_bedrooms_location ON apartments (bedrooms, latitude, longitude);
CREATE INDEX idx_apartments_available_location ON apartments (available, latitude, longitude);

COMMIT;
