const { supabase } = require('../config/supabase');

class DataBreach {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(breachData) {
    const { data, error } = await supabase
      .from('data_breaches')
      .insert(breachData)
      .select()
      .single();
    
    if (error) throw error;
    return new DataBreach(data);
  }

  static async findAll() {
    const { data, error } = await supabase
      .from('data_breaches')
      .select('*');
    
    if (error) throw error;
    return data.map(item => new DataBreach(item));
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('data_breaches')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return new DataBreach(data);
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('data_breaches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return new DataBreach(data);
  }
}

module.exports = DataBreach;
