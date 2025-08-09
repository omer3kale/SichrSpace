const { supabase } = require('../config/supabase');

class UserService {
  /**
   * Create a new user with proper role mapping
   * @param {Object} userData - User data from registration form
   * @returns {Object} Created user data
   */
  static async create(userData) {
    try {
      // Use the database function for proper role mapping
      if (userData.role && ['tenant', 'landlord'].includes(userData.role)) {
        const { data, error } = await supabase.rpc('create_user_with_role_mapping', {
          p_username: userData.username,
          p_email: userData.email,
          p_password: userData.password,
          p_first_name: userData.first_name,
          p_last_name: userData.last_name,
          p_phone: userData.phone || null,
          p_frontend_role: userData.role,
          p_email_verification_token: userData.email_verification_token
        });

        if (error) throw error;
        
        // Fetch the created user
        return await this.findById(data);
      } else {
        // Fallback to direct insert for admin or other roles
        const { data, error } = await supabase
          .from('users')
          .insert([{
            ...userData,
            email: userData.email.toLowerCase(),
            account_status: userData.account_status || 'active'
          }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('UserService.create error:', error);
      throw error;
    }
  }

  /**
   * Find user by email address
   * @param {string} email - Email address
   * @returns {Object|null} User data or null if not found
   */
  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('UserService.findByEmail error:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Object|null} User data or null if not found
   */
  static async findByUsername(username) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('UserService.findByUsername error:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @returns {Object} User data
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('UserService.findById error:', error);
      throw error;
    }
  }

  /**
   * Update user data
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated user data
   */
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('UserService.update error:', error);
      throw error;
    }
  }

  /**
   * Track successful login
   * @param {string} userId - User ID
   */
  static async trackSuccessfulLogin(userId) {
    try {
      const { error } = await supabase.rpc('update_user_login', {
        p_user_id: userId
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('UserService.trackSuccessfulLogin error:', error);
      // Don't throw - this is tracking, not critical
    }
  }

  /**
   * Track failed login attempt
   * @param {string} email - Email address
   */
  static async trackFailedLogin(email) {
    try {
      const { error } = await supabase.rpc('track_failed_login', {
        p_email: email.toLowerCase()
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('UserService.trackFailedLogin error:', error);
      // Don't throw - this is tracking, not critical
    }
  }

  /**
   * Get user for authentication (safe view)
   * @param {string} email - Email address
   * @returns {Object|null} User authentication data
   */
  static async getAuthUser(email) {
    try {
      const { data, error } = await supabase
        .from('user_auth_view')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('UserService.getAuthUser error:', error);
      // Fallback to regular user lookup
      return await this.findByEmail(email);
    }
  }

  /**
   * Verify email and update status
   * @param {string} email - Email address
   * @param {string} token - Verification token
   * @returns {boolean} Success status
   */
  static async verifyEmail(email, token) {
    try {
      const user = await this.findByEmail(email);
      if (!user) throw new Error('User not found');
      
      if (user.email_verification_token !== token) {
        throw new Error('Invalid verification token');
      }
      
      if (user.email_verification_expires && new Date() > new Date(user.email_verification_expires)) {
        throw new Error('Verification token has expired');
      }
      
      await this.update(user.id, {
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null
      });
      
      return true;
    } catch (error) {
      console.error('UserService.verifyEmail error:', error);
      throw error;
    }
  }

  /**
   * Check if user account is active and can login
   * @param {Object} user - User object
   * @returns {boolean} Can login status
   */
  static canUserLogin(user) {
    if (!user) return false;
    if (user.account_status !== 'active') return false;
    if (user.blocked) return false;
    if (user.failed_login_attempts >= 5) return false;
    
    return true;
  }

  /**
   * Get user's effective role (from bio field for role mapping)
   * @param {Object} user - User object
   * @returns {string} Effective role
   */
  static getUserRole(user) {
    if (!user) return 'user';
    
    // If bio contains the original role, use that
    if (user.bio && ['tenant', 'landlord', 'admin'].includes(user.bio)) {
      return user.bio;
    }
    
    // Otherwise use the database role
    return user.role || 'user';
  }
}

module.exports = UserService;
}
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  static async list(options = {}) {
    let query = supabase.from('users').select('*');
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    if (options.role) {
      query = query.eq('role', options.role);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }

  static async updateLastLogin(id) {
    return this.update(id, { last_login: new Date().toISOString() });
  }

  static async block(id) {
    return this.update(id, { blocked: true });
  }

  static async unblock(id) {
    return this.update(id, { blocked: false });
  }

  static async setEmailVerified(id, verified = true) {
    return this.update(id, { 
      email_verified: verified,
      email_verification_token: null 
    });
  }

  static async findByVerificationToken(token) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email_verification_token', token)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findByResetToken(token) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('password_reset_token', token)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async trackFailedLogin(id) {
    const user = await this.findById(id);
    const failedAttempts = (user.failed_login_attempts || 0) + 1;
    
    const updateData = {
      failed_login_attempts: failedAttempts,
      last_failed_login: new Date().toISOString()
    };

    // Lock account after 5 failed attempts
    if (failedAttempts >= 5) {
      updateData.status = 'locked';
      updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
    }

    return this.update(id, updateData);
  }

  static async resetFailedLogins(id) {
    return this.update(id, {
      failed_login_attempts: 0,
      last_failed_login: null,
      status: 'active',
      locked_until: null
    });
  }

  static async isAccountLocked(id) {
    const user = await this.findById(id);
    
    if (user.status === 'locked' && user.locked_until) {
      const lockExpired = new Date() > new Date(user.locked_until);
      
      if (lockExpired) {
        // Auto-unlock expired accounts
        await this.resetFailedLogins(id);
        return false;
      }
      
      return true;
    }
    
    return false;
  }
}

module.exports = UserService;
