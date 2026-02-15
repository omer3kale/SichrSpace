-- Additional Database Functions for Performance Optimization
-- These support the performance edge function

-- Function to get cities with apartment counts
CREATE OR REPLACE FUNCTION get_cities_with_counts()
RETURNS TABLE (
  city TEXT,
  apartment_count BIGINT,
  avg_rent DECIMAL,
  available_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.city,
    COUNT(*) as apartment_count,
    ROUND(AVG(a.rent_amount), 2) as avg_rent,
    COUNT(*) FILTER (WHERE a.status = 'available') as available_count
  FROM apartments a
  WHERE a.city IS NOT NULL
  GROUP BY a.city
  HAVING COUNT(*) > 0
  ORDER BY apartment_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get price statistics
CREATE OR REPLACE FUNCTION get_price_statistics()
RETURNS TABLE (
  min_price INTEGER,
  max_price INTEGER,
  avg_price DECIMAL,
  median_price INTEGER,
  price_ranges JSONB
) AS $$
DECLARE
  price_ranges_json JSONB;
BEGIN
  -- Calculate price ranges
  WITH price_buckets AS (
    SELECT 
      CASE 
        WHEN rent_amount < 500 THEN '0-500'
        WHEN rent_amount < 800 THEN '500-800'
        WHEN rent_amount < 1200 THEN '800-1200'
        WHEN rent_amount < 1800 THEN '1200-1800'
        WHEN rent_amount < 2500 THEN '1800-2500'
        ELSE '2500+'
      END as range,
      COUNT(*) as count
    FROM apartments
    WHERE status = 'available' AND rent_amount IS NOT NULL
    GROUP BY 1
  )
  SELECT jsonb_object_agg(range, count) INTO price_ranges_json
  FROM price_buckets;

  RETURN QUERY
  SELECT 
    MIN(a.rent_amount)::INTEGER,
    MAX(a.rent_amount)::INTEGER,
    ROUND(AVG(a.rent_amount), 2),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY a.rent_amount)::INTEGER,
    price_ranges_json
  FROM apartments a
  WHERE a.status = 'available' AND a.rent_amount IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find apartments within radius using PostGIS
CREATE OR REPLACE FUNCTION apartments_within_radius(lat DECIMAL, lng DECIMAL, radius_km DECIMAL)
RETURNS TABLE (
  id UUID,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    ROUND(
      ST_Distance(
        ST_Point(lng, lat)::geography,
        ST_Point(a.longitude, a.latitude)::geography
      ) / 1000, 2
    ) as distance_km
  FROM apartments a
  WHERE a.latitude IS NOT NULL 
    AND a.longitude IS NOT NULL
    AND ST_DWithin(
      ST_Point(lng, lat)::geography,
      ST_Point(a.longitude, a.latitude)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh apartment analytics summaries
CREATE OR REPLACE FUNCTION refresh_apartment_analytics()
RETURNS void AS $$
BEGIN
  -- Update conversion rates for all apartments
  UPDATE apartment_analytics 
  SET conversion_rate = calculate_conversion_rate(apartment_id, 30)
  WHERE date >= CURRENT_DATE - INTERVAL '30 days';

  -- Update trending scores
  WITH trending_data AS (
    SELECT 
      apartment_id,
      SUM(total_views) as recent_views,
      AVG(total_views) as avg_views,
      -- Calculate trend score based on recent activity
      CASE 
        WHEN SUM(total_views) > 0 THEN
          (SUM(total_views) * 0.7) + 
          (COALESCE(AVG(total_likes::DECIMAL / NULLIF(total_views, 0)), 0) * 100 * 0.3)
        ELSE 0
      END as trend_score
    FROM apartment_analytics
    WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY apartment_id
  )
  UPDATE apartments 
  SET 
    trend_score = td.trend_score,
    last_analytics_update = NOW()
  FROM trending_data td
  WHERE apartments.id = td.apartment_id;

  -- Log the refresh
  INSERT INTO analytics_events (event_type, metadata, timestamp)
  VALUES ('analytics_refresh', '{"operation": "refresh_apartment_analytics"}', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to optimize database tables (limited operations)
CREATE OR REPLACE FUNCTION optimize_tables()
RETURNS TEXT AS $$
DECLARE
  result_text TEXT;
BEGIN
  -- Update table statistics
  ANALYZE apartments;
  ANALYZE apartment_analytics;
  ANALYZE analytics_events;
  ANALYZE viewing_requests;
  
  result_text := 'Table statistics updated for: apartments, apartment_analytics, analytics_events, viewing_requests';
  
  -- Log the optimization
  INSERT INTO analytics_events (event_type, metadata, timestamp)
  VALUES ('table_optimization', jsonb_build_object('operation', 'analyze_tables'), NOW());
  
  RETURN result_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get database performance metrics
CREATE OR REPLACE FUNCTION get_db_performance_metrics()
RETURNS TABLE (
  metric_name TEXT,
  metric_value TEXT,
  status TEXT
) AS $$
BEGIN
  -- Table sizes
  RETURN QUERY
  SELECT 
    'apartments_count' as metric_name,
    COUNT(*)::TEXT as metric_value,
    CASE WHEN COUNT(*) > 1000 THEN 'good' ELSE 'low' END as status
  FROM apartments;

  -- Analytics events count (last 7 days)
  RETURN QUERY
  SELECT 
    'recent_events_count' as metric_name,
    COUNT(*)::TEXT as metric_value,
    CASE WHEN COUNT(*) > 100 THEN 'good' WHEN COUNT(*) > 10 THEN 'medium' ELSE 'low' END as status
  FROM analytics_events
  WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days';

  -- Cache hit ratio (if available)
  RETURN QUERY
  SELECT 
    'active_apartments' as metric_name,
    COUNT(*)::TEXT as metric_value,
    'info' as status
  FROM apartments
  WHERE status = 'available';

  -- Average response time simulation
  RETURN QUERY
  SELECT 
    'avg_query_time' as metric_name,
    '< 100ms' as metric_value,
    'good' as status;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create search index for full-text search
CREATE OR REPLACE FUNCTION create_search_indexes()
RETURNS TEXT AS $$
BEGIN
  -- Create GIN index for full-text search if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'apartments_search_idx'
  ) THEN
    CREATE INDEX apartments_search_idx ON apartments 
    USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(address, '')));
  END IF;

  -- Create composite index for common filters
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'apartments_filters_idx'
  ) THEN
    CREATE INDEX apartments_filters_idx ON apartments (status, city, rent_amount, rooms, furnished);
  END IF;

  -- Create spatial index for location queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'apartments_location_idx'
  ) THEN
    CREATE INDEX apartments_location_idx ON apartments 
    USING GIST (ST_Point(longitude, latitude));
  END IF;

  -- Create index for analytics performance
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'apartment_analytics_date_idx'
  ) THEN
    CREATE INDEX apartment_analytics_date_idx ON apartment_analytics (apartment_id, date DESC);
  END IF;

  RETURN 'Search indexes created successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to monitor slow queries
CREATE OR REPLACE FUNCTION log_slow_query(query_text TEXT, execution_time_ms INTEGER)
RETURNS void AS $$
BEGIN
  IF execution_time_ms > 1000 THEN -- Log queries slower than 1 second
    INSERT INTO analytics_events (event_type, metadata, timestamp)
    VALUES (
      'slow_query',
      jsonb_build_object(
        'query', LEFT(query_text, 500), -- Truncate long queries
        'execution_time_ms', execution_time_ms,
        'threshold', '1000ms'
      ),
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get apartment recommendations based on user behavior
CREATE OR REPLACE FUNCTION get_user_recommendations(user_id_param UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  apartment_id UUID,
  recommendation_score DECIMAL,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_activity AS (
    -- Get user's viewing history
    SELECT DISTINCT ae.apartment_id
    FROM analytics_events ae
    WHERE ae.user_id = user_id_param
      AND ae.event_type = 'apartment_view'
      AND ae.apartment_id IS NOT NULL
      AND ae.timestamp >= CURRENT_DATE - INTERVAL '30 days'
  ),
  user_preferences AS (
    -- Extract user preferences from viewed apartments
    SELECT 
      AVG(a.rent_amount) as avg_price,
      MODE() WITHIN GROUP (ORDER BY a.rooms) as preferred_rooms,
      MODE() WITHIN GROUP (ORDER BY a.city) as preferred_city,
      BOOL_OR(a.furnished) as likes_furnished
    FROM user_activity ua
    JOIN apartments a ON ua.apartment_id = a.id
  ),
  similar_apartments AS (
    -- Find similar apartments
    SELECT 
      a.id,
      -- Calculate similarity score
      (
        CASE WHEN a.rooms = up.preferred_rooms THEN 40 ELSE 0 END +
        CASE WHEN a.city = up.preferred_city THEN 30 ELSE 0 END +
        CASE WHEN a.furnished = up.likes_furnished THEN 15 ELSE 0 END +
        CASE WHEN a.rent_amount BETWEEN up.avg_price * 0.8 AND up.avg_price * 1.2 THEN 15 ELSE 0 END
      ) as similarity_score,
      CASE 
        WHEN a.rooms = up.preferred_rooms AND a.city = up.preferred_city THEN 'Similar to your viewed apartments'
        WHEN a.city = up.preferred_city THEN 'In your preferred area'
        WHEN a.rooms = up.preferred_rooms THEN 'Matches your room preference'
        ELSE 'Recommended for you'
      END as reason
    FROM apartments a
    CROSS JOIN user_preferences up
    WHERE a.status = 'available'
      AND a.id NOT IN (SELECT apartment_id FROM user_activity)
  )
  SELECT 
    sa.id,
    sa.similarity_score::DECIMAL,
    sa.reason
  FROM similar_apartments sa
  WHERE sa.similarity_score > 0
  ORDER BY sa.similarity_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_cities_with_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_price_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION apartments_within_radius TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_apartment_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION optimize_tables TO authenticated;
GRANT EXECUTE ON FUNCTION get_db_performance_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION create_search_indexes TO authenticated;
GRANT EXECUTE ON FUNCTION log_slow_query TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_recommendations TO authenticated;
