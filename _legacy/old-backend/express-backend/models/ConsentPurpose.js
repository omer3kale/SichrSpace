const { supabase } = require('../config/supabase');

class ConsentPurpose {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(purposeData) {
    const { data, error } = await supabase
      .from('consent_purposes')
      .insert(purposeData)
      .select()
      .single();
    
    if (error) throw error;
    return new ConsentPurpose(data);
  }

  static async findAll() {
    const { data, error } = await supabase
      .from('consent_purposes')
      .select('*');
    
    if (error) throw error;
    return data.map(item => new ConsentPurpose(item));
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('consent_purposes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return new ConsentPurpose(data);
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('consent_purposes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return new ConsentPurpose(data);
  }

  static async delete(id) {
    const { error } = await supabase
      .from('consent_purposes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = ConsentPurpose;
