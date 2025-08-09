const { supabase } = require('../config/supabase');

class DPIA {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(dpiaData) {
    const { data, error } = await supabase
      .from('dpias')
      .insert(dpiaData)
      .select()
      .single();
    
    if (error) throw error;
    return new DPIA(data);
  }

  static async findAll() {
    const { data, error } = await supabase
      .from('dpias')
      .select('*');
    
    if (error) throw error;
    return data.map(item => new DPIA(item));
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('dpias')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return new DPIA(data);
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('dpias')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return new DPIA(data);
  }
}

module.exports = DPIA;
