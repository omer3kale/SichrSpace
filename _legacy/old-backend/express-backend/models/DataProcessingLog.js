const { supabase } = require('../config/supabase');

class DataProcessingLog {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(logData) {
    const { data, error } = await supabase
      .from('data_processing_logs')
      .insert(logData)
      .select()
      .single();
    
    if (error) throw error;
    return new DataProcessingLog(data);
  }

  static async findAll() {
    const { data, error } = await supabase
      .from('data_processing_logs')
      .select('*');
    
    if (error) throw error;
    return data.map(item => new DataProcessingLog(item));
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('data_processing_logs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return new DataProcessingLog(data);
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('data_processing_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return new DataProcessingLog(data);
  }

  static async logDataAccess(userId, dataType, purpose, metadata = {}) {
    return this.create({
      user_id: userId,
      data_type: dataType,
      purpose: purpose,
      metadata: metadata,
      accessed_at: new Date().toISOString()
    });
  }
}

module.exports = DataProcessingLog;
