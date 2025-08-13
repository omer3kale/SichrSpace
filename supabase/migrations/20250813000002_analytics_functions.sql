-- Analytics Database Functions for SichrPlace
-- These functions support the analytics edge function

-- Function to increment apartment views
CREATE OR REPLACE FUNCTION increment_apartment_views(apartment_id UUID, date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO apartment_analytics (apartment_id, date, total_views)
  VALUES (apartment_id, date, 1)
  ON CONFLICT (apartment_id, date)
  DO UPDATE SET 
    total_views = apartment_analytics.total_views + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment apartment likes
CREATE OR REPLACE FUNCTION increment_apartment_likes(apartment_id UUID, date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO apartment_analytics (apartment_id, date, total_likes)
  VALUES (apartment_id, date, 1)
  ON CONFLICT (apartment_id, date)
  DO UPDATE SET 
    total_likes = apartment_analytics.total_likes + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment viewing requests
CREATE OR REPLACE FUNCTION increment_viewing_requests(apartment_id UUID, date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO apartment_analytics (apartment_id, date, viewing_requests)
  VALUES (apartment_id, date, 1)
  ON CONFLICT (apartment_id, date)
  DO UPDATE SET 
    viewing_requests = apartment_analytics.viewing_requests + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment global counters
CREATE OR REPLACE FUNCTION increment_global_counter(counter_type TEXT, date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO analytics_summary (date, event_type, count)
  VALUES (date, counter_type, 1)
  ON CONFLICT (date, event_type)
  DO UPDATE SET 
    count = analytics_summary.count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate conversion rates
CREATE OR REPLACE FUNCTION calculate_conversion_rate(apartment_id UUID, days INTEGER DEFAULT 30)
RETURNS DECIMAL AS $$
DECLARE
  total_views INTEGER;
  total_requests INTEGER;
  conversion_rate DECIMAL;
BEGIN
  -- Get total views in the period
  SELECT COALESCE(SUM(total_views), 0) INTO total_views
  FROM apartment_analytics
  WHERE apartment_analytics.apartment_id = calculate_conversion_rate.apartment_id
    AND date >= CURRENT_DATE - (days || ' days')::INTERVAL;

  -- Get total viewing requests in the period
  SELECT COUNT(*) INTO total_requests
  FROM viewing_requests
  WHERE viewing_requests.apartment_id = calculate_conversion_rate.apartment_id
    AND created_at >= CURRENT_DATE - (days || ' days')::INTERVAL;

  -- Calculate conversion rate
  IF total_views > 0 THEN
    conversion_rate := (total_requests::DECIMAL / total_views::DECIMAL) * 100;
  ELSE
    conversion_rate := 0;
  END IF;

  RETURN ROUND(conversion_rate, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get apartment performance summary
CREATE OR REPLACE FUNCTION get_apartment_performance_summary(apartment_id UUID, days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_views BIGINT,
  total_likes BIGINT,
  total_requests BIGINT,
  conversion_rate DECIMAL,
  avg_daily_views DECIMAL,
  rank_by_views INTEGER
) AS $$
BEGIN
  -- Get the apartment's performance metrics
  SELECT 
    COALESCE(SUM(aa.total_views), 0),
    COALESCE(SUM(aa.total_likes), 0),
    (SELECT COUNT(*) FROM viewing_requests vr 
     WHERE vr.apartment_id = get_apartment_performance_summary.apartment_id 
       AND vr.created_at >= CURRENT_DATE - (days || ' days')::INTERVAL),
    calculate_conversion_rate(get_apartment_performance_summary.apartment_id, days),
    COALESCE(AVG(aa.total_views), 0),
    (SELECT COUNT(*) + 1 FROM apartments a2
     JOIN apartment_analytics aa2 ON a2.id = aa2.apartment_id
     WHERE aa2.date >= CURRENT_DATE - (days || ' days')::INTERVAL
     GROUP BY a2.id
     HAVING SUM(aa2.total_views) > COALESCE((
       SELECT SUM(aa3.total_views) FROM apartment_analytics aa3 
       WHERE aa3.apartment_id = get_apartment_performance_summary.apartment_id
         AND aa3.date >= CURRENT_DATE - (days || ' days')::INTERVAL
     ), 0))
  INTO total_views, total_likes, total_requests, conversion_rate, avg_daily_views, rank_by_views
  FROM apartment_analytics aa
  WHERE aa.apartment_id = get_apartment_performance_summary.apartment_id
    AND aa.date >= CURRENT_DATE - (days || ' days')::INTERVAL;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending apartments
CREATE OR REPLACE FUNCTION get_trending_apartments(days INTEGER DEFAULT 7, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  apartment_id UUID,
  title TEXT,
  address TEXT,
  rent_amount INTEGER,
  total_views BIGINT,
  daily_growth_rate DECIMAL,
  trend_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH apartment_stats AS (
    SELECT 
      a.id,
      a.title,
      a.address,
      a.rent_amount,
      COALESCE(SUM(aa.total_views), 0) as views_total,
      COALESCE(AVG(aa.total_views), 0) as views_avg,
      -- Calculate growth rate (recent vs older periods)
      CASE 
        WHEN COALESCE(SUM(CASE WHEN aa.date >= CURRENT_DATE - (days/2 || ' days')::INTERVAL THEN aa.total_views ELSE 0 END), 0) > 0
        AND COALESCE(SUM(CASE WHEN aa.date < CURRENT_DATE - (days/2 || ' days')::INTERVAL THEN aa.total_views ELSE 0 END), 0) > 0
        THEN 
          ((COALESCE(SUM(CASE WHEN aa.date >= CURRENT_DATE - (days/2 || ' days')::INTERVAL THEN aa.total_views ELSE 0 END), 0)::DECIMAL / (days/2)) 
          - (COALESCE(SUM(CASE WHEN aa.date < CURRENT_DATE - (days/2 || ' days')::INTERVAL THEN aa.total_views ELSE 0 END), 0)::DECIMAL / (days/2)))
          / (COALESCE(SUM(CASE WHEN aa.date < CURRENT_DATE - (days/2 || ' days')::INTERVAL THEN aa.total_views ELSE 0 END), 0)::DECIMAL / (days/2)) * 100
        ELSE 0
      END as growth_rate
    FROM apartments a
    LEFT JOIN apartment_analytics aa ON a.id = aa.apartment_id
      AND aa.date >= CURRENT_DATE - (days || ' days')::INTERVAL
    WHERE a.status = 'available'
    GROUP BY a.id, a.title, a.address, a.rent_amount
  )
  SELECT 
    ast.id,
    ast.title,
    ast.address,
    ast.rent_amount,
    ast.views_total,
    ast.growth_rate,
    -- Trend score combines views and growth rate
    (ast.views_total * 0.7 + GREATEST(ast.growth_rate, 0) * 0.3) as trend_score
  FROM apartment_stats ast
  WHERE ast.views_total > 0 OR ast.growth_rate > 0
  ORDER BY trend_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete old analytics events
  DELETE FROM analytics_events 
  WHERE timestamp < CURRENT_DATE - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete old daily summaries (keep longer for apartment analytics)
  DELETE FROM analytics_summary 
  WHERE date < CURRENT_DATE - (retention_days * 2 || ' days')::INTERVAL;
  
  DELETE FROM apartment_analytics 
  WHERE date < CURRENT_DATE - (retention_days * 2 || ' days')::INTERVAL;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate analytics report
CREATE OR REPLACE FUNCTION generate_analytics_report(start_date DATE, end_date DATE)
RETURNS TABLE (
  metric_name TEXT,
  metric_value BIGINT,
  metric_change DECIMAL,
  period_comparison TEXT
) AS $$
DECLARE
  period_days INTEGER;
  prev_start_date DATE;
  prev_end_date DATE;
BEGIN
  period_days := end_date - start_date;
  prev_end_date := start_date - INTERVAL '1 day';
  prev_start_date := prev_end_date - (period_days || ' days')::INTERVAL;

  -- Total views
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      'Total Views' as metric,
      COALESCE(SUM(aa.total_views), 0) as current_value,
      COALESCE((SELECT SUM(aa2.total_views) FROM apartment_analytics aa2 
                WHERE aa2.date BETWEEN prev_start_date AND prev_end_date), 0) as prev_value
    FROM apartment_analytics aa
    WHERE aa.date BETWEEN start_date AND end_date
  )
  SELECT 
    cp.metric,
    cp.current_value,
    CASE 
      WHEN cp.prev_value > 0 THEN ROUND(((cp.current_value - cp.prev_value)::DECIMAL / cp.prev_value::DECIMAL) * 100, 2)
      ELSE 0
    END,
    'vs previous ' || period_days || ' days'
  FROM current_period cp;

  -- Total viewing requests
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      'Viewing Requests' as metric,
      COUNT(*)::BIGINT as current_value,
      (SELECT COUNT(*) FROM viewing_requests vr2 
       WHERE vr2.created_at::DATE BETWEEN prev_start_date AND prev_end_date)::BIGINT as prev_value
    FROM viewing_requests vr
    WHERE vr.created_at::DATE BETWEEN start_date AND end_date
  )
  SELECT 
    cp.metric,
    cp.current_value,
    CASE 
      WHEN cp.prev_value > 0 THEN ROUND(((cp.current_value - cp.prev_value)::DECIMAL / cp.prev_value::DECIMAL) * 100, 2)
      ELSE 0
    END,
    'vs previous ' || period_days || ' days'
  FROM current_period cp;

  -- New users
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      'New Users' as metric,
      COUNT(*)::BIGINT as current_value,
      (SELECT COUNT(*) FROM users u2 
       WHERE u2.created_at::DATE BETWEEN prev_start_date AND prev_end_date)::BIGINT as prev_value
    FROM users u
    WHERE u.created_at::DATE BETWEEN start_date AND end_date
  )
  SELECT 
    cp.metric,
    cp.current_value,
    CASE 
      WHEN cp.prev_value > 0 THEN ROUND(((cp.current_value - cp.prev_value)::DECIMAL / cp.prev_value::DECIMAL) * 100, 2)
      ELSE 0
    END,
    'vs previous ' || period_days || ' days'
  FROM current_period cp;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_apartment_views TO authenticated;
GRANT EXECUTE ON FUNCTION increment_apartment_likes TO authenticated;
GRANT EXECUTE ON FUNCTION increment_viewing_requests TO authenticated;
GRANT EXECUTE ON FUNCTION increment_global_counter TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_conversion_rate TO authenticated;
GRANT EXECUTE ON FUNCTION get_apartment_performance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_apartments TO authenticated;
GRANT EXECUTE ON FUNCTION generate_analytics_report TO authenticated;
