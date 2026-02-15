const { supabase } = require('../config/supabase');
const bcrypt = require('bcrypt');

class User {
  constructor(data) {
    Object.assign(this, data);
  }

  static async create(userData) {
    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...userData,
        created_at: new Date().toISOString(),
        gdpr_consent: userData.gdprConsent || false,
        failed_login_attempts: 0,
        blocked: false
      })
      .select()
      .single();
    
    if (error) throw error;
    return new User(data);
  }

  static async findAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) throw error;
    return data.map(item => new User(item));
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data ? new User(data) : null;
  }

  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data ? new User(data) : null;
  }

  static async findByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? new User(data) : null;
  }

  static async update(id, updates) {
    // Hash password if being updated
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return new User(data);
  }

  static async delete(id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  async validatePassword(plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
  }

  static async updateLoginAttempts(id, attempts) {
    return this.update(id, { 
      failed_login_attempts: attempts,
      last_login_at: attempts === 0 ? new Date().toISOString() : undefined
    });
  }
}

module.exports = User;
