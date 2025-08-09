const { supabase } = require('../config/supabase');

class UserService {
  /**
   * Create a new user with proper role mapping
   * @param {Object} userData - User data from registration form
   * @returns {Object} Created user data
   */
  static async create(userData) {
    try {
      // Direct insert with role mapping in application layer
      const dbRole = ['tenant', 'landlord'].includes(userData.role) ? 'user' : userData.role;
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: userData.username,
          email: userData.email.toLowerCase(),
          password: userData.password,
          role: dbRole,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          bio: userData.role, // Store original role in bio
          email_verified: userData.email_verified || false,
          email_verification_token: userData.email_verification_token,
          account_status: userData.account_status || 'active'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      await this.update(userId, {
        last_login: new Date().toISOString(),
        failed_login_attempts: 0
      });
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
      const user = await this.findByEmail(email);
      if (user) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        const updateData = {
          failed_login_attempts: attempts,
          last_failed_login: new Date().toISOString()
        };
        
        // Auto-suspend after 5 failed attempts
        if (attempts >= 5) {
          updateData.account_status = 'suspended';
        }
        
        await this.update(user.id, updateData);
      }
    } catch (error) {
      console.error('UserService.trackFailedLogin error:', error);
      // Don't throw - this is tracking, not critical
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
      
      await this.update(user.id, {
        email_verified: true,
        email_verification_token: null
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
    if ((user.failed_login_attempts || 0) >= 5) return false;
    
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

  /**
   * Update password
   * @param {string} id - User ID
   * @param {string} hashedPassword - Hashed password
   * @returns {Object} Updated user data
   */
  static async updatePassword(id, hashedPassword) {
    return this.update(id, { password: hashedPassword });
  }

  /**
   * List users with pagination
   * @param {Object} options - Query options
   * @returns {Array} List of users
   */
  static async list(options = {}) {
    try {
      const { limit = 50, offset = 0, orderBy = 'created_at', order = 'desc' } = options;
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, role, first_name, last_name, bio, account_status, email_verified, created_at, last_login')
        .order(orderBy, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('UserService.list error:', error);
      throw error;
    }
  }
}

module.exports = UserService;
