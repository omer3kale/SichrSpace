# 🚀 SichrPlace API Testing Guide - 100% Migration Validation

**Server URL:** `http://localhost:3001`

## Quick Manual Tests (Copy & Paste into Postman)

### 1. 🏥 Health Check
```
GET http://localhost:3001/health
```

### 2. 🏠 Get All Apartments  
```
GET http://localhost:3001/api/apartments
```

### 3. 👤 Admin Login
```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "omer3kale@gmail.com",
  "password": "password"
}
```

### 4. 👥 Register New User
```
POST http://localhost:3001/api/users/register
Content-Type: application/json

{
  "username": "testuser123",
  "email": "test123@example.com",
  "password": "securePassword123",
  "firstName": "Test",
  "lastName": "User", 
  "role": "tenant",
  "gdprConsent": true,
  "dataProcessingConsent": true
}
```

### 5. 📅 Create Viewing Request
```
POST http://localhost:3001/api/viewing-requests
Content-Type: application/json

{
  "apartmentId": "REPLACE_WITH_APARTMENT_ID_FROM_STEP_2",
  "requesterId": "REPLACE_WITH_USER_ID_FROM_STEP_4", 
  "preferredDate1": "2025-08-15T14:00:00Z",
  "preferredDate2": "2025-08-16T15:00:00Z",
  "preferredDate3": "2025-08-17T16:00:00Z",
  "message": "I am very interested in viewing this property.",
  "contactInfo": {
    "phone": "+49123456789",
    "email": "test123@example.com"
  }
}
```

### 6. 💬 Get Conversations
```
GET http://localhost:3001/api/conversations
```

### 7. 💰 Create PayPal Payment
```
POST http://localhost:3001/api/payment/create
Content-Type: application/json

{
  "amount": "25.00",
  "currency": "EUR", 
  "description": "SichrPlace Viewing Service Fee",
  "returnUrl": "http://localhost:3001/payment-success",
  "cancelUrl": "http://localhost:3001/payment-cancel"
}
```

## 🎯 Testing Strategy

### **Phase 1: Core Foundation (Target: 80%)**
1. ✅ Health Check
2. ✅ Get All Apartments
3. ✅ Admin Login

### **Phase 2: User Operations (Target: 90%)**  
4. ✅ Register New User
5. ✅ Create Viewing Request
6. ✅ Get Conversations

### **Phase 3: Payment Integration (Target: 100%)**
7. ✅ Create PayPal Payment

## 📊 Expected Results

**✅ Should Work (90% confidence):**
- Health check
- Get apartments (sample data exists) 
- Admin login (user created in migration)
- User registration (complete database schema)

**⚠️ Might Need Route Implementation:**
- Viewing requests (endpoint may need coding)
- Conversations (new feature, may need API route)
- PayPal payment (needs PayPal credentials)

## 🔧 Quick Fix Commands

If any endpoints return 404, the routes might need implementation:

```bash
# Check which routes exist
cd /Users/omer3kale/SichrPlace77/SichrPlace77/backend
grep -r "app.get\|app.post" routes/ api/
```

## 🎯 Success Rate Calculation

- **7 tests total**
- **Target: 85%+ success rate (6/7 tests passing)**
- **100% goal: All 7 tests passing**

Start testing and let me know the results! 🚀
